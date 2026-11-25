/**
 * Curated domain starter channels (for zero-key official YouTube RSS feeds)
 * and one-click productivity preset packs for the Settings page.
 */
var YTFeedPresets = (function () {
  "use strict";

  var STARTER_CHANNELS_BY_TOPIC = {
    ai: [
      { channelId: "UCbfYPyITQ-7l4upoX8nvctg", title: "Two Minute Papers" },
      { channelId: "UCXUPKJO5MZQN11PqgIvyuvQ", title: "Andrej Karpathy" },
      { channelId: "UCYO_jab_esuFRV4b17AJtAw", title: "3Blue1Brown" }
    ],
    ml: [
      { channelId: "UCXUPKJO5MZQN11PqgIvyuvQ", title: "Andrej Karpathy" },
      { channelId: "UCYO_jab_esuFRV4b17AJtAw", title: "3Blue1Brown" },
      { channelId: "UCbaMts_bx6kU23XG1xK398A", title: "Stanford Online" }
    ],
    programming: [
      { channelId: "UCsBjURrPoezykLs9EqgamOA", title: "Fireship" },
      { channelId: "UC9-y-6csu5WGm29I7JiwpnA", title: "Computerphile" }
    ],
    swe: [
      { channelId: "UC9-y-6csu5WGm29I7JiwpnA", title: "Computerphile" },
      { channelId: "UCsBjURrPoezykLs9EqgamOA", title: "Fireship" },
      { channelId: "UCEBb1b_L6zDS3xTUrIALZOw", title: "MIT OpenCourseWare" }
    ],
    science: [
      { channelId: "UCHnyfMqiRRG1u-2MsSQLbXA", title: "Veritasium" },
      { channelId: "UCsXVk37bltHxD1rDPwtNM8Q", title: "Kurzgesagt – In a Nutshell" },
      { channelId: "UCEBb1b_L6zDS3xTUrIALZOw", title: "MIT OpenCourseWare" }
    ],
    neuroscience: [
      { channelId: "UC2D2CMWXMOVWx7giW1n3LIg", title: "Andrew Huberman" }
    ],
    psychology: [
      { channelId: "UC2D2CMWXMOVWx7giW1n3LIg", title: "Andrew Huberman" },
      { channelId: "UCsXVk37bltHxD1rDPwtNM8Q", title: "Kurzgesagt – In a Nutshell" }
    ],
    startups: [
      { channelId: "UCcefcZRL2oaA_uBNeo5UOWg", title: "Y Combinator" }
    ],
    philosophy: [
      { channelId: "UCsXVk37bltHxD1rDPwtNM8Q", title: "Kurzgesagt – In a Nutshell" },
      { channelId: "UCEBb1b_L6zDS3xTUrIALZOw", title: "MIT OpenCourseWare" }
    ],
    productivity: [
      { channelId: "UC2D2CMWXMOVWx7giW1n3LIg", title: "Andrew Huberman" },
      { channelId: "UCcefcZRL2oaA_uBNeo5UOWg", title: "Y Combinator" }
    ]
  };

  var FALLBACK_STARTER_CHANNELS = [
    { channelId: "UCYO_jab_esuFRV4b17AJtAw", title: "3Blue1Brown", topicId: "ai", topicName: "Artificial Intelligence" },
    { channelId: "UCXUPKJO5MZQN11PqgIvyuvQ", title: "Andrej Karpathy", topicId: "ml", topicName: "Machine Learning" },
    { channelId: "UCsBjURrPoezykLs9EqgamOA", title: "Fireship", topicId: "programming", topicName: "Programming" },
    { channelId: "UC9-y-6csu5WGm29I7JiwpnA", title: "Computerphile", topicId: "swe", topicName: "Software Engineering" },
    { channelId: "UCHnyfMqiRRG1u-2MsSQLbXA", title: "Veritasium", topicId: "science", topicName: "Science" },
    { channelId: "UCcefcZRL2oaA_uBNeo5UOWg", title: "Y Combinator", topicId: "startups", topicName: "Startups" }
  ];

  var PRESET_PACKS = [
    {
      id: "ai-eng",
      name: "AI & Software Engineering",
      description: "LLMs, systems architecture, CS lectures, and deep engineering tutorials.",
      homeMode: "feed",
      topics: [
        { id: "ai", name: "Artificial Intelligence", query: "artificial intelligence explained", score: 42, enabled: true },
        { id: "ml", name: "Machine Learning", query: "machine learning deep dive", score: 40, enabled: true },
        { id: "swe", name: "Software Engineering", query: "software architecture systems design", score: 34, enabled: true },
        { id: "programming", name: "Programming", query: "programming tutorial advanced", score: 30, enabled: true },
        { id: "startups", name: "Startups", query: "startup engineering founder", score: 20, enabled: true }
      ]
    },
    {
      id: "science-think",
      name: "Science, Math & Deep Thinking",
      description: "Physics, math intuition, neuroscience, philosophy, and documentaries.",
      homeMode: "feed",
      topics: [
        { id: "science", name: "Science", query: "science documentary explained", score: 38, enabled: true },
        { id: "math", name: "Mathematics", query: "mathematics visualized lecture", score: 36, enabled: true },
        { id: "neuroscience", name: "Neuroscience", query: "neuroscience research lecture", score: 32, enabled: true },
        { id: "philosophy", name: "Philosophy", query: "philosophy lecture deep dive", score: 28, enabled: true },
        { id: "psychology", name: "Psychology", query: "cognitive psychology explained", score: 26, enabled: true }
      ]
    },
    {
      id: "founders",
      name: "Founders, Product & Strategy",
      description: "Startup building, product craft, economics, and founder interviews.",
      homeMode: "feed",
      topics: [
        { id: "startups", name: "Startups", query: "startup founder lessons", score: 40, enabled: true },
        { id: "product", name: "Product Design", query: "product management design systems", score: 34, enabled: true },
        { id: "economics", name: "Economics & Business", query: "business strategy case study", score: 28, enabled: true },
        { id: "productivity", name: "Deep Work", query: "deep work productivity systems", score: 26, enabled: true }
      ]
    },
    {
      id: "zen-study",
      name: "Strict Zen Study Mode",
      description: "Blank intentional homepage + search only, hidden sidebar, collapsed comments.",
      homeMode: "zen",
      topics: [
        { id: "study", name: "University Lectures", query: "university lecture course", score: 35, enabled: true }
      ]
    }
  ];

  function starterSourcesForTopics(topics) {
    var seenChannel = {};
    var sources = [];
    (topics || []).forEach(function (topic) {
      if (!topic || topic.enabled === false) return;
      var matches = STARTER_CHANNELS_BY_TOPIC[topic.id] || [];
      matches.forEach(function (ch) {
        if (seenChannel[ch.channelId]) return;
        seenChannel[ch.channelId] = true;
        sources.push({
          id: topic.id,
          name: topic.name || ch.title,
          query: topic.query || topic.name || "",
          score: typeof topic.score === "number" ? topic.score : 25,
          kind: "rss",
          channelId: ch.channelId,
          channelTitle: ch.title
        });
      });
    });
    if (!sources.length) {
      FALLBACK_STARTER_CHANNELS.forEach(function (ch) {
        sources.push({
          id: ch.topicId,
          name: ch.topicName,
          query: ch.topicName,
          score: 30,
          kind: "rss",
          channelId: ch.channelId,
          channelTitle: ch.title
        });
      });
    }
    return sources;
  }

  return {
    STARTER_CHANNELS_BY_TOPIC: STARTER_CHANNELS_BY_TOPIC,
    FALLBACK_STARTER_CHANNELS: FALLBACK_STARTER_CHANNELS,
    PRESET_PACKS: PRESET_PACKS,
    starterSourcesForTopics: starterSourcesForTopics
  };
})();
