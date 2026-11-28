(function () {
  "use strict";

  var ROOT_ID = "yt-custom-feed-root";
  var COMMENTS_BTN_ID = "ytcf-comments-toggle";
  var PAGE_SIZE = 24;

  var rootEl = null;
  var currentSettings = null;
  var lastFeed = null;
  var savedList = [];
  var savedIds = {};
  var statsState = { watchSeconds: 0, focusEndsAt: 0 };
  var activeFilter = "all"; // "all" | "saved" | sourceId
  var durationFilter = "all"; // "all" | "short5_15" | "deep15" | "long45"
  var lastStamp = "";
  var shownCount = 0;
  var renderedIds = {};
  var fetchInFlight = false;
  var moreInFlight = false;
  var metricsTimer = 0;
  var navTimer = 0;
  var watchTickTimer = 0;
  var lastWatchHref = "";

  document.documentElement.classList.add(
    "yt-custom-feed-ext",
    "yt-hide-shorts",
    "yt-hide-trending",
    "yt-hide-gaming",
    "yt-hide-entertainment",
    "yt-hide-celebrity",
    "yt-hide-sports",
    "yt-hide-watch-sidebar",
    "yt-hide-endscreens",
    "yt-hide-livechat",
    "yt-collapse-comments"
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function boot() {
    applySettingsAndShield();
    loadSavedAndStats();
    startObservers();
    watchStorageChanges();
    startWatchTimer();
    window.addEventListener("yt-navigate-finish", scheduleNavigate);
    window.addEventListener("yt-page-data-updated", scheduleNavigate);
    window.addEventListener("popstate", scheduleNavigate);
    window.addEventListener("resize", scheduleMetrics);
    onNavigate();
  }

  function isHomePath() {
    var path = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return path === "/" || path === "/feed/featured" || path === "/feed/recommended";
  }

  function isWatchPath() {
    return (location.pathname || "").indexOf("/watch") === 0;
  }

  function maybeRedirectShorts() {
    if (currentSettings && currentSettings.hideNative && currentSettings.hideNative.redirectShorts === false) return false;
    var match = (location.pathname || "").match(/^\/shorts\/([A-Za-z0-9_-]+)/);
    if (match) {
      location.replace("/watch?v=" + encodeURIComponent(match[1]));
      return true;
    }
    return false;
  }

  function feedConfigChanged(prev, next) {
    if (!prev || !next) return true;
    var prevCb = prev.clickbait || {};
    var nextCb = next.clickbait || {};
    return (
      prev.apiKey !== next.apiKey ||
      prev.homeMode !== next.homeMode ||
      prev.regionCode !== next.regionCode ||
      prev.relevanceLanguage !== next.relevanceLanguage ||
      JSON.stringify(prev.topics || []) !== JSON.stringify(next.topics || []) ||
      JSON.stringify(prev.channels || []) !== JSON.stringify(next.channels || []) ||
      JSON.stringify(prev.blockedChannels || []) !== JSON.stringify(next.blockedChannels || []) ||
      JSON.stringify(prev.weights || {}) !== JSON.stringify(next.weights || {}) ||
      prevCb.enabled !== nextCb.enabled ||
      prevCb.sensitivity !== nextCb.sensitivity ||
      prevCb.trustStarterChannels !== nextCb.trustStarterChannels ||
      JSON.stringify(prevCb.trustedChannels || []) !== JSON.stringify(nextCb.trustedChannels || [])
    );
  }

  function uiDisplayChanged(prev, next) {
    if (!prev || !next) return false;
    var prevCb = prev.clickbait || {};
    var nextCb = next.clickbait || {};
    return (
      JSON.stringify(prev.calmUI || {}) !== JSON.stringify(next.calmUI || {}) ||
      prevCb.showBadge !== nextCb.showBadge ||
      prevCb.showReasons !== nextCb.showReasons
    );
  }

  function watchStorageChanges() {
    if (!chrome.storage || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener(function (changes, areaName) {
      if (areaName === "sync" && changes[YTFeedConstants.SETTINGS_KEY]) {
        var oldVal = changes[YTFeedConstants.SETTINGS_KEY].oldValue;
        var newVal = changes[YTFeedConstants.SETTINGS_KEY].newValue;
        applySettingsAndShield().then(function () {
          if (isHomePath() && !fetchInFlight && feedConfigChanged(oldVal, newVal)) {
            lastFeed = null;
            loadFeed(false);
          } else if (isHomePath() && lastFeed && uiDisplayChanged(oldVal, newVal)) {
            renderFeed(lastFeed, true);
          }
        });
      }
      if (areaName === "local") {
        if (changes[YTFeedConstants.SAVED_KEY]) {
          syncSaved(changes[YTFeedConstants.SAVED_KEY].newValue || []);
          if (isHomePath() && rootEl) updateSavedBadgeAndView();
        }
        if (changes[YTFeedConstants.STATS_KEY]) {
          statsState = changes[YTFeedConstants.STATS_KEY].newValue || statsState;
          updateStatusBadge();
        }
        if (changes[YTFeedConstants.CACHE_KEY]) {
          var next = changes[YTFeedConstants.CACHE_KEY].newValue;
          if (
            next &&
            isHomePath() &&
            !fetchInFlight &&
            !moreInFlight &&
            lastFeed &&
            typeof next.refreshSeq === "number" &&
            next.refreshSeq !== (lastFeed.refreshSeq || 0)
          ) {
            renderFeed(next, true);
          }
        }
      }
    });
  }

  function loadSavedAndStats() {
    YTFeedStorage.getSaved().then(syncSaved);
    YTFeedStorage.getStats().then(function (s) {
      statsState = s || statsState;
      updateStatusBadge();
    });
  }

  function syncSaved(list) {
    savedList = Array.isArray(list) ? list : [];
    savedIds = {};
    savedList.forEach(function (item) {
      if (item && item.videoId) savedIds[item.videoId] = true;
    });
  }

  function scheduleNavigate() {
    clearTimeout(navTimer);
    navTimer = setTimeout(onNavigate, 40);
  }

  function onNavigate() {
    applySettingsAndShield().then(function () {
      if (maybeRedirectShorts()) return;
      if (isWatchPath()) {
        if (lastWatchHref !== location.href) {
          lastWatchHref = location.href;
          document.documentElement.classList.remove("ytcf-comments-open");
          var existingBtn = document.querySelector("#" + COMMENTS_BTN_ID + " button");
          if (existingBtn) existingBtn.textContent = "Show comments (Distraction Shield)";
        }
        setTimeout(ensureCommentsToggle, 250);
      } else {
        lastWatchHref = "";
      }
    });

    if (!isHomePath()) {
      document.documentElement.classList.remove("yt-custom-home");
      if (rootEl) rootEl.classList.remove("is-on");
      return;
    }

    ensureRoot();
    rootEl.classList.add("is-on");
    document.documentElement.classList.add("yt-custom-home");
    if (!rootEl.firstChild) {
      if (lastFeed) renderFeed(lastFeed, true);
      else renderSkeleton();
    }
    scheduleMetrics();
    if (!lastFeed) paintCachedThenFetch();
  }

  function applySettingsAndShield() {
    return YTFeedStorage.getSettings().then(function (settings) {
      currentSettings = settings;
      var hide = settings.hideNative || {};
      var calm = settings.calmUI || {};
      var doc = document.documentElement;
      doc.classList.toggle("yt-hide-shorts", hide.shorts !== false);
      doc.classList.toggle("yt-hide-trending", hide.trending !== false);
      doc.classList.toggle("yt-hide-gaming", hide.gaming !== false);
      doc.classList.toggle("yt-hide-entertainment", hide.entertainment !== false);
      doc.classList.toggle("yt-hide-celebrity", hide.celebrity !== false);
      doc.classList.toggle("yt-hide-sports", hide.sports !== false);
      doc.classList.toggle("yt-hide-watch-sidebar", hide.watchSidebar !== false);
      doc.classList.toggle("yt-hide-endscreens", hide.endScreens !== false);
      doc.classList.toggle("yt-hide-livechat", hide.liveChat !== false);
      doc.classList.toggle("yt-collapse-comments", hide.collapseComments !== false);
      doc.classList.toggle("ytcf-calm-thumbs", !!calm.calmThumbnails);
      doc.classList.toggle("ytcf-hide-views", !!calm.hideViewCounts);
      return settings;
    });
  }

  function ensureCommentsToggle() {
    if (!isWatchPath()) return;
    if (currentSettings && currentSettings.hideNative && currentSettings.hideNative.collapseComments === false) {
      var old = document.getElementById(COMMENTS_BTN_ID);
      if (old && old.parentNode) old.parentNode.removeChild(old);
      return;
    }
    var comments = document.querySelector("ytd-comments#comments");
    if (!comments || !comments.parentNode) return;
    if (document.getElementById(COMMENTS_BTN_ID)) return;

    var wrap = document.createElement("div");
    wrap.id = COMMENTS_BTN_ID;
    wrap.className = "ytcf-comments-bar";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ytcf-comments-btn";
    function syncLabel() {
      var open = document.documentElement.classList.contains("ytcf-comments-open");
      btn.textContent = open ? "Hide comments" : "Show comments (Distraction Shield)";
    }
    syncLabel();
    btn.addEventListener("click", function () {
      document.documentElement.classList.toggle("ytcf-comments-open");
      syncLabel();
    });
    wrap.appendChild(btn);
    comments.parentNode.insertBefore(wrap, comments);
  }

  function startWatchTimer() {
    clearInterval(watchTickTimer);
    watchTickTimer = setInterval(function () {
      if (document.visibilityState !== "visible") return;
      if (isWatchPath()) {
        send(YTFeedConstants.MESSAGE.ADD_WATCH_TIME, { seconds: 15 })
          .then(function (s) {
            if (s) statsState = s;
          })
          .catch(function () {});
      } else if (isHomePath()) {
        updateStatusBadge();
      }
    }, 15000);
  }

  function hostNode() {
    return document.body || document.documentElement;
  }

  function startObservers() {
    var observer = new MutationObserver(function () {
      if (isWatchPath() && !document.getElementById(COMMENTS_BTN_ID)) {
        ensureCommentsToggle();
      }
      if (!isHomePath()) return;
      if (!rootEl || !rootEl.isConnected || rootEl.parentNode !== hostNode()) {
        ensureRoot();
      }
      scheduleMetrics();
    });
    observer.observe(document.documentElement, { childList: true, subtree: false });
    if (document.body) observer.observe(document.body, { childList: true, subtree: false });
  }

  function scheduleMetrics() {
    clearTimeout(metricsTimer);
    metricsTimer = setTimeout(syncOverlayMetrics, 30);
  }

  function syncOverlayMetrics() {
    if (!rootEl || !isHomePath()) return;
    var masthead = document.querySelector("#masthead-container, ytd-masthead");
    var mini = document.querySelector("ytd-mini-guide-renderer");
    var top = 56;
    var left = 0;
    if (masthead) {
      var mh = masthead.getBoundingClientRect();
      if (mh.height > 0 && mh.height < 120) top = Math.round(mh.height);
    }
    if (mini) {
      var mw = mini.getBoundingClientRect().width;
      if (mw > 40 && mw < 120) left = Math.round(mw);
    }
    var app = document.querySelector("ytd-app");
    if (app && app.hasAttribute("guide-persistent-and-visible")) {
      left = 240;
    }
    if (left > 280) left = 0;
    rootEl.style.top = top + "px";
    rootEl.style.left = left + "px";
    rootEl.style.right = "0px";
    rootEl.style.bottom = "0px";
  }

  function ensureRoot() {
    var existing = document.getElementById(ROOT_ID);
    if (existing) rootEl = existing;
    if (!rootEl) {
      rootEl = document.createElement("div");
      rootEl.id = ROOT_ID;
      rootEl.setAttribute("role", "main");
    }
    var host = hostNode();
    if (rootEl.parentNode !== host) host.appendChild(rootEl);
    if (isHomePath()) rootEl.classList.add("is-on");
    else rootEl.classList.remove("is-on");
    return rootEl;
  }

  function feedVideos(feed) {
    if (feed && feed.videos && feed.videos.length) return feed.videos;
    if (feed && feed.sections) {
      var list = [];
      feed.sections.forEach(function (section) {
        (section.videos || []).forEach(function (video) {
          list.push(video);
        });
      });
      return list;
    }
    return [];
  }

  function paintCachedThenFetch() {
    ensureRoot();
    loadFeed(false);
  }

  function loadFeed(forceRefresh) {
    if (fetchInFlight && !forceRefresh) return;
    fetchInFlight = true;
    setBusy(true);
    clearNotice();
    send(forceRefresh ? YTFeedConstants.MESSAGE.REFRESH_FEED : YTFeedConstants.MESSAGE.GET_FEED)
      .then(function (feed) {
        renderFeed(feed, true);
      })
      .catch(function (error) {
        var msg = (error && error.message) || String(error);
        if (!lastFeed) renderError(msg);
        else showNotice("Could not refresh feed: " + msg);
      })
      .finally(function () {
        fetchInFlight = false;
        setBusy(false);
      });
  }

  function loadMore() {
    if (activeFilter === "saved" || (lastFeed && lastFeed.mode === "zen")) return;
    if (moreInFlight || fetchInFlight) return;
    var filtered = filteredVideos(feedVideos(lastFeed));
    var grid = rootEl && rootEl.querySelector(".ytcf-grid");
    if (grid && shownCount < filtered.length) {
      appendCards(filtered.slice(shownCount, shownCount + PAGE_SIZE));
      shownCount = Math.min(filtered.length, shownCount + PAGE_SIZE);
      return;
    }
    if (!lastFeed || !lastFeed.hasMore) return;
    moreInFlight = true;
    setBusy(true);
    send(YTFeedConstants.MESSAGE.LOAD_MORE)
      .then(function (feed) {
        var added = Array.isArray(feed.newVideos)
          ? feed.newVideos
          : feedVideos(feed).filter(function (v) { return v && !renderedIds[v.videoId]; });
        if (added.length) {
          lastFeed.videos = feedVideos(lastFeed).concat(added);
          var visibleAdded = filteredVideos(added);
          appendCards(visibleAdded);
          shownCount = filteredVideos(lastFeed.videos).length;
        }
        lastFeed.hasMore = !!feed.hasMore;
      })
      .catch(function (error) {
        showNotice("Could not load more videos: " + ((error && error.message) || String(error)));
      })
      .finally(function () {
        moreInFlight = false;
        setBusy(false);
      });
  }

  function send(type, extra) {
    var payload = Object.assign({ type: type }, extra || {});
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(payload, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.ok) {
          reject(new Error((response && response.error) || "Unknown extension error"));
          return;
        }
        resolve(response.data);
      });
    });
  }

  function setBusy(busy) {
    if (!rootEl) return;
    rootEl.classList.toggle("is-busy", busy);
    var refresh = rootEl.querySelector("#ytcf-refresh");
    if (refresh) {
      refresh.disabled = busy;
      refresh.textContent = busy ? "Refreshing…" : "Refresh";
    }
  }

  function showNotice(text) {
    if (!rootEl) return;
    var shell = rootEl.querySelector(".ytcf-shell");
    if (!shell) return;
    clearNotice();
    var el = document.createElement("div");
    el.id = "ytcf-notice";
    el.className = "ytcf-notice";
    el.textContent = text;
    var grid = shell.querySelector(".ytcf-grid");
    if (grid) shell.insertBefore(el, grid);
    else shell.appendChild(el);
  }

  function clearNotice() {
    var existing = rootEl && rootEl.querySelector("#ytcf-notice");
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  function formatStatusBadge() {
    var parts = [];
    if (lastFeed && lastFeed.feedMode === "rss") {
      parts.push("Starter Feed");
    }
    var mins = Math.floor((statsState.watchSeconds || 0) / 60);
    if (mins > 0) {
      var goal = currentSettings && currentSettings.dailyGoalMinutes;
      parts.push(goal ? "Today: " + mins + "/" + goal + "m" : "Today: " + mins + "m");
    }
    if (statsState.focusEndsAt && statsState.focusEndsAt > Date.now()) {
      var rem = Math.max(1, Math.ceil((statsState.focusEndsAt - Date.now()) / 60000));
      parts.push("Focus: " + rem + "m left");
    }
    return parts.join(" · ");
  }

  function updateStatusBadge() {
    if (!rootEl) return;
    var el = rootEl.querySelector("#ytcf-status-pill");
    if (!el) return;
    var text = formatStatusBadge();
    el.textContent = text;
    el.hidden = !text;
  }

  function uniqueSources(videos) {
    var seen = {};
    var out = [];
    (videos || []).forEach(function (v) {
      if (!v || !v.sourceId || seen[v.sourceId]) return;
      seen[v.sourceId] = true;
      out.push({ id: v.sourceId, name: v.sourceName || v.sourceId });
    });
    return out;
  }

  function filteredVideos(videos) {
    if (activeFilter === "saved") return savedList.slice();
    return (videos || []).filter(function (v) {
      if (!v) return false;
      if (activeFilter !== "all" && v.sourceId !== activeFilter) return false;
      if (durationFilter !== "all") {
        var secs = YTFeedScoring.parseIsoDuration(v.duration);
        if (secs > 0) {
          if (durationFilter === "short5_15" && (secs < 300 || secs > 900)) return false;
          if (durationFilter === "deep15" && secs < 900) return false;
          if (durationFilter === "long45" && secs < 2700) return false;
        }
      }
      return true;
    });
  }

  function toolbarHtml(videos) {
    var sources = uniqueSources(videos);
    var chips =
      '<button type="button" class="ytcf-chip' +
      (activeFilter === "all" ? " is-active" : "") +
      '" data-filter="all">All</button>';

    sources.forEach(function (s) {
      chips +=
        '<button type="button" class="ytcf-chip' +
        (activeFilter === s.id ? " is-active" : "") +
        '" data-filter="' +
        escapeAttr(s.id) +
        '">' +
        escapeHtml(s.name) +
        "</button>";
    });

    chips +=
      '<button type="button" class="ytcf-chip ytcf-chip-saved' +
      (activeFilter === "saved" ? " is-active" : "") +
      '" data-filter="saved" id="ytcf-saved-chip">Saved (' +
      savedList.length +
      ")</button>";

    var durSelect =
      '<select class="ytcf-select" id="ytcf-duration" title="Filter by duration">' +
      '<option value="all"' + (durationFilter === "all" ? " selected" : "") + ">Any length</option>" +
      '<option value="short5_15"' + (durationFilter === "short5_15" ? " selected" : "") + ">5–15 min</option>" +
      '<option value="deep15"' + (durationFilter === "deep15" ? " selected" : "") + ">15m+ deep dive</option>" +
      '<option value="long45"' + (durationFilter === "long45" ? " selected" : "") + ">45m+ longform</option>" +
      "</select>";

    var statusText = formatStatusBadge();
    var isZen = lastFeed && lastFeed.mode === "zen";
    var hasDurations = (videos || []).some(function (v) { return v && v.duration; });

    return (
      '<div class="ytcf-toolbar">' +
      '<div class="ytcf-chips">' +
      (isZen ? "" : chips) +
      "</div>" +
      '<div class="ytcf-actions">' +
      '<span class="ytcf-status-pill" id="ytcf-status-pill"' + (statusText ? "" : " hidden") + ">" +
      escapeHtml(statusText) +
      "</span>" +
      (isZen || !hasDurations ? "" : durSelect) +
      '<button type="button" class="ytcf-icon-btn" id="ytcf-zen" title="Toggle Focus Zen Mode">' +
      (isZen ? "Show Feed" : "Zen Mode") +
      "</button>" +
      '<button type="button" class="ytcf-icon-btn" id="ytcf-settings" title="Settings">Settings</button>' +
      (isZen ? "" : '<button type="button" class="ytcf-icon-btn ytcf-primary-btn" id="ytcf-refresh" title="Refresh">Refresh</button>') +
      "</div>" +
      "</div>"
    );
  }

  function renderZenScreen() {
    var goal = currentSettings && currentSettings.dailyGoalMinutes;
    var mins = Math.floor((statsState.watchSeconds || 0) / 60);
    var statLine = mins > 0
      ? ("Today on YouTube: " + mins + " min" + (goal ? " / " + goal + " min goal" : ""))
      : "Distraction Shield active · Home recommendations hidden";

    rootEl.innerHTML =
      '<div class="ytcf-shell">' +
      toolbarHtml([]) +
      '<div class="ytcf-zen-box">' +
      '<p class="ytcf-zen-kicker">' + escapeHtml(statLine) + "</p>" +
      "<h1>What are you here to learn?</h1>" +
      '<form class="ytcf-zen-form" id="ytcf-zen-form">' +
      '<input type="text" id="ytcf-zen-input" placeholder="Search intentionally (e.g. transformer architecture lecture)…" autocomplete="off" />' +
      '<button type="submit">Search</button>' +
      "</form>" +
      '<div class="ytcf-zen-links">' +
      '<button type="button" class="ytcf-icon-btn" id="ytcf-zen-to-feed">Browse Productive Feed</button>' +
      '<button type="button" class="ytcf-icon-btn" id="ytcf-zen-saved">Saved Queue (' + savedList.length + ")</button>" +
      "</div>" +
      "</div>" +
      "</div>";
    bindChrome();
  }

  function renderSkeleton() {
    ensureRoot();
    if (!rootEl) return;
    var chips = "";
    for (var i = 0; i < 12; i++) {
      chips +=
        '<div class="ytcf-skel-card"><div class="ytcf-skel-thumb"></div><div class="ytcf-skel-meta"><div class="ytcf-skel-avatar"></div><div><div class="ytcf-skel-line"></div><div class="ytcf-skel-line short"></div></div></div></div>';
    }
    rootEl.innerHTML =
      '<div class="ytcf-shell">' + toolbarHtml([]) + '<div class="ytcf-grid">' + chips + "</div></div>";
    bindChrome();
  }

  function renderError(message) {
    ensureRoot();
    if (!rootEl) return;
    lastStamp = "error";
    rootEl.innerHTML =
      '<div class="ytcf-shell">' +
      toolbarHtml([]) +
      '<div class="ytcf-error"><h2>Custom feed could not load</h2><p>' +
      escapeHtml(message) +
      '</p><p class="ytcf-hint">Open Settings to configure topics, channels, or a YouTube Data API key, then click Refresh.</p></div></div>';
    bindChrome();
  }

  function renderFeed(feed, force) {
    ensureRoot();
    if (!rootEl) return;
    lastFeed = feed;

    if (feed && feed.mode === "zen" && activeFilter !== "saved") {
      lastStamp = "zen";
      renderZenScreen();
      scheduleMetrics();
      return;
    }

    var allVideos = feedVideos(feed);
    if (activeFilter !== "all" && activeFilter !== "saved") {
      var hasSource = allVideos.some(function (v) { return v && v.sourceId === activeFilter; });
      if (!hasSource) activeFilter = "all";
    }

    var videos = filteredVideos(allVideos);
    var stamp =
      String((feed && (feed.servedAt || feed.fetchedAt)) || "") +
      ":" +
      String((feed && feed.refreshSeq) || 0) +
      ":" +
      activeFilter +
      ":" +
      durationFilter +
      ":" +
      videos.length;
    if (!force && stamp && stamp === lastStamp && rootEl.querySelector(".ytcf-grid")) return;
    lastStamp = stamp;

    if (!videos.length) {
      renderedIds = {};
      shownCount = 0;
      var emptyMsg = activeFilter === "saved"
        ? "No saved videos yet. Hover any video card and click Save to build your study queue."
        : "Try switching duration filter or click Refresh for new videos in your domains.";
      rootEl.innerHTML =
        '<div class="ytcf-shell">' +
        toolbarHtml(allVideos) +
        '<div class="ytcf-error"><h2>No matching videos</h2><p>' +
        escapeHtml(emptyMsg) +
        "</p></div></div>";
      bindChrome();
      return;
    }

    var starterBanner = (feed && feed.feedMode === "rss" && activeFilter !== "saved")
      ? '<div class="ytcf-starter-tip">Starter Feed active (official educational channels, 0 API key needed). <button type="button" class="ytcf-link-btn" id="ytcf-open-settings-tip">Add a free YouTube API key</button> for unlimited topic search.</div>'
      : "";
    var backfillBanner = (feed && feed.backfilledBorderline && activeFilter !== "saved")
      ? '<div class="ytcf-notice">Showing some borderline-scored videos to keep your feed full. Adjust Clickbait Sensitivity in Settings if needed.</div>'
      : "";

    var initial = videos.slice(0, PAGE_SIZE);
    renderedIds = {};
    initial.forEach(function (v) {
      if (v && v.videoId) renderedIds[v.videoId] = true;
    });
    shownCount = initial.length;
    rootEl.innerHTML =
      '<div class="ytcf-shell">' +
      toolbarHtml(allVideos) +
      starterBanner +
      backfillBanner +
      '<div class="ytcf-grid">' +
      initial.map(safeVideoCardHtml).join("") +
      '</div><div class="ytcf-sentinel"></div></div>';
    rootEl.scrollTop = 0;
    bindChrome();
    scheduleMetrics();
  }

  function appendCards(videos) {
    var grid = rootEl && rootEl.querySelector(".ytcf-grid");
    if (!grid || !videos.length) return;
    var fresh = videos.filter(function (v) {
      if (!v || !v.videoId || renderedIds[v.videoId]) return false;
      renderedIds[v.videoId] = true;
      return true;
    });
    if (!fresh.length) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = fresh.map(safeVideoCardHtml).join("");
    while (wrap.firstChild) grid.appendChild(wrap.firstChild);
    bindCardActions(grid);
  }

  function safeVideoCardHtml(video) {
    try {
      return videoCardHtml(video);
    } catch (_err) {
      return "";
    }
  }

  function videoCardHtml(video) {
    var href = "/watch?v=" + encodeURIComponent(video.videoId);
    var views = video.viewCount ? formatCount(video.viewCount) + " views" : "";
    var when = YTFeedScoring.timeAgo(video.publishedAt);
    var stats = [views, when].filter(Boolean).join(" · ");
    var initial = (video.channelTitle || "?").charAt(0).toUpperCase();
    var thumb =
      video.thumbnail ||
      "https://i.ytimg.com/vi/" + encodeURIComponent(video.videoId) + "/hqdefault.jpg";
    var useCleanTitle = !currentSettings || !currentSettings.calmUI || currentSettings.calmUI.cleanTitles !== false;
    var displayTitle = useCleanTitle ? YTFeedScoring.cleanTitle(video.title) : video.title;
    var isSaved = !!savedIds[video.videoId];
    var cb = video.clickbait || null;
    var cbSettings = (currentSettings && currentSettings.clickbait) || {};
    var showBadge = cb && cbSettings.enabled !== false && cbSettings.showBadge !== false;
    var showReasons = cbSettings.showReasons !== false;
    var reasonParts = [];
    if (showReasons && cb && Array.isArray(cb.reasons) && cb.reasons.length) {
      reasonParts.push("Value " + cb.valueScore + " (" + cb.verdict + "): " + cb.reasons.join("; "));
    }
    if (showReasons && Array.isArray(video.scoreReasons) && video.scoreReasons.length) {
      reasonParts.push("Rank " + Math.round(video.score || 0) + ": " + video.scoreReasons.slice(0, 4).join(", "));
    }
    var reasonsText = reasonParts.length ? reasonParts.join(" | ") : displayTitle;
    var badgeHtml = showBadge
      ? '<span class="ytcf-value-badge ytcf-verdict-' + escapeAttr(cb.verdict || "good") + '" title="' + escapeAttr(reasonsText) + '">Value ' + Math.round(cb.valueScore) + "</span>"
      : "";

    return (
      '<a class="ytcf-card" href="' +
      href +
      '" data-video-id="' +
      escapeAttr(video.videoId) +
      '" data-channel-id="' +
      escapeAttr(video.channelId || "") +
      '" title="' +
      escapeAttr(reasonsText) +
      '">' +
      '<div class="ytcf-thumb-wrap">' +
      '<img class="ytcf-thumb" alt="" loading="lazy" src="' +
      escapeAttr(thumb) +
      '">' +
      (video.sourceName
        ? '<span class="ytcf-domain-tag">' + escapeHtml(video.sourceName) + "</span>"
        : "") +
      badgeHtml +
      (video.durationLabel
        ? '<span class="ytcf-duration">' + escapeHtml(video.durationLabel) + "</span>"
        : "") +
      '<div class="ytcf-card-actions">' +
      '<button type="button" class="ytcf-card-btn' + (isSaved ? " is-saved" : "") + '" data-action="save" title="Save to Watch Queue">' +
      (isSaved ? "Saved" : "+ Save") +
      "</button>" +
      '<button type="button" class="ytcf-card-btn" data-action="good" title="Actually good (boosts similar)">Good</button>' +
      '<button type="button" class="ytcf-card-btn" data-action="clickbait" title="Not useful / Clickbait">Clickbait</button>' +
      '<button type="button" class="ytcf-card-btn" data-action="dismiss" title="Not interested / hide video">Hide</button>' +
      (video.channelId
        ? '<button type="button" class="ytcf-card-btn" data-action="block" title="Mute this channel">Mute</button>'
        : "") +
      "</div>" +
      "</div>" +
      '<div class="ytcf-card-body">' +
      '<div class="ytcf-avatar" aria-hidden="true">' +
      escapeHtml(initial) +
      "</div>" +
      "<div>" +
      '<p class="ytcf-title">' +
      escapeHtml(displayTitle) +
      "</p>" +
      '<p class="ytcf-channel">' +
      escapeHtml(video.channelTitle || "") +
      "</p>" +
      (stats
        ? '<p class="ytcf-stats">' +
          (views ? '<span class="ytcf-views">' + escapeHtml(views) + "</span>" : "") +
          (views && when ? '<span class="ytcf-views"> · </span>' : "") +
          (when ? "<span>" + escapeHtml(when) + "</span>" : "") +
          "</p>"
        : "") +
      "</div></div></a>"
    );
  }

  function findVideoById(videoId) {
    var all = feedVideos(lastFeed).concat(savedList);
    for (var i = 0; i < all.length; i++) {
      if (all[i] && all[i].videoId === videoId) return all[i];
    }
    return null;
  }

  function updateSavedBadgeAndView() {
    var chip = rootEl && rootEl.querySelector("#ytcf-saved-chip");
    if (chip) chip.textContent = "Saved (" + savedList.length + ")";
    if (activeFilter === "saved" && lastFeed) {
      renderFeed(lastFeed, true);
    }
  }

  function bindCardActions(scope) {
    if (!scope) return;
    scope.querySelectorAll(".ytcf-card-btn").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var card = btn.closest(".ytcf-card");
        if (!card) return;
        var videoId = card.getAttribute("data-video-id");
        var channelId = card.getAttribute("data-channel-id");
        var action = btn.getAttribute("data-action");
        var video = findVideoById(videoId);

        if (action === "save" && video) {
          send(YTFeedConstants.MESSAGE.TOGGLE_SAVE_VIDEO, { video: video }).then(function (res) {
            syncSaved(res.items || []);
            btn.classList.toggle("is-saved", !!res.saved);
            btn.textContent = res.saved ? "Saved" : "+ Save";
            updateSavedBadgeAndView();
          });
        } else if (action === "good" && video) {
          btn.classList.add("is-saved");
          btn.textContent = "✓ Good";
          send(YTFeedConstants.MESSAGE.FEEDBACK_VIDEO, { video: video, verdict: "good" })
            .then(function () {
              showNotice("Marked as valuable — ProTube learned your preference.");
            })
            .catch(function () {});
        } else if (action === "clickbait" && video) {
          card.remove();
          if (lastFeed && Array.isArray(lastFeed.videos)) {
            lastFeed.videos = lastFeed.videos.filter(function (v) { return v.videoId !== videoId; });
          }
          send(YTFeedConstants.MESSAGE.FEEDBACK_VIDEO, { video: video, verdict: "clickbait" })
            .then(function () {
              showNotice("Marked as clickbait/low-value — future feeds will down-rank similar videos.");
            })
            .catch(function () {});
        } else if (action === "dismiss" && videoId) {
          card.remove();
          if (lastFeed && Array.isArray(lastFeed.videos)) {
            lastFeed.videos = lastFeed.videos.filter(function (v) { return v.videoId !== videoId; });
          }
          send(YTFeedConstants.MESSAGE.DISMISS_VIDEO, { videoId: videoId });
        } else if (action === "block" && channelId) {
          var chTitle = (video && video.channelTitle) || channelId;
          rootEl.querySelectorAll('.ytcf-card[data-channel-id="' + CSS.escape(channelId) + '"]').forEach(function (el) {
            el.remove();
          });
          if (lastFeed && Array.isArray(lastFeed.videos)) {
            lastFeed.videos = lastFeed.videos.filter(function (v) { return v.channelId !== channelId; });
          }
          send(YTFeedConstants.MESSAGE.BLOCK_CHANNEL, {
            channel: { channelId: channelId, title: chTitle }
          }).then(function () {
            showNotice("Muted channel: " + chTitle + " (you can unmute anytime in Settings).");
          });
        }
      });
    });
  }

  function bindChrome() {
    var refresh = document.getElementById("ytcf-refresh");
    var settings = document.getElementById("ytcf-settings");
    var settingsTip = document.getElementById("ytcf-open-settings-tip");
    var zenBtn = document.getElementById("ytcf-zen");
    var durSelect = document.getElementById("ytcf-duration");
    var zenForm = document.getElementById("ytcf-zen-form");
    var zenToFeed = document.getElementById("ytcf-zen-to-feed");
    var zenSaved = document.getElementById("ytcf-zen-saved");

    if (refresh) {
      refresh.addEventListener("click", function () {
        activeFilter = activeFilter === "saved" ? "all" : activeFilter;
        loadFeed(true);
      });
    }
    if (settings) {
      settings.addEventListener("click", function () {
        chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
      });
    }
    if (settingsTip) {
      settingsTip.addEventListener("click", function () {
        chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
      });
    }
    if (zenBtn) {
      zenBtn.addEventListener("click", function () {
        var nextMode = (lastFeed && lastFeed.mode === "zen") ? "feed" : "zen";
        activeFilter = "all";
        send(YTFeedConstants.MESSAGE.SET_HOME_MODE, { homeMode: nextMode }).then(function () {
          if (!fetchInFlight) {
            lastFeed = null;
            loadFeed(false);
          }
        });
      });
    }
    if (durSelect) {
      durSelect.addEventListener("change", function () {
        durationFilter = durSelect.value || "all";
        if (lastFeed) renderFeed(lastFeed, true);
      });
    }
    if (zenForm) {
      zenForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = (document.getElementById("ytcf-zen-input").value || "").trim();
        if (q) location.href = "/results?search_query=" + encodeURIComponent(q);
      });
    }
    if (zenToFeed) {
      zenToFeed.addEventListener("click", function () {
        send(YTFeedConstants.MESSAGE.SET_HOME_MODE, { homeMode: "feed" }).then(function () {
          lastFeed = null;
          loadFeed(false);
        });
      });
    }
    if (zenSaved) {
      zenSaved.addEventListener("click", function () {
        activeFilter = "saved";
        renderFeed(lastFeed || { mode: "zen", videos: [] }, true);
      });
    }

    if (!rootEl) return;
    rootEl.querySelectorAll("[data-filter]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        activeFilter = chip.getAttribute("data-filter") || "all";
        if (lastFeed) renderFeed(lastFeed, true);
      });
    });

    bindCardActions(rootEl);

    rootEl.removeEventListener("scroll", onOverlayScroll);
    rootEl.addEventListener("scroll", onOverlayScroll);
  }

  function onOverlayScroll() {
    if (!rootEl) return;
    var remaining = rootEl.scrollHeight - rootEl.scrollTop - rootEl.clientHeight;
    if (remaining < 900) loadMore();
  }

  function formatCount(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }
})();
