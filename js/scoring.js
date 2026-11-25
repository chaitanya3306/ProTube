/**
 * Scoring is applied AFTER videos are fetched.
 * YouTube still returns whatever the Data API search finds;
 * this module only ranks and filters those results for YOUR overlay.
 */
var YTFeedScoring = (function () {
  "use strict";

  var TOPIC_STOP_WORDS = {
    a: true, an: true, and: true, are: true, as: true, at: true, be: true,
    best: true, by: true, course: true, deep: true, dive: true, documentary: true,
    explained: true, for: true, from: true, guide: true, how: true, in: true,
    into: true, intro: true, introduction: true, is: true, learn: true, lecture: true,
    lectures: true, of: true, on: true, or: true, overview: true, systems: true,
    the: true, to: true, tutorial: true, tutorials: true, video: true, videos: true,
    with: true
  };

  function parseIsoDuration(iso) {
    if (!iso || typeof iso !== "string") return 0;
    var match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    var hours = parseInt(match[1] || "0", 10);
    var minutes = parseInt(match[2] || "0", 10);
    var seconds = parseInt(match[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  function isShort(isoDuration, video) {
    var seconds = parseIsoDuration(isoDuration);
    if (seconds > 0 && seconds <= 60) return true;
    if (video && seconds > 0 && seconds <= 180) {
      var text = ((video.title || "") + " " + (video.description || "")).toLowerCase();
      if (/#shorts?\b/.test(text)) return true;
    }
    return false;
  }

  function formatDuration(iso) {
    var total = parseIsoDuration(iso);
    if (!total) return "";
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    function pad(n) {
      return n < 10 ? "0" + n : String(n);
    }
    if (hours) return hours + ":" + pad(minutes) + ":" + pad(seconds);
    return minutes + ":" + pad(seconds);
  }

  function containsAny(text, keywords) {
    for (var i = 0; i < keywords.length; i++) {
      if (text.indexOf(keywords[i]) !== -1) return true;
    }
    return false;
  }

  function extractDomainTerms(topic) {
    if (!topic || topic.kind === "channel") return [];
    var raw = ((topic.name || "") + " " + (topic.query || "")).toLowerCase();
    var tokens = raw.split(/[^a-z0-9+#]+/).filter(Boolean);
    var seen = {};
    var terms = [];
    tokens.forEach(function (tok) {
      if (tok.length < 2 || TOPIC_STOP_WORDS[tok] || seen[tok]) return;
      seen[tok] = true;
      terms.push(tok);
    });
    return terms;
  }

  function channelScoreFor(video, channels) {
    if (!channels || !channels.length) return 0;
    var id = video.channelId || "";
    var title = (video.channelTitle || "").toLowerCase();
    for (var i = 0; i < channels.length; i++) {
      var ch = channels[i];
      if (ch.enabled === false) continue;
      if (ch.channelId && ch.channelId === id) return Number(ch.score) || 0;
      if (ch.title && ch.title.toLowerCase() === title) return Number(ch.score) || 0;
    }
    return 0;
  }

  function scoreVideo(video, topic, settings) {
    var weights = (settings && settings.weights) || YTFeedConstants.DEFAULT_WEIGHTS;
    var sets = YTFeedConstants.KEYWORD_SETS;
    var titleLower = (video.title || "").toLowerCase();
    var tagsText = Array.isArray(video.tags) ? video.tags.join(" ") : "";
    var blob = [
      video.title || "",
      video.description || "",
      video.channelTitle || "",
      tagsText
    ]
      .join(" ")
      .toLowerCase();

    var score = 0;
    var reasons = [];

    if (topic && typeof topic.score === "number") {
      score += topic.score;
      reasons.push("topic +" + topic.score);
    }

    var chScore = channelScoreFor(video, settings && settings.channels);
    if (chScore) {
      score += chScore;
      reasons.push("channel +" + chScore);
    }

    // Domain relevance check against the video's own title/description/tags
    var domainTerms = extractDomainTerms(topic);
    if (domainTerms.length) {
      var titleHits = 0;
      var bodyHits = 0;
      domainTerms.forEach(function (term) {
        if (titleLower.indexOf(term) !== -1) titleHits++;
        if (blob.indexOf(term) !== -1) bodyHits++;
      });
      if (titleHits > 0) {
        var titleBoost = titleHits >= Math.ceil(domainTerms.length / 2) ? 12 : 6;
        score += titleBoost;
        reasons.push("title-match +" + titleBoost);
      } else if (bodyHits > 0) {
        score += 5;
        reasons.push("topic-match +5");
      } else if (!chScore) {
        score -= 10;
        reasons.push("off-topic -10");
      }
    }

    var aiHit = containsAny(blob, sets.aiRelated);
    var eduHit = containsAny(blob, sets.educational);
    var entHit = containsAny(blob, sets.entertainment);
    var gamingHit = containsAny(blob, sets.gaming);
    var celebHit = containsAny(blob, sets.celebrity);
    var sportsHit = containsAny(blob, sets.sports);

    if (aiHit) {
      score += weights.aiRelated;
      reasons.push("ai +" + weights.aiRelated);
    }
    if (eduHit) {
      score += weights.educational;
      reasons.push("edu +" + weights.educational);
    }
    if (entHit || (!aiHit && !eduHit && (video.categoryId === "24" || video.categoryId === "23"))) {
      score += weights.entertainment;
      reasons.push("entertainment " + weights.entertainment);
    }
    if (gamingHit || video.categoryId === "20") {
      score += weights.gaming;
      reasons.push("gaming " + weights.gaming);
    }
    if (celebHit) {
      score += weights.celebrity;
      reasons.push("celebrity " + weights.celebrity);
    }
    if (sportsHit || video.categoryId === "17") {
      score += weights.sports;
      reasons.push("sports " + weights.sports);
    }
    if (video.categoryId === "27" || video.categoryId === "28") {
      score += 5;
      reasons.push("sci/edu +5");
    }

    // Quality signals: popularity, engagement ratio, substantive length, recency
    var views = Number(video.viewCount) || 0;
    var likes = Number(video.likeCount) || 0;
    if (views > 100) {
      var viewBoost = Math.min(12, Math.max(0, Math.round((Math.log10(views) - 2) * 3)));
      if (viewBoost > 0) {
        score += viewBoost;
        reasons.push("views +" + viewBoost);
      }
    }
    if (views >= 500 && likes > 0) {
      var likeRatio = likes / views;
      if (likeRatio >= 0.01) {
        var likeBoost = Math.min(12, Math.round(likeRatio * 240));
        score += likeBoost;
        reasons.push("likes +" + likeBoost);
      } else if (views >= 1000 && likeRatio < 0.004) {
        score -= 5;
        reasons.push("low-like-ratio -5");
      }
    }

    var seconds = parseIsoDuration(video.duration);
    if (seconds >= 900 && seconds <= 5400) {
      score += 8;
      reasons.push("depth +8");
    } else if (seconds >= 300 && seconds < 900) {
      score += 5;
      reasons.push("length +5");
    } else if (seconds > 5400) {
      score += 4;
      reasons.push("longform +4");
    }

    if (video.publishedAt) {
      var pubMs = new Date(video.publishedAt).getTime();
      if (pubMs) {
        var ageDays = (Date.now() - pubMs) / 86400000;
        if (ageDays <= 7) {
          score += 8;
          reasons.push("fresh +8");
        } else if (ageDays <= 30) {
          score += 6;
          reasons.push("recent +6");
        } else if (ageDays <= 90) {
          score += 4;
          reasons.push("current +4");
        } else if (ageDays <= 365) {
          score += 2;
          reasons.push("year +2");
        } else if (ageDays > 1095) {
          score -= 3;
          reasons.push("older -3");
        }
      }
    }

    var shortFlag = isShort(video.duration, video);
    if (shortFlag) {
      score += weights.shortsPenalty;
      reasons.push("short " + weights.shortsPenalty);
    }

    if (video.liveBroadcastContent === "upcoming") {
      score -= 100;
      reasons.push("upcoming -100");
    }

    video.score = score;
    video.scoreReasons = reasons;
    video.durationLabel = formatDuration(video.duration);
    video.isShort = shortFlag;
    return video;
  }

  function rankSection(videos, topic, settings) {
    var minScore = (settings && settings.weights && typeof settings.weights.minScore === "number")
      ? settings.weights.minScore
      : 0;
    var hideShorts = !settings || !settings.hideNative || settings.hideNative.shorts !== false;
    var blocked = {};
    if (settings && Array.isArray(settings.blockedChannels)) {
      settings.blockedChannels.forEach(function (b) {
        if (b && b.channelId) blocked[b.channelId] = true;
      });
    }

    var ranked = videos
      .filter(function (video) {
        return video && !blocked[video.channelId];
      })
      .map(function (video) {
        return scoreVideo(video, topic, settings);
      })
      .filter(function (video) {
        if (hideShorts && video.isShort) return false;
        if (video.liveBroadcastContent === "upcoming") return false;
        return video.score >= minScore;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    return ranked;
  }

  function filterAndScore(videos, source, settings) {
    return rankSection(videos, source, settings);
  }

  function interleave(videos) {
    var buckets = {};
    var order = [];
    videos.forEach(function (video) {
      var key = video.sourceId || "mix";
      if (!buckets[key]) {
        buckets[key] = [];
        order.push(key);
      }
      buckets[key].push(video);
    });
    order.forEach(function (key) {
      buckets[key].sort(function (a, b) {
        return b.score - a.score;
      });
    });
    var mixed = [];
    var added = true;
    while (added) {
      added = false;
      order.forEach(function (key) {
        if (buckets[key].length) {
          mixed.push(buckets[key].shift());
          added = true;
        }
      });
    }
    return mixed;
  }

  function dedupe(videos) {
    var bestById = {};
    var order = [];
    videos.forEach(function (video) {
      if (!video || !video.videoId) return;
      var existing = bestById[video.videoId];
      if (!existing) {
        bestById[video.videoId] = video;
        order.push(video.videoId);
      } else if ((Number(video.score) || 0) > (Number(existing.score) || 0)) {
        bestById[video.videoId] = video;
      }
    });
    return order.map(function (id) {
      return bestById[id];
    });
  }

  /**
   * Selects a balanced, high-quality batch of videos for display, prioritizing
   * unseen videos across configured domains while enforcing channel diversity
   * and rotating source starting order.
   */
  function selectFeedBatch(videos, options) {
    var opts = options || {};
    var count = opts.count || 24;
    var seenMap = opts.seenMap || {};
    var excludeMap = {};
    (opts.excludeIds || []).forEach(function (id) {
      excludeMap[id] = true;
    });
    var now = opts.now || Date.now();
    var cooldownMs = typeof opts.seenCooldownMs === "number"
      ? opts.seenCooldownMs
      : 72 * 3600 * 1000;
    var maxPerChannel = opts.maxPerChannel || 2;
    var rotationOffset = opts.rotationOffset || 0;
    var hideShorts = opts.hideShorts !== false;
    var minScore = typeof opts.minScore === "number" ? opts.minScore : 0;

    var eligible = dedupe(videos).filter(function (v) {
      if (hideShorts && (v.isShort || isShort(v.duration, v))) return false;
      if (v.liveBroadcastContent === "upcoming") return false;
      if (opts.blockedChannelIds && opts.blockedChannelIds[v.channelId]) return false;
      if (opts.dismissedIds && opts.dismissedIds[v.videoId]) return false;
      return (Number(v.score) || 0) >= minScore;
    });

    var unseen = [];
    var seenRecently = [];
    eligible.forEach(function (v) {
      var seenAt = seenMap[v.videoId];
      var isFresh = !excludeMap[v.videoId] && (!seenAt || (now - seenAt >= cooldownMs));
      if (isFresh) unseen.push(v);
      else seenRecently.push(v);
    });

    function pickBalanced(pool, targetCount, alreadyPicked, alreadyChannelCounts) {
      var picked = alreadyPicked.slice();
      var pickedIds = {};
      picked.forEach(function (v) { pickedIds[v.videoId] = true; });
      var chCounts = Object.assign({}, alreadyChannelCounts);

      var buckets = {};
      var sourceOrder = [];
      pool.forEach(function (v) {
        if (pickedIds[v.videoId]) return;
        var key = v.sourceId || "mix";
        if (!buckets[key]) {
          buckets[key] = [];
          sourceOrder.push(key);
        }
        buckets[key].push(v);
      });

      sourceOrder.forEach(function (key) {
        buckets[key].sort(function (a, b) {
          return (b.score || 0) - (a.score || 0);
        });
      });

      // Order sources by their top candidate's score, then rotate slightly by rotationOffset
      sourceOrder.sort(function (a, b) {
        var sa = buckets[a][0] ? buckets[a][0].score || 0 : 0;
        var sb = buckets[b][0] ? buckets[b][0].score || 0 : 0;
        return sb - sa;
      });
      if (sourceOrder.length > 1 && rotationOffset > 0) {
        var shift = rotationOffset % sourceOrder.length;
        sourceOrder = sourceOrder.slice(shift).concat(sourceOrder.slice(0, shift));
      }

      // Round-robin pick respecting channel cap first, then relax cap if needed
      [false, true].forEach(function (ignoreChannelCap) {
        var madeProgress = true;
        while (picked.length < targetCount && madeProgress) {
          madeProgress = false;
          for (var s = 0; s < sourceOrder.length && picked.length < targetCount; s++) {
            var bucket = buckets[sourceOrder[s]];
            var chosenIdx = -1;
            for (var i = 0; i < bucket.length; i++) {
              var cand = bucket[i];
              if (pickedIds[cand.videoId]) continue;
              var chKey = cand.channelId || cand.channelTitle || cand.videoId;
              if (!ignoreChannelCap && (chCounts[chKey] || 0) >= maxPerChannel) continue;
              chosenIdx = i;
              break;
            }
            if (chosenIdx !== -1) {
              var chosen = bucket.splice(chosenIdx, 1)[0];
              var ch = chosen.channelId || chosen.channelTitle || chosen.videoId;
              picked.push(chosen);
              pickedIds[chosen.videoId] = true;
              chCounts[ch] = (chCounts[ch] || 0) + 1;
              madeProgress = true;
            }
          }
        }
      });

      return { picked: picked, chCounts: chCounts };
    }

    var res = pickBalanced(unseen, count, [], {});
    if (res.picked.length < count && seenRecently.length) {
      // Sort fallback by: not in excludeIds first, then oldest seenAt, then highest score
      seenRecently.sort(function (a, b) {
        var exA = excludeMap[a.videoId] ? 1 : 0;
        var exB = excludeMap[b.videoId] ? 1 : 0;
        if (exA !== exB) return exA - exB;
        var sa = seenMap[a.videoId] || 0;
        var sb = seenMap[b.videoId] || 0;
        if (sa !== sb) return sa - sb;
        return (b.score || 0) - (a.score || 0);
      });
      res = pickBalanced(seenRecently, count, res.picked, res.chCounts);
    }

    return {
      videos: res.picked,
      unseenRemaining: Math.max(0, unseen.length - res.picked.filter(function (v) {
        var seenAt = seenMap[v.videoId];
        return !excludeMap[v.videoId] && (!seenAt || (now - seenAt >= cooldownMs));
      }).length)
    };
  }

  function cleanTitle(title) {
    if (!title) return "";
    var text = String(title).trim();
    // Collapse excessive shouting punctuation
    text = text.replace(/([!?]){2,}/g, "$1");
    // Strip common leading/trailing bracketed hype tags only if title remains meaningful
    var letters = text.replace(/[^A-Za-z]/g, "");
    var upper = text.replace(/[^A-Z]/g, "");
    if (letters.length >= 8 && upper.length / letters.length > 0.72) {
      text = text.toLowerCase().replace(/(^|\s|[-:/(])([a-z])/g, function (_m, sep, ch) {
        return sep + ch.toUpperCase();
      });
      // Keep common acronyms crisp
      text = text.replace(/\b(Ai|Ml|Llm|Llms|Gpt|Api|Cpu|Gpu|Sql|Css|Html|Mit|Usa|Uk)\b/g, function (w) {
        return w.toUpperCase();
      });
    }
    return text;
  }

  function timeAgo(iso) {
    if (!iso) return "";
    var then = new Date(iso).getTime();
    if (!then) return "";
    var seconds = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (seconds < 3600) return Math.max(1, Math.floor(seconds / 60)) + " minutes ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " hours ago";
    if (seconds < 604800) return Math.floor(seconds / 86400) + " days ago";
    if (seconds < 2629800) return Math.floor(seconds / 604800) + " weeks ago";
    if (seconds < 31557600) return Math.floor(seconds / 2629800) + " months ago";
    return Math.floor(seconds / 31557600) + " years ago";
  }

  return {
    parseIsoDuration: parseIsoDuration,
    isShort: isShort,
    formatDuration: formatDuration,
    cleanTitle: cleanTitle,
    scoreVideo: scoreVideo,
    rankSection: rankSection,
    filterAndScore: filterAndScore,
    interleave: interleave,
    dedupe: dedupe,
    selectFeedBatch: selectFeedBatch,
    timeAgo: timeAgo
  };
})();
