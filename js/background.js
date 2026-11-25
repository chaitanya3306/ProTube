importScripts("constants.js", "presets.js", "storage.js", "scoring.js", "youtube-api.js");

var BATCH_SIZE = 24;
var MAX_POOL_SIZE = 700;
var MAX_PAGES_PER_STRATEGY = 3;
var SEEN_COOLDOWN_MS = 72 * 3600 * 1000;
var HISTORY_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
var HISTORY_MAX_ENTRIES = 2000;

var TOPIC_STRATEGIES = [
  { order: "relevance" },
  { order: "viewCount", publishedAfterDays: 540 },
  { order: "relevance", publishedAfterDays: 90 },
  { order: "viewCount", publishedAfterDays: 30 },
  { order: "rating", publishedAfterDays: 365 },
  { order: "date", publishedAfterDays: 14 }
];

var CHANNEL_STRATEGIES = [
  { order: "date" },
  { order: "viewCount" }
];

var inflight = null;
var inflightIsForce = false;
var moreInflight = null;

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  handleMessage(message)
    .then(function (result) {
      sendResponse({ ok: true, data: result });
    })
    .catch(function (error) {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
  return true;
});

function handleMessage(message) {
  var type = message && message.type;
  var M = YTFeedConstants.MESSAGE;

  if (type === M.PING) return Promise.resolve({ pong: true });
  if (type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return Promise.resolve(true);
  }
  if (type === M.GET_SETTINGS) return YTFeedStorage.getSettings();
  if (type === M.SAVE_SETTINGS) {
    return YTFeedStorage.saveSettings(message.settings).then(function (settings) {
      return YTFeedStorage.clearCache().then(function () {
        return settings;
      });
    });
  }
  if (type === M.GET_FEED) return getFeed(false);
  if (type === M.REFRESH_FEED) return getFeed(true);
  if (type === M.LOAD_MORE) return loadMore();
  if (type === M.GET_SAVED) return YTFeedStorage.getSaved();
  if (type === M.TOGGLE_SAVE_VIDEO) return toggleSaveVideo(message.video);
  if (type === M.DISMISS_VIDEO) return dismissVideo(message.videoId);
  if (type === M.BLOCK_CHANNEL) return blockChannel(message.channel);
  if (type === M.UNBLOCK_CHANNEL) return unblockChannel(message.channelId);
  if (type === M.SET_HOME_MODE) return setHomeMode(message.homeMode);
  if (type === M.GET_STATS) return YTFeedStorage.getStats();
  if (type === M.ADD_WATCH_TIME) return addWatchTime(message.seconds);
  if (type === M.START_FOCUS_TIMER) return startFocusTimer(message.minutes);
  if (type === M.STOP_FOCUS_TIMER) return stopFocusTimer();
  if (type === M.SEARCH_CHANNEL) return handleSearchChannel(message.query);
  return Promise.reject(new Error("Unknown message: " + type));
}

function handleSearchChannel(query) {
  return YTFeedStorage.getSettings().then(function (settings) {
    var extractedId = YTFeedApi.extractChannelIdFromUrl(query);
    if (!settings.apiKey) {
      if (extractedId) {
        return YTFeedApi.fetchChannelRss(extractedId)
          .then(function (rss) {
            return [{ channelId: extractedId, title: rss.channelTitle || query, description: "Added via RSS", thumbnail: "" }];
          })
          .catch(function () {
            return [{ channelId: extractedId, title: query, description: "", thumbnail: "" }];
          });
      }
      throw new Error("Paste a channel URL (youtube.com/channel/UC...) or add a YouTube Data API key in Settings to search by name.");
    }
    if (extractedId) {
      return YTFeedApi.getChannelById(settings.apiKey, extractedId).then(function (items) {
        if (items && items.length) return items;
        return [{ channelId: extractedId, title: query, description: "", thumbnail: "" }];
      });
    }
    var extractedHandle = YTFeedApi.extractChannelHandleFromUrl(query);
    if (extractedHandle) {
      return YTFeedApi.getChannelByHandle(settings.apiKey, extractedHandle).then(function (items) {
        if (items && items.length) return items;
        return YTFeedApi.searchChannels(settings.apiKey, query);
      });
    }
    return YTFeedApi.searchChannels(settings.apiKey, query);
  });
}

