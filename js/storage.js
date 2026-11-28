/**
 * Thin chrome.storage.sync / local helpers.
 * Settings sync across Chrome profiles when signed in.
 * Feed cache stays in local storage (it is large and quota-sensitive).
 */
var YTFeedStorage = (function () {
  "use strict";

  var SETTINGS_KEY = YTFeedConstants.SETTINGS_KEY;
  var CACHE_KEY = YTFeedConstants.CACHE_KEY;
  var POOL_KEY = YTFeedConstants.POOL_KEY;
  var HISTORY_KEY = YTFeedConstants.HISTORY_KEY;
  var SAVED_KEY = YTFeedConstants.SAVED_KEY;
  var STATS_KEY = YTFeedConstants.STATS_KEY;
  var LEARNED_KEY = YTFeedConstants.LEARNED_KEY;
  var CLICKBAIT_CACHE_KEY = YTFeedConstants.CLICKBAIT_CACHE_KEY;
  var LLM_CACHE_KEY = YTFeedConstants.LLM_CACHE_KEY;

  function getSettings() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(SETTINGS_KEY, function (result) {
        var stored = result[SETTINGS_KEY];
        var defaults = YTFeedConstants.defaultSettings();
        if (!stored) {
          resolve(defaults);
          return;
        }
        resolve(mergeSettings(defaults, stored));
      });
    });
  }

  function saveSettings(settings) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[SETTINGS_KEY] = settings;
      chrome.storage.sync.set(payload, function () {
        resolve(settings);
      });
    });
  }

  function getCache() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(CACHE_KEY, function (result) {
        resolve(result[CACHE_KEY] || null);
      });
    });
  }

  function saveCache(cache) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[CACHE_KEY] = cache;
      chrome.storage.local.set(payload, function () {
        resolve(cache);
      });
    });
  }

  function clearCache() {
    return new Promise(function (resolve) {
      chrome.storage.local.remove([CACHE_KEY, POOL_KEY, CLICKBAIT_CACHE_KEY], resolve);
    });
  }

  function getPool() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(POOL_KEY, function (result) {
        resolve(result[POOL_KEY] || null);
      });
    });
  }

  function savePool(pool) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[POOL_KEY] = pool;
      chrome.storage.local.set(payload, function () {
        resolve(pool);
      });
    });
  }

  function getHistory() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(HISTORY_KEY, function (result) {
        var h = result[HISTORY_KEY] || {};
        resolve({
          seen: h.seen || {},
          dismissed: h.dismissed || {},
          currentIds: Array.isArray(h.currentIds) ? h.currentIds : []
        });
      });
    });
  }

  function saveHistory(history) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[HISTORY_KEY] = history;
      chrome.storage.local.set(payload, function () {
        resolve(history);
      });
    });
  }

  function getSaved() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(SAVED_KEY, function (result) {
        resolve(Array.isArray(result[SAVED_KEY]) ? result[SAVED_KEY] : []);
      });
    });
  }

  function saveSaved(list) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[SAVED_KEY] = list;
      chrome.storage.local.set(payload, function () {
        resolve(list);
      });
    });
  }

  function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }

  function weekKey() {
    var d = new Date();
    var diff = d.getDate() - d.getDay();
    var start = new Date(d.getFullYear(), d.getMonth(), diff);
    var m = start.getMonth() + 1;
    var day = start.getDate();
    return start.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }

  function getStats() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(STATS_KEY, function (result) {
        var today = todayKey();
        var week = weekKey();
        var s = result[STATS_KEY] || {};
        if (s.date !== today) {
          s = {
            date: today,
            watchSeconds: 0,
            focusEndsAt: s.focusEndsAt || 0,
            focusDurationMin: s.focusDurationMin || 25,
            weekStart: s.weekStart === week ? week : week,
            filteredClickbaitWeek: s.weekStart === week ? (s.filteredClickbaitWeek || 0) : 0,
            llmCallsToday: 0
          };
        } else {
          if (s.weekStart !== week) {
            s.weekStart = week;
            s.filteredClickbaitWeek = 0;
          }
          s.filteredClickbaitWeek = s.filteredClickbaitWeek || 0;
          s.llmCallsToday = s.llmCallsToday || 0;
        }
        resolve(s);
      });
    });
  }

  function saveStats(stats) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[STATS_KEY] = stats;
      chrome.storage.local.set(payload, function () {
        resolve(stats);
      });
    });
  }

  function getLearned() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(LEARNED_KEY, function (result) {
        var raw = result[LEARNED_KEY] || {};
        resolve({
          channels: raw.channels && typeof raw.channels === "object" ? raw.channels : {},
          phrases: raw.phrases && typeof raw.phrases === "object" ? raw.phrases : {}
        });
      });
    });
  }

  function saveLearned(learned) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[LEARNED_KEY] = learned;
      chrome.storage.local.set(payload, function () {
        resolve(learned);
      });
    });
  }

  function resetLearned() {
    return new Promise(function (resolve) {
      chrome.storage.local.remove([LEARNED_KEY, CLICKBAIT_CACHE_KEY], function () {
        resolve({ channels: {}, phrases: {} });
      });
    });
  }

  function getClickbaitCache() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(CLICKBAIT_CACHE_KEY, function (result) {
        var raw = result[CLICKBAIT_CACHE_KEY];
        resolve(raw && typeof raw === "object" ? raw : { entries: {} });
      });
    });
  }

  function saveClickbaitCache(cache) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[CLICKBAIT_CACHE_KEY] = cache;
      chrome.storage.local.set(payload, function () {
        resolve(cache);
      });
    });
  }

  function getLlmCache() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(LLM_CACHE_KEY, function (result) {
        var raw = result[LLM_CACHE_KEY];
        resolve(raw && typeof raw === "object" ? raw : {});
      });
    });
  }

  function saveLlmCache(cache) {
    return new Promise(function (resolve) {
      var payload = {};
      payload[LLM_CACHE_KEY] = cache;
      chrome.storage.local.set(payload, function () {
        resolve(cache);
      });
    });
  }

  function mergeSettings(defaults, stored) {
    var merged = Object.assign({}, defaults, stored);
    merged.weights = Object.assign({}, defaults.weights, stored.weights || {});
    merged.hideNative = Object.assign({}, defaults.hideNative, stored.hideNative || {});
    merged.calmUI = Object.assign({}, defaults.calmUI, stored.calmUI || {});
    var storedCb = stored.clickbait || {};
    merged.clickbait = Object.assign({}, defaults.clickbait, storedCb);
    merged.clickbait.trustedChannels = Array.isArray(storedCb.trustedChannels) ? storedCb.trustedChannels : [];
    merged.clickbait.llm = Object.assign({}, defaults.clickbait.llm, storedCb.llm || {});
    merged.topics = Array.isArray(stored.topics)
      ? stored.topics
      : defaults.topics;
    merged.channels = Array.isArray(stored.channels) ? stored.channels : [];
    merged.blockedChannels = Array.isArray(stored.blockedChannels) ? stored.blockedChannels : [];
    merged.homeMode = stored.homeMode === "zen" ? "zen" : "feed";
    return merged;
  }

  return {
    getSettings: getSettings,
    saveSettings: saveSettings,
    getCache: getCache,
    saveCache: saveCache,
    clearCache: clearCache,
    getPool: getPool,
    savePool: savePool,
    getHistory: getHistory,
    saveHistory: saveHistory,
    getSaved: getSaved,
    saveSaved: saveSaved,
    getStats: getStats,
    saveStats: saveStats,
    getLearned: getLearned,
    saveLearned: saveLearned,
    resetLearned: resetLearned,
    getClickbaitCache: getClickbaitCache,
    saveClickbaitCache: saveClickbaitCache,
    getLlmCache: getLlmCache,
    saveLlmCache: saveLlmCache
  };
})();
