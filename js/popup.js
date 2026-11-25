(function () {
  "use strict";

  var settings = null;
  var stats = null;

  document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
      YTFeedStorage.getSettings(),
      YTFeedStorage.getStats(),
      YTFeedStorage.getSaved()
    ]).then(function (tuple) {
      settings = tuple[0];
      stats = tuple[1];
      var saved = tuple[2] || [];
      render(saved.length);
    });

    document.getElementById("settings").addEventListener("click", function () {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById("openHome").addEventListener("click", function () {
      chrome.tabs.create({ url: "https://www.youtube.com/" });
    });

    document.getElementById("refresh").addEventListener("click", function () {
      var status = document.getElementById("status");
      status.textContent = "Refreshing…";
      chrome.runtime.sendMessage({ type: YTFeedConstants.MESSAGE.REFRESH_FEED }, function (response) {
        if (!response || !response.ok) {
          status.textContent = (response && response.error) || "Refresh failed";
          return;
        }
        status.textContent = "Feed updated with fresh videos.";
      });
    });

    document.getElementById("toggleZen").addEventListener("change", function (e) {
      if (!settings) return;
      settings.homeMode = e.target.checked ? "zen" : "feed";
      saveQuickSettings();
    });
    document.getElementById("toggleSidebar").addEventListener("change", function (e) {
      if (!settings) return;
      settings.hideNative.watchSidebar = e.target.checked;
      saveQuickSettings();
    });
    document.getElementById("toggleComments").addEventListener("change", function (e) {
      if (!settings) return;
      settings.hideNative.collapseComments = e.target.checked;
      saveQuickSettings();
    });
    document.getElementById("toggleShorts").addEventListener("change", function (e) {
      if (!settings) return;
      settings.hideNative.shorts = e.target.checked;
      saveQuickSettings();
    });

    document.getElementById("focusTimer").addEventListener("click", function () {
      var active = stats && stats.focusEndsAt && stats.focusEndsAt > Date.now();
      var type = active
        ? YTFeedConstants.MESSAGE.STOP_FOCUS_TIMER
        : YTFeedConstants.MESSAGE.START_FOCUS_TIMER;
      chrome.runtime.sendMessage({ type: type, minutes: 25 }, function (resp) {
        if (resp && resp.ok) {
          stats = resp.data;
          renderFocusButton();
        }
      });
    });
  });

  function saveQuickSettings() {
    YTFeedStorage.saveSettings(settings).then(function () {
      renderModeBadge();
    });
  }

  function renderModeBadge() {
    var badge = document.getElementById("modeBadge");
    if (settings.homeMode === "zen") badge.textContent = "Zen";
    else if (settings.apiKey) badge.textContent = "API";
    else badge.textContent = "Starter";
  }

  function renderFocusButton() {
    var btn = document.getElementById("focusTimer");
    if (stats && stats.focusEndsAt && stats.focusEndsAt > Date.now()) {
      var rem = Math.max(1, Math.ceil((stats.focusEndsAt - Date.now()) / 60000));
      btn.textContent = "Stop Focus (" + rem + "m left)";
    } else {
      btn.textContent = "Start 25m Focus Session";
    }
  }

  function render(savedCount) {
    var status = document.getElementById("status");
    var topicCount = settings.topics.filter(function (t) { return t.enabled !== false; }).length;
    var chCount = settings.channels.filter(function (c) { return c.enabled !== false; }).length;
    status.textContent = settings.apiKey
      ? (topicCount + " topics · " + chCount + " channels")
      : ("Starter mode · " + topicCount + " domains active");

    renderModeBadge();
    renderFocusButton();

    var mins = Math.floor(((stats && stats.watchSeconds) || 0) / 60);
    document.getElementById("watchToday").textContent = "Today: " + mins + "m";
    document.getElementById("savedCount").textContent = "Saved: " + savedCount;

    document.getElementById("toggleZen").checked = settings.homeMode === "zen";
    document.getElementById("toggleSidebar").checked = settings.hideNative.watchSidebar !== false;
    document.getElementById("toggleComments").checked = settings.hideNative.collapseComments !== false;
    document.getElementById("toggleShorts").checked = settings.hideNative.shorts !== false;
  }
})();