function toggleSaveVideo(video) {
  if (!video || !video.videoId) return YTFeedStorage.getSaved();
  return YTFeedStorage.getSaved().then(function (list) {
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].videoId === video.videoId) {
        idx = i;
        break;
      }
    }
    var saved = false;
    if (idx !== -1) {
      list.splice(idx, 1);
    } else {
      saved = true;
      list.unshift({
        videoId: video.videoId,
        title: video.title,
        channelId: video.channelId || "",
        channelTitle: video.channelTitle || "",
        publishedAt: video.publishedAt || "",
        thumbnail: video.thumbnail || "",
        durationLabel: video.durationLabel || "",
        duration: video.duration || "",
        viewCount: video.viewCount || 0,
        sourceId: video.sourceId || "",
        sourceName: video.sourceName || "Saved",
        savedAt: Date.now()
      });
      if (list.length > 200) list = list.slice(0, 200);
    }
    return YTFeedStorage.saveSaved(list).then(function (updated) {
      return { saved: saved, items: updated };
    });
  });
}

function dismissVideo(videoId) {
  if (!videoId) return Promise.resolve(true);
  return Promise.all([
    YTFeedStorage.getHistory(),
    YTFeedStorage.getPool(),
    YTFeedStorage.getCache()
  ]).then(function (tuple) {
    var history = pruneHistory(tuple[0], Date.now());
    history.dismissed[videoId] = Date.now();
    history.currentIds = history.currentIds.filter(function (id) { return id !== videoId; });
    var tasks = [YTFeedStorage.saveHistory(history)];
    if (tuple[1] && Array.isArray(tuple[1].videos)) {
      tuple[1].videos = tuple[1].videos.filter(function (v) { return v.videoId !== videoId; });
      tasks.push(YTFeedStorage.savePool(tuple[1]));
    }
    if (tuple[2] && Array.isArray(tuple[2].videos)) {
      tuple[2].videos = tuple[2].videos.filter(function (v) { return v.videoId !== videoId; });
      tasks.push(YTFeedStorage.saveCache(tuple[2]));
    }
    return Promise.all(tasks).then(function () { return true; });
  });
}

function blockChannel(channel) {
  if (!channel || !channel.channelId) return Promise.resolve(null);
  return Promise.all([
    YTFeedStorage.getSettings(),
    YTFeedStorage.getPool(),
    YTFeedStorage.getCache()
  ]).then(function (tuple) {
    var settings = tuple[0];
    var list = settings.blockedChannels || [];
    var exists = list.some(function (b) { return b.channelId === channel.channelId; });
    if (!exists) {
      list.push({ channelId: channel.channelId, title: channel.title || channel.channelId });
      settings.blockedChannels = list;
    }
    var tasks = [YTFeedStorage.saveSettings(settings)];
    if (tuple[1] && Array.isArray(tuple[1].videos)) {
      tuple[1].videos = tuple[1].videos.filter(function (v) { return v.channelId !== channel.channelId; });
      tasks.push(YTFeedStorage.savePool(tuple[1]));
    }
    if (tuple[2] && Array.isArray(tuple[2].videos)) {
      tuple[2].videos = tuple[2].videos.filter(function (v) { return v.channelId !== channel.channelId; });
      tasks.push(YTFeedStorage.saveCache(tuple[2]));
    }
    return Promise.all(tasks).then(function () { return settings; });
  });
}

