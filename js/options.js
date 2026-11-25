(function () {
  "use strict";

  var settings = null;
  var WEIGHT_LABELS = {
    aiRelated: "AI-related boost",
    educational: "Educational boost",
    entertainment: "Entertainment penalty",
    gaming: "Gaming penalty",
    celebrity: "Celebrity penalty",
    sports: "Sports penalty",
    shortsPenalty: "Shorts penalty",
    minScore: "Minimum score to show"
  };

  var HIDE_LABELS = {
    shorts: "Hide Shorts shelves & links",
    redirectShorts: "Redirect /shorts/ to regular player",
    watchSidebar: "Hide Watch 'Up Next' sidebar",
    collapseComments: "Collapse comments behind toggle",
    endScreens: "Hide video end-screen walls",
    liveChat: "Hide live chat",
    trending: "Hide Trending link",
    gaming: "Hide Gaming link",
    entertainment: "Hide Entertainment link",
    celebrity: "Hide Celebrity content",
    sports: "Hide Sports link"
  };

  var CALM_LABELS = {
    cleanTitles: "Normalize shouting ALL-CAPS titles",
    calmThumbnails: "Desaturate flashy thumbnails (color on hover)",
    hideViewCounts: "Hide view counts on feed cards"
  };

  document.addEventListener("DOMContentLoaded", function () {
    YTFeedStorage.getSettings().then(function (loaded) {
      settings = loaded;
      bind();
      render();
    });
  });

  function bind() {
    document.getElementById("save").addEventListener("click", save);
    document.getElementById("showKey").addEventListener("change", function (e) {
      document.getElementById("apiKey").type = e.target.checked ? "text" : "password";
    });
    document.getElementById("apiKey").addEventListener("input", updateQuotaEstimate);
    document.getElementById("topicForm").addEventListener("submit", onAddTopic);
    document.getElementById("channelForm").addEventListener("submit", onFindChannel);
    document.getElementById("exportBtn").addEventListener("click", exportSettings);
    document.getElementById("importInput").addEventListener("change", importSettings);
  }

  function render() {
    document.getElementById("apiKey").value = settings.apiKey || "";
    document.getElementById("homeMode").value = settings.homeMode || "feed";
    document.getElementById("dailyGoalMinutes").value = settings.dailyGoalMinutes || 0;
    document.getElementById("maxPerSource").value = settings.maxPerSource || 50;
    document.getElementById("cacheMinutes").value = settings.cacheMinutes;
    document.getElementById("regionCode").value = settings.regionCode;
    document.getElementById("relevanceLanguage").value = settings.relevanceLanguage;
    renderPresetPacks();
    renderCalmUI();
    renderHide();
    renderTopics();
    renderChannels();
    renderBlockedChannels();
    renderWeights();
    updateQuotaEstimate();
  }

  function renderPresetPacks() {
    var host = document.getElementById("presetPacks");
    host.innerHTML = "";
    (YTFeedPresets.PRESET_PACKS || []).forEach(function (pack) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pack-btn";
      btn.innerHTML =
        "<strong>" + escapeHtml(pack.name) + "</strong>" +
        "<span>" + escapeHtml(pack.description) + "</span>";
      btn.addEventListener("click", function () {
        settings.homeMode = pack.homeMode || "feed";
        settings.topics = pack.topics.map(function (t) { return Object.assign({}, t); });
        render();
        save("Applied preset '" + pack.name + "' and saved.");
      });
      host.appendChild(btn);
    });
  }

  function updateQuotaEstimate() {
    var el = document.getElementById("quotaEstimate");
    var hasKey = !!(document.getElementById("apiKey").value.trim());
    if (!hasKey) {
      el.textContent = "Starter Mode: 0 API quota used";
      return;
    }
    var enabledTopics = settings.topics.filter(function (t) { return t.enabled !== false; }).length;
    var enabledChannels = settings.channels.filter(function (c) { return c.enabled !== false; }).length;
    var units = (enabledTopics + enabledChannels) * 101;
    el.textContent = "Est. " + units + " / 10,000 daily units per full refresh";
  }

  function renderCalmUI() {
    var host = document.getElementById("calmUI");
    host.innerHTML = "";
    Object.keys(CALM_LABELS).forEach(function (key) {
      var label = document.createElement("label");
      label.className = "check";
      label.innerHTML =
        '<input type="checkbox" data-calm="' +
        key +
        '"' +
        (settings.calmUI[key] ? " checked" : "") +
        "> " +
        CALM_LABELS[key];
      host.appendChild(label);
    });
  }

  function renderWeights() {
    var host = document.getElementById("weights");
    host.innerHTML = "";
    Object.keys(WEIGHT_LABELS).forEach(function (key) {
      var label = document.createElement("label");
      label.className = "field";
      label.innerHTML =
        "<span>" +
        WEIGHT_LABELS[key] +
        '</span><input type="number" data-weight="' +
        key +
        '" value="' +
        settings.weights[key] +
        '">';
      host.appendChild(label);
    });
  }

  function renderTopics() {
    var host = document.getElementById("topics");
    host.innerHTML = "";
    settings.topics.forEach(function (topic, index) {
      var row = document.createElement("div");
      row.className = "row";
      row.innerHTML =
        '<input type="checkbox" data-topic-enabled="' +
        index +
        '"' +
        (topic.enabled !== false ? " checked" : "") +
        ">" +
        '<input type="text" data-topic-name="' +
        index +
        '" value="' +
        escapeAttr(topic.name) +
        '">' +
        '<input type="text" data-topic-query="' +
        index +
        '" value="' +
        escapeAttr(topic.query) +
        '">' +
        '<input type="number" data-topic-score="' +
        index +
        '" value="' +
        topic.score +
        '">' +
        '<button type="button" data-topic-remove="' +
        index +
        '">✕</button>';
      host.appendChild(row);
    });
    host.querySelectorAll("[data-topic-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settings.topics.splice(Number(btn.getAttribute("data-topic-remove")), 1);
        renderTopics();
        updateQuotaEstimate();
      });
    });
  }

  function renderChannels() {
    var host = document.getElementById("channels");
    host.innerHTML = "";
    settings.channels.forEach(function (channel, index) {
      var row = document.createElement("div");
      row.className = "row channel";
      row.innerHTML =
        '<input type="checkbox" data-ch-enabled="' +
        index +
        '"' +
        (channel.enabled !== false ? " checked" : "") +
        ">" +
        "<div><strong>" +
        escapeHtml(channel.title || channel.channelId) +
        "</strong><div class='help'>" +
        escapeHtml(channel.channelId) +
        "</div></div>" +
        '<input type="number" data-ch-score="' +
        index +
        '" value="' +
        channel.score +
        '">' +
        '<button type="button" data-ch-remove="' +
        index +
        '">✕</button>';
      host.appendChild(row);
    });
    host.querySelectorAll("[data-ch-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settings.channels.splice(Number(btn.getAttribute("data-ch-remove")), 1);
        renderChannels();
        updateQuotaEstimate();
      });
    });
  }

  function renderBlockedChannels() {
    var host = document.getElementById("blockedChannels");
    host.innerHTML = "";
    var list = settings.blockedChannels || [];
    if (!list.length) {
      host.innerHTML = '<div class="help">No muted channels.</div>';
      return;
    }
    list.forEach(function (ch, index) {
      var row = document.createElement("div");
      row.className = "row blocked";
      row.innerHTML =
        "<div><strong>" +
        escapeHtml(ch.title || ch.channelId) +
        "</strong><div class='help'>" +
        escapeHtml(ch.channelId) +
        "</div></div>" +
        '<button type="button" data-unblock="' +
        index +
        '">Unmute</button>';
      row.querySelector("button").addEventListener("click", function () {
        settings.blockedChannels.splice(index, 1);
        renderBlockedChannels();
      });
      host.appendChild(row);
    });
  }

  function renderHide() {
    var host = document.getElementById("hideNative");
    host.innerHTML = "";
    Object.keys(HIDE_LABELS).forEach(function (key) {
      var label = document.createElement("label");
      label.className = "check";
      label.innerHTML =
        '<input type="checkbox" data-hide="' +
        key +
        '"' +
        (settings.hideNative[key] !== false ? " checked" : "") +
        "> " +
        HIDE_LABELS[key];
      host.appendChild(label);
    });
  }

  function onAddTopic(event) {
    event.preventDefault();
    var form = event.target;
    settings.topics.push({
      id: "topic-" + Date.now(),
      name: form.name.value.trim(),
      query: form.query.value.trim(),
      score: Number(form.score.value) || 0,
      enabled: true
    });
    form.reset();
    form.score.value = 25;
    renderTopics();
    updateQuotaEstimate();
  }

  function onFindChannel(event) {
    event.preventDefault();
    var query = document.getElementById("channelQuery").value.trim();
    var score = Number(document.getElementById("channelScore").value) || 0;
    var resultsHost = document.getElementById("channelResults");
    resultsHost.textContent = "Searching…";
    chrome.runtime.sendMessage(
      { type: YTFeedConstants.MESSAGE.SEARCH_CHANNEL, query: query },
      function (response) {
        if (!response || !response.ok) {
          resultsHost.textContent = (response && response.error) || "Search failed";
          return;
        }
        resultsHost.innerHTML = "";
        (response.data || []).forEach(function (ch) {
          var row = document.createElement("div");
          row.className = "row channel";
          row.innerHTML =
            "<div></div><div><strong>" +
            escapeHtml(ch.title) +
            "</strong><div class='help'>" +
            escapeHtml(ch.channelId) +
            "</div></div><div></div>" +
            '<button type="button">Add</button>';
          row.querySelector("button").addEventListener("click", function () {
            settings.channels.push({
              id: "ch-" + ch.channelId,
              channelId: ch.channelId,
              title: ch.title,
              score: score,
              enabled: true
            });
            document.getElementById("channelQuery").value = "";
            resultsHost.innerHTML = "";
            renderChannels();
            updateQuotaEstimate();
          });
          resultsHost.appendChild(row);
        });
        if (!response.data.length) resultsHost.textContent = "No channels found.";
      }
    );
  }

  function collectFromDom() {
    settings.apiKey = document.getElementById("apiKey").value.trim();
    settings.homeMode = document.getElementById("homeMode").value === "zen" ? "zen" : "feed";
    var parsedGoal = Number(document.getElementById("dailyGoalMinutes").value);
    settings.dailyGoalMinutes = (!isNaN(parsedGoal) && parsedGoal >= 0) ? parsedGoal : 0;
    var parsedMax = Number(document.getElementById("maxPerSource").value);
    settings.maxPerSource = (!isNaN(parsedMax) && parsedMax > 0) ? parsedMax : 50;
    var parsedCache = Number(document.getElementById("cacheMinutes").value);
    settings.cacheMinutes = (!isNaN(parsedCache) && parsedCache >= 0) ? parsedCache : 30;
    settings.regionCode = document.getElementById("regionCode").value.trim().toUpperCase() || "US";
    settings.relevanceLanguage = document.getElementById("relevanceLanguage").value.trim() || "en";

    document.querySelectorAll("[data-weight]").forEach(function (input) {
      settings.weights[input.getAttribute("data-weight")] = Number(input.value) || 0;
    });
    document.querySelectorAll("[data-hide]").forEach(function (input) {
      settings.hideNative[input.getAttribute("data-hide")] = input.checked;
    });
    document.querySelectorAll("[data-calm]").forEach(function (input) {
      settings.calmUI[input.getAttribute("data-calm")] = input.checked;
    });
    settings.topics.forEach(function (topic, index) {
      var enabled = document.querySelector('[data-topic-enabled="' + index + '"]');
      var name = document.querySelector('[data-topic-name="' + index + '"]');
      var query = document.querySelector('[data-topic-query="' + index + '"]');
      var score = document.querySelector('[data-topic-score="' + index + '"]');
      if (enabled) topic.enabled = enabled.checked;
      if (name) topic.name = name.value.trim();
      if (query) topic.query = query.value.trim();
      if (score) topic.score = Number(score.value) || 0;
    });
    settings.channels.forEach(function (channel, index) {
      var enabled = document.querySelector('[data-ch-enabled="' + index + '"]');
      var score = document.querySelector('[data-ch-score="' + index + '"]');
      if (enabled) channel.enabled = enabled.checked;
      if (score) channel.score = Number(score.value) || 0;
    });
  }

  function save(customBanner) {
    collectFromDom();
    new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({ type: YTFeedConstants.MESSAGE.SAVE_SETTINGS, settings: settings }, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.ok === false) {
          reject(new Error(response.error || "Could not save settings."));
          return;
        }
        resolve();
      });
    })
      .then(function () {
        showBanner(typeof customBanner === "string" ? customBanner : "Saved. Your YouTube feed will update automatically.", false);
      })
      .catch(function (err) {
        showBanner(err.message || "Could not save settings.", true);
      });
  }

  function exportSettings() {
    collectFromDom();
    var copy = Object.assign({}, settings, { apiKey: "" });
    var blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "yt-focus-feed-settings.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importSettings(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result || "{}"));
        var currentKey = settings.apiKey;
        var defaults = YTFeedConstants.defaultSettings();
        settings = Object.assign({}, defaults, parsed, {
          apiKey: parsed.apiKey || currentKey,
          blockedChannels: Array.isArray(parsed.blockedChannels) ? parsed.blockedChannels : [],
          weights: Object.assign({}, defaults.weights, parsed.weights || {}),
          hideNative: Object.assign({}, defaults.hideNative, parsed.hideNative || {}),
          calmUI: Object.assign({}, defaults.calmUI, parsed.calmUI || {})
        });
        render();
        save("Imported settings and saved.");
      } catch (err) {
        showBanner("Invalid JSON file: " + err.message, true);
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function showBanner(text, isError) {
    var el = document.getElementById("banner");
    el.hidden = false;
    el.textContent = text;
    el.className = "banner" + (isError ? " error" : "");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }
})();
