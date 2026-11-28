/**
 * Clickbait & Value Detection Layer (Layers 1-4 synchronous, Layer 5 optional LLM hook).
 * Pure, deterministic, zero-network in assessClickbait(). Fails open when unsure.
 */
var YTFeedClickbait = (function () {
  "use strict";

  var Constants = typeof YTFeedConstants !== "undefined"
    ? YTFeedConstants
    : (typeof require !== "undefined" ? require("./constants.js") : null);
  var Presets = typeof YTFeedPresets !== "undefined"
    ? YTFeedPresets
    : (typeof require !== "undefined" ? require("./presets.js") : null);

  var DATA = (Constants && Constants.CLICKBAIT_DATA) || {};

  var ACRONYM_SET = {};
  (DATA.acronymWhitelist || []).forEach(function (a) {
    ACRONYM_SET[String(a).toUpperCase()] = true;
  });

  var EMPHASIS_SET = {};
  (DATA.emphasisCapsWords || []).forEach(function (w) {
    EMPHASIS_SET[String(w).toUpperCase()] = true;
  });

  var VAGUE_HOOK_REGEXES = (DATA.vagueHooks || []).map(function (item) {
    return {
      re: new RegExp(item.pattern, "i"),
      weight: item.weight,
      label: item.label
    };
  });

  var NUMBER_BAIT_RE = /^\s*(?:top\s+)?\d{1,2}\s+(?:things|ways|reasons|tricks|mistakes|secrets|habits|tips|signs|lies|hacks)\b/i;
  var TIMESTAMP_RE = /\b\d{1,2}:\d{2}\b/g;
  var EXCESS_PUNCT_RE = /([!?])\1{1,}|[!?]{2,}|\.{4,}/g;
  var HYPE_EMOJI_RE = /[\u{1F631}\u{1F92F}\u{1F525}\u{1F6A8}\u{1F480}\u{26A0}\u{1F4AF}\u{1F633}\u{1F92A}\u{1F4A5}]/gu;

  var COHERENCE_STOP = {
    the: true, and: true, for: true, with: true, that: true, this: true, from: true,
    your: true, you: true, are: true, was: true, were: true, have: true, has: true,
    will: true, what: true, when: true, where: true, which: true, who: true, why: true,
    how: true, into: true, about: true, just: true, like: true, more: true, most: true,
    not: true, but: true, out: true, all: true, can: true, new: true, one: true, two: true
  };

  function clamp(num, min, max) {
    return num < min ? min : (num > max ? max : num);
  }

  function parseDurationSeconds(iso) {
    if (!iso || typeof iso !== "string") return 0;
    var match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    return (
      parseInt(match[1] || "0", 10) * 3600 +
      parseInt(match[2] || "0", 10) * 60 +
      parseInt(match[3] || "0", 10)
    );
  }

  function buildDomainTokenSet(settings) {
    var set = {};
    var topics = (settings && Array.isArray(settings.topics)) ? settings.topics : [];
    topics.forEach(function (t) {
      if (!t || t.enabled === false) return;
      var raw = ((t.name || "") + " " + (t.query || "")).toLowerCase();
      raw.split(/[^a-z0-9+#]+/).forEach(function (tok) {
        if (tok.length >= 2) set[tok] = true;
      });
    });
    return set;
  }

  function buildTrustedChannelSet(settings) {
    var set = {};
    var cb = (settings && settings.clickbait) || {};
    if (cb.trustStarterChannels !== false && Presets) {
      var byTopic = Presets.STARTER_CHANNELS_BY_TOPIC || {};
      Object.keys(byTopic).forEach(function (key) {
        (byTopic[key] || []).forEach(function (ch) {
          if (ch && ch.channelId) set[ch.channelId] = true;
        });
      });
      (Presets.FALLBACK_STARTER_CHANNELS || []).forEach(function (ch) {
        if (ch && ch.channelId) set[ch.channelId] = true;
      });
    }
    (cb.trustedChannels || []).forEach(function (ch) {
      if (typeof ch === "string" && ch) set[ch] = true;
      else if (ch && ch.channelId) set[ch.channelId] = true;
    });
    return set;
  }

  function isMostlyAsciiLatin(text) {
    if (!text) return true;
    var nonSpace = text.replace(/\s+/g, "");
    if (!nonSpace.length) return true;
    var asciiLetters = text.replace(/[^A-Za-z]/g, "").length;
    return (asciiLetters / nonSpace.length) >= 0.3;
  }

  function extractFeedbackTokens(title) {
    var lower = String(title || "").toLowerCase();
    var matched = [];
    (DATA.hypePhrases || []).forEach(function (item) {
      if (lower.indexOf(item.phrase) !== -1) matched.push(item.phrase);
    });
    var words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) {
      return w.length >= 4 && !COHERENCE_STOP[w];
    });
    for (var i = 0; i < words.length - 1 && matched.length < 6; i++) {
      matched.push(words[i] + " " + words[i + 1]);
    }
    return matched.slice(0, 6);
  }

  /**
   * Pure synchronous clickbait & value assessment.
   * @returns {{ clickbaitScore: number, valueScore: number, verdict: "good"|"borderline"|"clickbait", reasons: string[], matchedPhrases: string[] }}
   */
  function assessClickbait(video, settings, learned) {
    var v = video || {};
    var title = String(v.title || "").trim();
    var desc = typeof v.description === "string" ? v.description.trim() : "";
    var tags = Array.isArray(v.tags) ? v.tags : [];
    var cbSettings = (settings && settings.clickbait) || {};
    var sensitivity = cbSettings.sensitivity || "balanced";
    var thresholds = (DATA.sensitivityThresholds && DATA.sensitivityThresholds[sensitivity]) ||
      { rejectAt: 58, borderlineAt: 32 };

    if (!title) {
      return {
        clickbaitScore: 10,
        valueScore: 50,
        verdict: "good",
        reasons: ["Missing title (fail-open)"],
        matchedPhrases: []
      };
    }

    var cbScore = 0;
    var valueBonus = 0;
    var reasons = [];
    var matchedPhrases = [];
    var domainTokens = buildDomainTokenSet(settings);
    var isLatin = isMostlyAsciiLatin(title);
    // Normalize typographic quotes so "won’t" matches "won't"
    title = title.replace(/[\u2018\u2019\u201B]/g, "'").replace(/[\u201C\u201D]/g, "\"");
    var titleLower = title.toLowerCase();
    var signalKinds = {};

    // --- LAYER 1: Title heuristics ---
    // 1a. ALL-CAPS word ratio (excluding acronyms & user domain keywords)
    if (isLatin) {
      var rawWords = title.split(/\s+/).filter(Boolean);
      var eligibleWords = 0;
      var capsWords = 0;
      var emphasisHits = 0;
      rawWords.forEach(function (w) {
        var clean = w.replace(/[^A-Za-z0-9]/g, "");
        if (clean.length < 3 || /^\d+$/.test(clean)) return;
        var upperClean = clean.toUpperCase();
        var lowerClean = clean.toLowerCase();
        if (ACRONYM_SET[upperClean] || domainTokens[lowerClean]) return;
        if (clean === upperClean && EMPHASIS_SET[upperClean]) emphasisHits++;
        eligibleWords++;
        if (clean === upperClean && /[A-Z]{3,}/.test(clean)) {
          capsWords++;
        }
      });
      if (capsWords >= 2 || (eligibleWords >= 4 && capsWords / eligibleWords >= 0.4)) {
        var capsRatio = eligibleWords ? capsWords / eligibleWords : 0;
        var capsPenalty = Math.min(24, Math.round(10 + capsRatio * 20 + Math.max(0, capsWords - 2) * 3));
        cbScore += capsPenalty;
        reasons.push("Excessive ALL-CAPS (" + capsWords + " words)");
        signalKinds.caps = true;
      } else if (emphasisHits > 0) {
        // A single shouted hype word (e.g. "will SHOCK you") is a weaker but real signal
        cbScore += Math.min(14, emphasisHits * 7);
        reasons.push("Shouted hype word");
        signalKinds.caps = true;
      }
      if (emphasisHits >= 2 && capsWords >= 2) cbScore += 4;
    }

    // 1b. Excess punctuation & hype emojis
    var punctMatches = title.match(EXCESS_PUNCT_RE);
    var emojiMatches = title.match(HYPE_EMOJI_RE);
    if (punctMatches && punctMatches.length) {
      var punctPen = Math.min(16, 8 + (punctMatches.length - 1) * 4);
      cbScore += punctPen;
      reasons.push("Sensational punctuation");
      signalKinds.punct = true;
    }
    if (emojiMatches && emojiMatches.length >= 2) {
      cbScore += Math.min(12, emojiMatches.length * 4);
      reasons.push("Hype emoji spam");
      signalKinds.emoji = true;
    }

    // 1c. Curiosity-gap and hype phrases
    var hypeHits = 0;
    (DATA.hypePhrases || []).forEach(function (item) {
      if (titleLower.indexOf(item.phrase) !== -1) {
        cbScore += item.weight;
        hypeHits++;
        signalKinds.phrase = true;
        matchedPhrases.push(item.phrase);
        if (reasons.length < 5) {
          reasons.push("Hype phrase: \"" + item.phrase + "\"");
        }
      }
    });

    // 1d. Vague pronoun hooks
    VAGUE_HOOK_REGEXES.forEach(function (hook) {
      if (hook.re.test(titleLower)) {
        cbScore += hook.weight;
        hypeHits++;
        signalKinds.hook = true;
        if (reasons.length < 5) reasons.push("Curiosity-gap hook");
      }
    });

    // 1e. Positive value signals (reduce clickbait & raise valueScore)
    var valueHits = 0;
    (DATA.valueSignals || []).forEach(function (sig) {
      if (titleLower.indexOf(sig.phrase) !== -1) {
        valueBonus += sig.weight;
        cbScore -= Math.round(sig.weight * 0.7);
        valueHits++;
        if (valueHits <= 2) reasons.push("Substantive signal: \"" + sig.phrase + "\"");
      }
    });

    // Combination bonus: several independent clickbait signals together are far more
    // telling than one alone. Waived when strong educational signals are present.
    var kindCount = Object.keys(signalKinds).length;
    if (kindCount >= 2 && valueHits === 0) {
      cbScore += Math.min(18, (kindCount - 1) * 6);
    }

    // Domain keyword matches in title
    var domainHits = 0;
    Object.keys(domainTokens).forEach(function (tok) {
      if (tok.length >= 3 && titleLower.indexOf(tok) !== -1) domainHits++;
    });
    if (domainHits > 0) {
      var domBonus = Math.min(14, domainHits * 5);
      valueBonus += domBonus;
      cbScore -= Math.round(domBonus * 0.5);
      reasons.push("Matches your domain terms");
    }

    // Chapters / timestamps in description
    var tsMatches = desc ? desc.match(TIMESTAMP_RE) : null;
    if (tsMatches && tsMatches.length >= 3) {
      valueBonus += 12;
      cbScore -= 8;
      reasons.push("Has chapter timestamps");
    }

    // 1f. Number-bait (lightweight, waived if educational/technical signals present)
    if (NUMBER_BAIT_RE.test(titleLower)) {
      var numPen = valueHits > 0 || domainHits > 0 ? 3 : 8;
      cbScore += numPen;
      if (numPen >= 8) reasons.push("Listicle number-bait");
    }

    // --- LAYER 2: Metadata signals (only use what is present; never penalize missing) ---
    var views = Number(v.viewCount) || 0;
    var likes = Number(v.likeCount) || 0;
    var comments = Number(v.commentCount) || 0;
    var secs = parseDurationSeconds(v.duration);

    if (views >= 1000 && likes > 0) {
      var likeRatio = likes / views;
      if (likeRatio < 0.004) {
        cbScore += 14;
        reasons.push("Very low like-to-view ratio");
      } else if (likeRatio >= 0.035) {
        valueBonus += 10;
        cbScore -= 8;
        reasons.push("High viewer approval ratio");
      }
    }

    if (views >= 2000 && comments > 0) {
      var commentRatio = comments / views;
      if (commentRatio >= 0.003) {
        valueBonus += 5;
      } else if (commentRatio < 0.0003 && hypeHits > 0) {
        cbScore += 6;
      }
    }

    // Views-per-day spike with weak engagement
    if (v.publishedAt && views >= 10000) {
      var pubMs = new Date(v.publishedAt).getTime();
      if (pubMs) {
        var ageDays = Math.max(0.25, (Date.now() - pubMs) / 86400000);
        var vpd = views / ageDays;
        if (ageDays <= 14 && vpd >= 50000 && likes > 0 && (likes / views) < 0.012) {
          cbScore += 10;
          reasons.push("High-velocity spike with weak engagement");
        }
      }
    }

    // RSS starRating (when available)
    if (typeof v.starRatingAverage === "number" && (Number(v.starRatingCount) || 0) >= 5) {
      if (v.starRatingAverage < 3.6) {
        cbScore += 14;
        reasons.push("Low RSS star rating (" + v.starRatingAverage.toFixed(1) + ")");
      } else if (v.starRatingAverage >= 4.7) {
        valueBonus += 8;
        cbScore -= 6;
      }
    }

    // Duration sanity (only when duration is known)
    if (secs > 0 && v.liveBroadcastContent !== "live") {
      if (secs <= 120 && hypeHits > 0) {
        cbScore += 10;
        reasons.push("Very short video with hype title");
      } else if (secs >= 600 && hypeHits >= 2 && valueHits === 0) {
        cbScore += 8;
        reasons.push("Long video with heavy hype & no substance cues");
      } else if (secs >= 600 && secs <= 5400 && (valueHits > 0 || domainHits > 0)) {
        valueBonus += 8;
        cbScore -= 4;
      }
    }

    // Channel signal: muted vs trusted
    var blockedSet = {};
    ((settings && settings.blockedChannels) || []).forEach(function (b) {
      if (b && b.channelId) blockedSet[b.channelId] = true;
    });
    var trustedSet = buildTrustedChannelSet(settings);
    var isTrusted = !!(v.channelId && trustedSet[v.channelId]);
    if (v.channelId && blockedSet[v.channelId]) {
      cbScore += 35;
      reasons.push("Muted channel");
    } else if (isTrusted) {
      cbScore -= 18;
      valueBonus += 15;
      reasons.push("Trusted channel");
    }

    // --- LAYER 3: Title-vs-description coherence ---
    if (typeof v.description === "string" && isLatin) {
      var descLower = desc.toLowerCase();
      var genericPatterns = DATA.genericDescriptionPatterns || [];
      var isGenericOnly = desc.length > 0 && desc.length < 120 &&
        genericPatterns.some(function (p) { return descLower.indexOf(p) !== -1; }) &&
        descLower.replace(/https?:\/\/\S+/g, "").trim().length < 60;

      if ((!desc || isGenericOnly) && (hypeHits > 0 || cbScore >= 18)) {
        cbScore += 9;
        reasons.push("Empty or promotional-only description");
      } else if (desc.length >= 60) {
        var descBlob = descLower + " " + tags.join(" ").toLowerCase();
        var titleTokens = titleLower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) {
          return w.length >= 4 && !COHERENCE_STOP[w];
        });
        var overlap = 0;
        titleTokens.forEach(function (tok) {
          if (descBlob.indexOf(tok) !== -1) overlap++;
        });
        if (titleTokens.length >= 3 && overlap >= 2) {
          valueBonus += 7;
          cbScore -= 4;
        } else if (titleTokens.length >= 4 && overlap === 0 && hypeHits > 0 && !v.isRssStarter) {
          cbScore += 8;
          reasons.push("Title promises not reflected in description");
        }
      }
    }

    // --- LAYER 4: User feedback loop (local learned adjustments) ---
    if (learned) {
      var chLearn = v.channelId && learned.channels && learned.channels[v.channelId];
      if (chLearn && typeof chLearn.delta === "number" && chLearn.delta !== 0) {
        var chDelta = clamp(chLearn.delta, -25, 35);
        cbScore += chDelta;
        if (chDelta > 0) reasons.push("Learned negative channel feedback");
        else reasons.push("Learned positive channel feedback");
      }
      if (learned.phrases) {
        var phraseDeltaSum = 0;
        Object.keys(learned.phrases).forEach(function (ph) {
          if (titleLower.indexOf(ph) !== -1) {
            phraseDeltaSum += Number(learned.phrases[ph].delta) || 0;
          }
        });
        if (phraseDeltaSum !== 0) {
          var pDelta = clamp(phraseDeltaSum, -15, 25);
          cbScore += pDelta;
          if (pDelta > 0) reasons.push("Learned negative phrase feedback");
          else reasons.push("Learned positive phrase feedback");
        }
      }
    }

    var finalClickbait = clamp(Math.round(cbScore), 0, 100);
    var finalValue = clamp(Math.round(80 - finalClickbait * 0.75 + valueBonus * 0.6), 0, 100);

    var verdict = "good";
    if (finalClickbait >= thresholds.rejectAt) {
      verdict = isTrusted ? "borderline" : "clickbait";
    } else if (finalClickbait >= thresholds.borderlineAt) {
      verdict = "borderline";
    }

    if (!reasons.length) {
      reasons.push(verdict === "good" ? "Clean title & no hype signals" : "Mild clickbait cues");
    }

    return {
      clickbaitScore: finalClickbait,
      valueScore: finalValue,
      verdict: verdict,
      reasons: reasons.slice(0, 4),
      matchedPhrases: matchedPhrases
    };
  }

  /**
   * Optional Layer 5: LLM judge for borderline videos ONLY.
   * Requires user-supplied API key, runtime host permission, and daily call cap.
   */
  function assessWithLlm(video, cbSettings) {
    var llm = (cbSettings && cbSettings.llm) || {};
    if (!llm.enabled || !llm.apiKey || !video || !video.videoId) {
      return Promise.resolve(null);
    }
    var payload = {
      model: llm.model || "gpt-4o-mini",
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: "Classify if a YouTube video is clickbait/low-value or genuinely educational/valuable. Reply strictly as JSON: {\"verdict\":\"good\"|\"borderline\"|\"clickbait\",\"reason\":\"short reason\"}."
        },
        {
          role: "user",
          content: JSON.stringify({
            title: String(video.title || "").slice(0, 180),
            channel: String(video.channelTitle || "").slice(0, 80),
            duration: video.durationLabel || video.duration || "unknown",
            descriptionExcerpt: String(video.description || "").slice(0, 250)
          })
        }
      ]
    };

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + llm.apiKey
      },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error("LLM HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!text) return null;
        var jsonMatch = String(text).match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        var parsed = JSON.parse(jsonMatch[0]);
        if (parsed.verdict !== "good" && parsed.verdict !== "borderline" && parsed.verdict !== "clickbait") {
          return null;
        }
        return {
          verdict: parsed.verdict,
          reason: parsed.reason ? String(parsed.reason).slice(0, 80) : "LLM judge"
        };
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  return {
    assessClickbait: assessClickbait,
    assessWithLlm: assessWithLlm,
    extractFeedbackTokens: extractFeedbackTokens
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFeedClickbait;
}