function unblockChannel(channelId) {
  return YTFeedStorage.getSettings().then(function (settings) {
    settings.blockedChannels = (settings.blockedChannels || []).filter(function (b) {
      return b.channelId !== channelId;
    });
    return YTFeedStorage.saveSettings(settings);
  });
}

function setHomeMode(mode) {
  var nextMode = mode === "zen" ? "zen" : "feed";
  return YTFeedStorage.getSettings().then(function (settings) {
    settings.homeMode = nextMode;
    return YTFeedStorage.saveSettings(settings);
  });
}

function addWatchTime(seconds) {
  var inc = Math.max(0, Math.min(120, Number(seconds) || 0));
  return YTFeedStorage.getStats().then(function (stats) {
    stats.watchSeconds = (stats.watchSeconds || 0) + inc;
    return YTFeedStorage.saveStats(stats);
  });
}

function startFocusTimer(minutes) {
  var mins = Math.max(1, Math.min(180, Number(minutes) || 25));
  return YTFeedStorage.getStats().then(function (stats) {
    stats.focusDurationMin = mins;
    stats.focusEndsAt = Date.now() + mins * 60 * 1000;
    return YTFeedStorage.saveStats(stats);
  });
}

function stopFocusTimer() {
  return YTFeedStorage.getStats().then(function (stats) {
    stats.focusEndsAt = 0;
    return YTFeedStorage.saveStats(stats);
  });
}

function blockedMapFromSettings(settings) {
  var map = {};
  (settings.blockedChannels || []).forEach(function (b) {
    if (b && b.channelId) map[b.channelId] = true;
  });
  return map;
}

function settingsSignature(settings) {
  var sources = effectiveSources(settings).map(function (s) {
    return { id: s.id, q: s.query, ch: s.channelId || "", score: s.score, kind: s.kind };
  });
  return JSON.stringify({
    mode: settings.apiKey ? "api" : "rss",
    sources: sources,
    blocked: (settings.blockedChannels || []).map(function (b) { return b.channelId; }),
    weights: settings.weights || {},
    hideShorts: !settings.hideNative || settings.hideNative.shorts !== false,
    region: settings.regionCode || "US",
    lang: settings.relevanceLanguage || "en"
  });
}

function poolIsFresh(pool, settings) {
  if (!pool || !pool.fetchedAt || !Array.isArray(pool.videos) || !pool.videos.length) return false;
  var cacheMinutes = Number(settings.cacheMinutes);
  if (isNaN(cacheMinutes)) cacheMinutes = 30;
  if (cacheMinutes <= 0) return false;
  return Date.now() - pool.fetchedAt < cacheMinutes * 60 * 1000;
}

function countUnseenInPool(poolVideos, history, blockedMap, now) {
  var exclude = {};
  (history.currentIds || []).forEach(function (id) { exclude[id] = true; });
  var seen = history.seen || {};
  var dismissed = history.dismissed || {};
  var count = 0;
  poolVideos.forEach(function (v) {
    if (!v || !v.videoId || exclude[v.videoId] || dismissed[v.videoId]) return;
    if (blockedMap && blockedMap[v.channelId]) return;
    var seenAt = seen[v.videoId];
    if (!seenAt || now - seenAt >= SEEN_COOLDOWN_MS) count++;
  });
  return count;
}

function pruneHistory(history, now) {
  var seen = history && history.seen ? Object.assign({}, history.seen) : {};
  Object.keys(seen).forEach(function (id) {
    if (!seen[id] || now - seen[id] > HISTORY_MAX_AGE_MS) {
      delete seen[id];
    }
  });
  var keys = Object.keys(seen);
  if (keys.length > HISTORY_MAX_ENTRIES) {
    keys.sort(function (a, b) { return seen[b] - seen[a]; });
    keys.slice(HISTORY_MAX_ENTRIES).forEach(function (id) {
      delete seen[id];
    });
  }
  return {
    seen: seen,
    dismissed: (history && history.dismissed) || {},
    currentIds: Array.isArray(history && history.currentIds) ? history.currentIds : []
  };
}

