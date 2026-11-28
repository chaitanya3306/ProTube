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

  var DEFAULT_CLICKBAIT = {
    enabled: true,
    sensitivity: "balanced", // "strict" | "balanced" | "lenient"
    showBadge: true,
    showReasons: true,
    trustStarterChannels: true,
    trustedChannels: [],
    llm: {
      enabled: false,
      apiKey: "",
      model: "gpt-4o-mini",
      dailyCap: 20
    }
  };

  var CLICKBAIT_DATA = {
    sensitivityThresholds: {
      strict: { rejectAt: 42, borderlineAt: 22 },
      balanced: { rejectAt: 58, borderlineAt: 32 },
      lenient: { rejectAt: 74, borderlineAt: 45 }
    },
    acronymWhitelist: [
      "AI", "ML", "LLM", "LLMS", "GPT", "API", "APIS", "SQL", "NOSQL", "CPU", "GPU", "TPU",
      "AWS", "GCP", "MIT", "NASA", "ESA", "CERN", "HTML", "CSS", "JS", "TS", "HTTP", "HTTPS",
      "REST", "JSON", "XML", "YAML", "CLI", "SDK", "IDE", "OS", "UI", "UX", "DB", "ORM",
      "CI", "CD", "USA", "UK", "EU", "STEM", "DNA", "RNA", "CRISPR", "MRI", "EEG", "RTX",
      "AMD", "ARM", "RISC", "FPGA", "ASIC", "RAG", "RLHF", "NLP", "CNN", "RNN", "GAN", "VAE",
      "CUDA", "SIMD", "LLVM", "WASM", "POSIX", "TCP", "UDP", "DNS", "TLS", "SSL", "SSH",
      "JWT", "OAUTH", "CORS", "CRUD", "ACID", "CAP", "SOLID", "MVC", "MVVM", "MVP", "SAAS",
      "B2B", "B2C", "IPO", "YC", "VC", "ROI", "KPI", "OKR", "ADHD", "REM", "CBT", "PHD",
      "CS", "EE", "DIY", "VS", "TV", "HD", "FPS", "VR", "AR", "XR", "FAQ", "CNN", "IBM",
      "UNIX", "LINUX", "POSIX", "DOCKER", "K8S", "GIT", "CI/CD", "RAM", "ROM", "SSD", "NVME",
      "PCI", "PCIE", "USB", "BIOS", "UEFI", "GRPC", "RPC", "MQTT", "WEBGL", "WASM", "II", "III", "IV"
    ],
    hypePhrases: [
      { phrase: "you won't believe", weight: 22, label: "curiosity-gap" },
      { phrase: "you wont believe", weight: 22, label: "curiosity-gap" },
      { phrase: "not clickbait", weight: 22, label: "clickbait-denial" },
      { phrase: "gone wrong", weight: 20, label: "sensational" },
      { phrase: "gone sexual", weight: 25, label: "sensational" },
      { phrase: "doctors hate", weight: 24, label: "spam-hook" },
      { phrase: "they don't want you to know", weight: 22, label: "conspiracy-hook" },
      { phrase: "they dont want you to know", weight: 22, label: "conspiracy-hook" },
      { phrase: "nobody tells you", weight: 16, label: "curiosity-gap" },
      { phrase: "nobody is talking about", weight: 15, label: "curiosity-gap" },
      { phrase: "what they aren't telling you", weight: 20, label: "conspiracy-hook" },
      { phrase: "changed my life forever", weight: 18, label: "exaggeration" },
      { phrase: "watch before it's deleted", weight: 24, label: "urgency-bait" },
      { phrase: "watch before it gets deleted", weight: 24, label: "urgency-bait" },
      { phrase: "the brutal truth", weight: 15, label: "exaggeration" },
      { phrase: "the dark side of", weight: 13, label: "sensational" },
      { phrase: "this changes everything", weight: 16, label: "hype" },
      { phrase: "changed everything", weight: 13, label: "hype" },
      { phrase: "you're doing it wrong", weight: 15, label: "fear-bait" },
      { phrase: "youre doing it wrong", weight: 15, label: "fear-bait" },
      { phrase: "stop doing this", weight: 16, label: "fear-bait" },
      { phrase: "never do this", weight: 16, label: "fear-bait" },
      { phrase: "biggest mistake", weight: 13, label: "fear-bait" },
      { phrase: "shocking", weight: 16, label: "hype" },
      { phrase: "mind-blowing", weight: 14, label: "hype" },
      { phrase: "mind blowing", weight: 14, label: "hype" },
      { phrase: "unbelievable", weight: 15, label: "hype" },
      { phrase: "insane", weight: 13, label: "hype" },
      { phrase: "insanely", weight: 11, label: "hype" },
      { phrase: "exposed", weight: 16, label: "drama-bait" },
      { phrase: "ruined everything", weight: 16, label: "drama-bait" },
      { phrase: "is dead", weight: 14, label: "doom-bait" },
      { phrase: "is over", weight: 12, label: "doom-bait" },
      { phrase: "terrifying", weight: 14, label: "fear-bait" },
      { phrase: "secretly", weight: 12, label: "curiosity-gap" },
      { phrase: "the secret", weight: 11, label: "curiosity-gap" },
      { phrase: "secrets", weight: 10, label: "curiosity-gap" },
      { phrase: "100% guaranteed", weight: 18, label: "spam-hook" },
      { phrase: "get rich", weight: 20, label: "spam-hook" },
      { phrase: "make $", weight: 18, label: "spam-hook" },
      { phrase: "overnight", weight: 12, label: "exaggeration" },
      { phrase: "wait till the end", weight: 18, label: "retention-bait" },
      { phrase: "wait until the end", weight: 18, label: "retention-bait" },
      { phrase: "watch till the end", weight: 18, label: "retention-bait" },
      { phrase: "what happened next", weight: 20, label: "curiosity-gap" },
      { phrase: "must watch", weight: 14, label: "urgency-bait" },
      { phrase: "you need to see this", weight: 16, label: "curiosity-gap" },
      { phrase: "destroyed", weight: 11, label: "sensational" }
    ],
    vagueHooks: [
      { pattern: "\\b(he|she|they|i)\\s+(did|tried|found|said)\\s+this\\b", weight: 16, label: "vague-pronoun-hook" },
      { pattern: "\\bthis\\s+(one|simple|weird)\\s+(trick|hack|secret)\\b", weight: 18, label: "vague-trick-hook" },
      { pattern: "\\bwhy\\s+everyone\\s+is\\b", weight: 10, label: "bandwagon-hook" },
      { pattern: "\\bthe\\s+truth\\s+about\\b", weight: 12, label: "curiosity-gap" },
      { pattern: "\\bwill\\s+shock\\s+you\\b", weight: 20, label: "curiosity-gap" }
    ],
    valueSignals: [
      { phrase: "from scratch", weight: 16, label: "hands-on" },
      { phrase: "step by step", weight: 14, label: "structured" },
      { phrase: "paper review", weight: 16, label: "research" },
      { phrase: "implementation", weight: 14, label: "technical" },
      { phrase: "walkthrough", weight: 12, label: "structured" },
      { phrase: "explained", weight: 11, label: "educational" },
      { phrase: "tutorial", weight: 13, label: "educational" },
      { phrase: "lecture", weight: 16, label: "academic" },
      { phrase: "course", weight: 14, label: "structured" },
      { phrase: "deep dive", weight: 13, label: "in-depth" },
      { phrase: "under the hood", weight: 14, label: "technical" },
      { phrase: "internals", weight: 13, label: "technical" },
      { phrase: "architecture", weight: 12, label: "technical" },
      { phrase: "fundamentals", weight: 13, label: "educational" },
      { phrase: "benchmark", weight: 11, label: "empirical" },
      { phrase: "benchmarks", weight: 11, label: "empirical" },
      { phrase: "case study", weight: 12, label: "analytical" },
      { phrase: "documentary", weight: 13, label: "in-depth" },
      { phrase: "analysis", weight: 10, label: "analytical" },
      { phrase: "research", weight: 11, label: "research" },
      { phrase: "intuition", weight: 12, label: "educational" },
      { phrase: "theorem", weight: 14, label: "academic" },
      { phrase: "proof", weight: 10, label: "academic" },
      { phrase: "postmortem", weight: 13, label: "engineering" },
      { phrase: "stanford", weight: 14, label: "academic" },
      { phrase: "mit ", weight: 12, label: "academic" },
      { phrase: "berkeley", weight: 12, label: "academic" },
      { phrase: "keynote", weight: 10, label: "conference" },
      { phrase: "how it works", weight: 11, label: "educational" },
      { phrase: "live coding", weight: 13, label: "hands-on" }
    ],
    genericDescriptionPatterns: [
      "subscribe",
      "follow me",
      "like and subscribe",
      "patreon",
      "merch",
      "sponsor"
    ]
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
  var LEARNED_KEY = "ytCustomFeedLearned";
  var CLICKBAIT_CACHE_KEY = "ytCustomFeedClickbaitCache";
  var LLM_CACHE_KEY = "ytCustomFeedLlmCache";
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
    FEEDBACK_VIDEO: "FEEDBACK_VIDEO",
    GET_LEARNED: "GET_LEARNED",
    RESET_LEARNED: "RESET_LEARNED",
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
      clickbait: {
        enabled: DEFAULT_CLICKBAIT.enabled,
        sensitivity: DEFAULT_CLICKBAIT.sensitivity,
        showBadge: DEFAULT_CLICKBAIT.showBadge,
        showReasons: DEFAULT_CLICKBAIT.showReasons,
        trustStarterChannels: DEFAULT_CLICKBAIT.trustStarterChannels,
        trustedChannels: [],
        llm: Object.assign({}, DEFAULT_CLICKBAIT.llm)
      },
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
    DEFAULT_CLICKBAIT: DEFAULT_CLICKBAIT,
    CLICKBAIT_DATA: CLICKBAIT_DATA,
    KEYWORD_SETS: KEYWORD_SETS,
    CACHE_KEY: CACHE_KEY,
    POOL_KEY: POOL_KEY,
    HISTORY_KEY: HISTORY_KEY,
    SAVED_KEY: SAVED_KEY,
    STATS_KEY: STATS_KEY,
    SETTINGS_KEY: SETTINGS_KEY,
    LEARNED_KEY: LEARNED_KEY,
    CLICKBAIT_CACHE_KEY: CLICKBAIT_CACHE_KEY,
    LLM_CACHE_KEY: LLM_CACHE_KEY,
    MESSAGE: MESSAGE,
    defaultSettings: defaultSettings
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFeedConstants;
}
