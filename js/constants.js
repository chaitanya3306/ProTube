/**
 * Default configuration for YT Custom Home Feed.
 * Edit these defaults only as a fallback — live values live in chrome.storage
 * and are changed from the Settings page.
 */
var YTFeedConstants = (function () {
  "use strict";

  var DEFAULT_TOPICS = [
    { id: "ai", name: "Artificial Intelligence", query: "artificial intelligence explained", score: 40, enabled: true },
    { id: "ml", name: "Machine Learning", query: "machine learning tutorial", score: 38, enabled: true },
    { id: "programming", name: "Programming", query: "programming tutorial", score: 30, enabled: true },
    { id: "swe", name: "Software Engineering", query: "software engineering", score: 28, enabled: true },
    { id: "psychology", name: "Psychology", query: "psychology lecture", score: 22, enabled: true },
    { id: "neuroscience", name: "Neuroscience", query: "neuroscience explained", score: 24, enabled: true },
    { id: "productivity", name: "Productivity", query: "productivity systems", score: 18, enabled: true },
    { id: "philosophy", name: "Philosophy", query: "philosophy lecture", score: 20, enabled: true },
    { id: "science", name: "Science", query: "science documentary explained", score: 22, enabled: true },
    { id: "startups", name: "Startups", query: "startup founding engineering", score: 16, enabled: true }
  ];

  var DEFAULT_WEIGHTS = {
    aiRelated: 40,
    educational: 25,
    entertainment: -30,
    gaming: -50,
    celebrity: -25,
    sports: -25,
    shortsPenalty: -100,
    minScore: 0
  };

  var DEFAULT_HIDE = {
    shorts: true,
    trending: true,
    gaming: true,
    entertainment: true,
    celebrity: true,
    sports: true,
    watchSidebar: true,
    endScreens: true,
    collapseComments: true,
    liveChat: true,
    redirectShorts: true
  };

  var DEFAULT_CALM_UI = {
    cleanTitles: true,
    calmThumbnails: false,
    hideViewCounts: false
  };

  var KEYWORD_SETS = {
    aiRelated: [
      "artificial intelligence",
      "machine learning",
      "deep learning",
      "neural network",
      "transformer",
      "large language model",
      "llm",
      "gpt",
      "openai",
      "anthropic",
      "computer vision",
      "reinforcement learning",
      "nlp",
      "natural language",
      "diffusion model",
      "pytorch",
      "tensorflow",
      "mlops"
    ],
    educational: [
      "tutorial",
      "explained",
      "lecture",
      "course",
      "how to",
      "introduction",
      "crash course",
      "research",
      "paper",
      "walkthrough",
      "fundamentals",
      "learn",
      "documentary",
      "analysis",
      "deep dive"
    ],
    entertainment: [
      "funny",
      "comedy",
      "prank",
      "reaction",
      "reacts",
      "roast",
      "challenge",
      "vlog",
      "drama",
      "meme",
      "compilation",
      "try not to laugh"
    ],
    gaming: [
      "gameplay",
      "let's play",
      "lets play",
      "walkthrough playthrough",
      "fortnite",
      "minecraft",
      "valorant",
      "call of duty",
      "gta",
      "roblox",
      "esports",
      "speedrun",
      "twitch"
    ],
    celebrity: [
      "celebrity",
      "hollywood",
      "red carpet",
      "gossip",
      "interview celebrity",
      "kardashian",
      "tmz",
      "pop star",
      "box office"
    ],
    sports: [
      "highlights",
      "nba",
      "nfl",
      "mlb",
      "premier league",
      "soccer",
      "football match",
      "cricket",
      "tennis",
      "ufc",
      "boxing",
      "olympics"
    ]
  };

  var CACHE_KEY = "ytCustomFeedCache";
  var POOL_KEY = "ytCustomFeedPool";
  var HISTORY_KEY = "ytCustomFeedHistory";
  var SAVED_KEY = "ytCustomFeedSaved";
  var STATS_KEY = "ytCustomFeedStats";
  var SETTINGS_KEY = "ytCustomFeedSettings";
  var MESSAGE = {
    GET_FEED: "GET_FEED",
    REFRESH_FEED: "REFRESH_FEED",
    LOAD_MORE: "LOAD_MORE",
    GET_SETTINGS: "GET_SETTINGS",
    SAVE_SETTINGS: "SAVE_SETTINGS",
    SEARCH_CHANNEL: "SEARCH_CHANNEL",
    GET_SAVED: "GET_SAVED",
    TOGGLE_SAVE_VIDEO: "TOGGLE_SAVE_VIDEO",
    DISMISS_VIDEO: "DISMISS_VIDEO",
    BLOCK_CHANNEL: "BLOCK_CHANNEL",
    UNBLOCK_CHANNEL: "UNBLOCK_CHANNEL",
    SET_HOME_MODE: "SET_HOME_MODE",
    GET_STATS: "GET_STATS",
    ADD_WATCH_TIME: "ADD_WATCH_TIME",
    START_FOCUS_TIMER: "START_FOCUS_TIMER",
    STOP_FOCUS_TIMER: "STOP_FOCUS_TIMER",
    PING: "PING"
  };

  function defaultSettings() {
    return {
      apiKey: "",
      homeMode: "feed",
      topics: DEFAULT_TOPICS.map(function (t) {
        return Object.assign({}, t);
      }),
      channels: [],
      blockedChannels: [],
      weights: Object.assign({}, DEFAULT_WEIGHTS),
      hideNative: Object.assign({}, DEFAULT_HIDE),
      calmUI: Object.assign({}, DEFAULT_CALM_UI),
      dailyGoalMinutes: 0,
      maxPerSection: 50,
      maxPerSource: 50,
      cacheMinutes: 30,
      regionCode: "US",
      relevanceLanguage: "en"
    };
  }

  return {
    DEFAULT_TOPICS: DEFAULT_TOPICS,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    DEFAULT_HIDE: DEFAULT_HIDE,
    DEFAULT_CALM_UI: DEFAULT_CALM_UI,
    KEYWORD_SETS: KEYWORD_SETS,
    CACHE_KEY: CACHE_KEY,
    POOL_KEY: POOL_KEY,
    HISTORY_KEY: HISTORY_KEY,
    SAVED_KEY: SAVED_KEY,
    STATS_KEY: STATS_KEY,
    SETTINGS_KEY: SETTINGS_KEY,
    MESSAGE: MESSAGE,
    defaultSettings: defaultSettings
  };
})();