function markSeen(history, videos, now, replaceCurrent) {
  var next = pruneHistory(history, now);
  var ids = videos.map(function (v) { return v.videoId; });
  ids.forEach(function (id) {
    next.seen[id] = now;
  });
  next.currentIds = replaceCurrent ? ids : next.currentIds.concat(ids);
  return next;
}

function getFeed(forceRefresh) {
  if (inflight) {
    if (!forceRefresh || inflightIsForce) return inflight;
    return inflight.then(function () {
      return getFeed(true);
    }, function () {
      return getFeed(true);
    });
  }

  inflightIsForce = !!forceRefresh;
  inflight = YTFeedStorage.getSettings()
    .then(function (settings) {
      if (settings.homeMode === "zen" && !forceRefresh) {
        return {
          mode: "zen",
          feedMode: settings.apiKey ? "api" : "rss",
          fetchedAt: Date.now(),
          servedAt: Date.now(),
          refreshSeq: 0,
          videos: [],
          hasMore: false
        };
      }

      var sources = effectiveSources(settings);
      if (!sources.length) {
        throw new Error("No enabled topics or channels. Enable at least one in Settings.");
      }

      var sig = settingsSignature(settings);
      return Promise.all([
        YTFeedStorage.getPool(),
        YTFeedStorage.getHistory(),
        YTFeedStorage.getCache()
      ]).then(function (tuple) {
        var pool = tuple[0];
        var history = pruneHistory(tuple[1], Date.now());
        var prevCache = tuple[2];
        var blockedMap = blockedMapFromSettings(settings);
        var sameSig = pool && pool.signature === sig;

        if (!forceRefresh && sameSig && poolIsFresh(pool, settings)) {
          var unseenCount = countUnseenInPool(pool.videos, history, blockedMap, Date.now());
          var minNeeded = settings.apiKey ? Math.min(BATCH_SIZE, pool.videos.length) : 1;
          if (unseenCount >= minNeeded) {
            return serveBatchFromPool(settings, pool, history, prevCache, false);
          }
        }

        var basePool = sameSig ? pool : null;
        return fetchAndMergePool(settings, sig, basePool, forceRefresh, history).then(function (nextPool) {
          return serveBatchFromPool(settings, nextPool, history, prevCache, forceRefresh);
        });
      });
    })
    .finally(function () {
      inflight = null;
      inflightIsForce = false;
    });

  return inflight;
}

function loadMore() {
  if (moreInflight) return moreInflight;
  moreInflight = YTFeedStorage.getSettings()
    .then(function (settings) {
      var sig = settingsSignature(settings);
      return Promise.all([
        YTFeedStorage.getPool(),
        YTFeedStorage.getHistory(),
        YTFeedStorage.getCache()
      ]).then(function (tuple) {
        var pool = tuple[0];
        var history = pruneHistory(tuple[1], Date.now());
        var cache = tuple[2] || { videos: [] };
        var existingVideos = Array.isArray(cache.videos) ? cache.videos : [];
        var existingIds = existingVideos.map(function (v) { return v.videoId; });
        var blockedMap = blockedMapFromSettings(settings);
        var sameSig = pool && pool.signature === sig;

        if (sameSig && (
          countUnseenInPool(pool.videos, history, blockedMap, Date.now()) >= BATCH_SIZE ||
          !settings.apiKey
        )) {
          return appendBatchFromPool(settings, pool, history, cache, existingVideos, existingIds);
        }

        var basePool = sameSig ? pool : null;
        return fetchAndMergePool(settings, sig, basePool, true, history).then(function (nextPool) {
          return appendBatchFromPool(settings, nextPool, history, cache, existingVideos, existingIds);
        });
      });
    })
    .finally(function () {
      moreInflight = null;
    });
  return moreInflight;
}

function serveBatchFromPool(settings, pool, history, prevCache, isManualRefresh) {
  var now = Date.now();
  var minScore = (settings.weights && typeof settings.weights.minScore === "number")
    ? settings.weights.minScore
    : 0;
  var hideShorts = !settings.hideNative || settings.hideNative.shorts !== false;
  var rotationOffset = pool.rotationOffset || 0;

  var selection = YTFeedScoring.selectFeedBatch(pool.videos, {
    count: BATCH_SIZE,
    seenMap: history.seen,
    dismissedIds: history.dismissed,
    blockedChannelIds: blockedMapFromSettings(settings),
    excludeIds: history.currentIds,
    rotationOffset: rotationOffset,
    maxPerChannel: 2,
    hideShorts: hideShorts,
    minScore: minScore,
    now: now,
    seenCooldownMs: SEEN_COOLDOWN_MS
  });

  pool.rotationOffset = rotationOffset + 1;
  var nextHistory = markSeen(history, selection.videos, now, true);
  var prevSeq = (prevCache && prevCache.refreshSeq) || 0;
  var refreshSeq = isManualRefresh ? prevSeq + 1 : prevSeq;

  var cache = {
    mode: settings.homeMode || "feed",
    feedMode: settings.apiKey ? "api" : "rss",
    fetchedAt: pool.fetchedAt || now,
    servedAt: now,
    refreshSeq: refreshSeq,
    videos: selection.videos,
    hasMore: selection.unseenRemaining > 0 || pool.videos.length > selection.videos.length
  };

  return Promise.all([
    YTFeedStorage.savePool(pool),
    YTFeedStorage.saveHistory(nextHistory),
    YTFeedStorage.saveCache(cache)
  ]).then(function () {
    return normalizeCache(cache);
  });
}

function appendBatchFromPool(settings, pool, history, prevCache, existingVideos, existingIds) {
  var now = Date.now();
  var minScore = (settings.weights && typeof settings.weights.minScore === "number")
    ? settings.weights.minScore
    : 0;
  var hideShorts = !settings.hideNative || settings.hideNative.shorts !== false;

  var excludeSet = {};
  existingIds.forEach(function (id) { excludeSet[id] = true; });
  var remainingCandidates = pool.videos.filter(function (v) {
    return v && v.videoId && !excludeSet[v.videoId];
  });

  var selection = YTFeedScoring.selectFeedBatch(remainingCandidates, {
    count: BATCH_SIZE,
    seenMap: history.seen,
    dismissedIds: history.dismissed,
    blockedChannelIds: blockedMapFromSettings(settings),
    excludeIds: existingIds,
    rotationOffset: (pool.rotationOffset || 0) + 1,
    maxPerChannel: 2,
    hideShorts: hideShorts,
    minScore: minScore,
    now: now,
    seenCooldownMs: SEEN_COOLDOWN_MS
  });

  var newVideos = selection.videos;
  var combined = existingVideos.concat(newVideos);
  var nextHistory = markSeen(history, newVideos, now, false);

  var cache = {
    mode: settings.homeMode || "feed",
    feedMode: settings.apiKey ? "api" : "rss",
    fetchedAt: (prevCache && prevCache.fetchedAt) || pool.fetchedAt || now,
    servedAt: now,
    refreshSeq: (prevCache && prevCache.refreshSeq) || 0,
    videos: combined,
    hasMore: newVideos.length > 0 && (selection.unseenRemaining > 0 || remainingCandidates.length > newVideos.length)
  };

  return Promise.all([
    YTFeedStorage.savePool(pool),
    YTFeedStorage.saveHistory(nextHistory),
    YTFeedStorage.saveCache(cache)
  ]).then(function () {
    var result = normalizeCache(cache);
    result.newVideos = newVideos;
    return result;
  });
}

function sourceList(settings) {
  var topics = (settings.topics || []).filter(function (t) {
    return t && t.enabled !== false && (t.query || t.name);
  }).map(function (topic) {
    return {
      id: topic.id,
      name: topic.name,
      query: topic.query || topic.name,
      score: topic.score,
      kind: "topic"
    };
  });
  var channels = (settings.channels || []).filter(function (c) {
    return c && c.enabled !== false && c.channelId;
  }).map(function (channel) {
    return {
      id: "channel-" + channel.channelId,
      name: channel.title || channel.channelId,
      query: "",
      score: channel.score,
      kind: "channel",
      channelId: channel.channelId
    };
  });
  return topics.concat(channels);
}

function effectiveSources(settings) {
  if (settings.apiKey) return sourceList(settings);

  // Zero-key Starter Mode: user's enabled channels + curated starter channels matching enabled topics
  var customChannels = (settings.channels || []).filter(function (c) {
    return c && c.enabled !== false && c.channelId;
  }).map(function (channel) {
    return {
      id: "channel-" + channel.channelId,
      name: channel.title || channel.channelId,
      query: "",
      score: channel.score,
      kind: "rss",
      channelId: channel.channelId
    };
  });

  var starter = YTFeedPresets.starterSourcesForTopics(settings.topics || []);
  var seen = {};
  customChannels.forEach(function (c) { seen[c.channelId] = true; });
  return customChannels.concat(starter.filter(function (s) {
    if (seen[s.channelId]) return false;
    seen[s.channelId] = true;
    return true;
  }));
}

function perSourceCount(settings) {
  var n = Number(settings.maxPerSource);
  if (!n) n = 50;
  return Math.min(50, Math.max(n, 20));
}

function strategiesForSource(source) {
  return source.kind === "channel" ? CHANNEL_STRATEGIES : TOPIC_STRATEGIES;
}

function strategyParams(strategy, now) {
  var params = { order: strategy.order || "relevance" };
  if (strategy.publishedAfterDays) {
    params.publishedAfter = new Date(now - strategy.publishedAfterDays * 86400 * 1000).toISOString();
  }
  return params;
}

function fetchAndMergePool(settings, sig, existingPool, advanceStrategy, history) {
  var now = Date.now();
  var sources = effectiveSources(settings);
  var prevCursors = (existingPool && existingPool.cursors) || {};

  var jobs = sources.map(function (source) {
    if (source.kind === "rss") {
      return fetchRssSource(settings, source);
    }
    var strategies = strategiesForSource(source);
    var cursor = prevCursors[source.id] || { strategyIndex: 0, strategyTokens: {}, strategyPages: {} };
    var idx = typeof cursor.strategyIndex === "number" ? cursor.strategyIndex % strategies.length : 0;
    if (advanceStrategy && prevCursors[source.id]) {
      idx = (idx + 1) % strategies.length;
    }
    var strategyTokens = Object.assign({}, cursor.strategyTokens || {});
    var strategyPages = Object.assign({}, cursor.strategyPages || {});
    var pageToken = strategyTokens[idx] || "";
    var pagesDone = strategyPages[idx] || 0;
    if (pagesDone >= MAX_PAGES_PER_STRATEGY) {
      pageToken = "";
      pagesDone = 0;
    }

    var strategy = strategies[idx];
    return fetchSource(settings, source, strategy, pageToken, now).then(function (res) {
      if (res.error) return res;
      if (res.nextPageToken && pagesDone + 1 < MAX_PAGES_PER_STRATEGY) {
        strategyTokens[idx] = res.nextPageToken;
        strategyPages[idx] = pagesDone + 1;
      } else {
        strategyTokens[idx] = "";
        strategyPages[idx] = 0;
      }
      res.nextCursor = {
        strategyIndex: idx,
        strategyTokens: strategyTokens,
        strategyPages: strategyPages
      };
      return res;
    });
  });

  return Promise.all(jobs).then(function (results) {
    var incoming = [];
    var nextCursors = {};
    var errors = [];

    results.forEach(function (res) {
      if (res.error) {
        errors.push(res.error);
        if (prevCursors[res.source.id]) nextCursors[res.source.id] = prevCursors[res.source.id];
      } else {
        incoming = incoming.concat(res.videos || []);
        if (res.nextCursor) nextCursors[res.source.id] = res.nextCursor;
      }
    });

    if (errors.length === results.length && errors.length > 0) {
      throw new Error(errors[0]);
    }

    var merged = YTFeedScoring.dedupe(
      (existingPool && Array.isArray(existingPool.videos) ? existingPool.videos : []).concat(incoming)
    );

    if (merged.length > MAX_POOL_SIZE) {
      var seenMap = (history && history.seen) || {};
      merged.sort(function (a, b) {
        var seenA = seenMap[a.videoId] && (now - seenMap[a.videoId] < SEEN_COOLDOWN_MS) ? 1 : 0;
        var seenB = seenMap[b.videoId] && (now - seenMap[b.videoId] < SEEN_COOLDOWN_MS) ? 1 : 0;
        if (seenA !== seenB) return seenA - seenB;
        return (b.score || 0) - (a.score || 0);
      });
      merged = merged.slice(0, MAX_POOL_SIZE);
    }

    return {
      signature: sig,
      fetchedAt: now,
      rotationOffset: (existingPool && existingPool.rotationOffset) || 0,
      cursors: nextCursors,
      videos: merged
    };
  });
}

function fetchRssSource(settings, source) {
  return YTFeedApi.fetchChannelRss(source.channelId)
    .then(function (rss) {
      var videos = (rss.videos || []).map(function (video) {
        video.sourceId = source.id;
        video.sourceName = source.name;
        if (video.description && video.description.length > 500) {
          video.description = video.description.slice(0, 500);
        }
        return video;
      });
      return {
        source: source,
        nextPageToken: "",
        videos: YTFeedScoring.filterAndScore(videos, source, settings)
      };
    })
    .catch(function (error) {
      return {
        source: source,
        videos: [],
        nextPageToken: "",
        error: (error && error.message) || String(error)
      };
    });
}

function fetchSource(settings, source, strategy, pageToken, now) {
  var sParams = strategyParams(strategy, now);
  return YTFeedApi.searchVideos(settings.apiKey, {
    query: source.query,
    channelId: source.channelId,
    maxResults: perSourceCount(settings),
    regionCode: settings.regionCode,
    relevanceLanguage: settings.relevanceLanguage,
    order: sParams.order,
    publishedAfter: sParams.publishedAfter,
    pageToken: pageToken
  })
    .then(function (result) {
      return YTFeedApi.enrichVideos(settings.apiKey, result.videos).then(function (videos) {
        videos.forEach(function (video) {
          video.sourceId = source.id;
          video.sourceName = source.name;
          if (video.description && video.description.length > 500) {
            video.description = video.description.slice(0, 500);
          }
        });
        return {
          source: source,
          nextPageToken: result.nextPageToken || "",
          videos: YTFeedScoring.filterAndScore(videos, source, settings)
        };
      });
    })
    .catch(function (error) {
      return {
        source: source,
        videos: [],
        nextPageToken: "",
        error: (error && error.message) || String(error)
      };
    });
}

function normalizeCache(cache) {
  var videos = cache.videos;
  if ((!videos || !videos.length) && cache.sections) {
    videos = [];
    cache.sections.forEach(function (section) {
      (section.videos || []).forEach(function (video) {
        video.sourceId = section.id;
        video.sourceName = section.name;
        videos.push(video);
      });
    });
    videos = YTFeedScoring.interleave(YTFeedScoring.dedupe(videos));
  }
  return {
    mode: cache.mode || "feed",
    feedMode: cache.feedMode || "api",
    fetchedAt: cache.fetchedAt,
    servedAt: cache.servedAt || cache.fetchedAt,
    refreshSeq: cache.refreshSeq || 0,
    videos: videos || [],
    hasMore: !!cache.hasMore
  };
}
