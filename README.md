# ProTube — Productive YouTube Focus Feed

> Turn YouTube from an endless dopamine slot machine into an intentional learning and research workspace.

**ProTube** (`YT Focus Feed`) is an open-source, privacy-first Manifest V3 Chrome extension that replaces YouTube's algorithmic homepage with a **quality-scored, non-repeating feed of your chosen domains**, paired with a **Zen Search Mode** and a full **Watch-Page Distraction Shield**.

---

## Why ProTube?

Most distraction blockers (like Unhook or DF Tube) simply wipe the homepage blank. ProTube goes further:

| Feature | Standard Blockers | ProTube |
| :--- | :---: | :---: |
| Hide Shorts, Trending, Watch Sidebar & End Screens | Yes | **Yes + `/shorts/` auto-redirect** |
| Collapse comments with 1-click reveal (for timestamps/links) | Some | **Yes** |
| Works out of the box with **zero API key** (Starter RSS Mode) | — | **Yes** |
| Replaces Home with a **scored feed of your domains** | No | **Yes** |
| **Non-repeating rotation** across refreshes (never the same 24 videos) | No | **Yes** |
| Built-in **Zen Mode** (search + saved queue only) | Separate tool | **1-click toggle** |
| Anti-clickbait **Calm UI** (normalize ALL-CAPS, mute thumbnails/views) | Separate extension | **Built-in** |
| Local **Watch Queue**, **Hide**, **Mute Channel**, & **25m Focus Timer** | No | **Built-in** |

---

## Key Features

### 1. Works Immediately (Starter RSS Mode) + Optional Full API Mode
- **Starter Mode (0 setup)**: Pulls recent uploads from curated high-signal educational channels matching your domains via official YouTube Atom feeds (`0` quota cost, no API key needed).
- **Full YouTube Data API v3 Mode (Optional)**: Paste your free API key in Settings to unlock full cross-YouTube topic discovery:
  - Rotates search strategies (`relevance`, `viewCount`, `rating`, `date`, recent time windows, and pagination) so **every refresh delivers fresh, top-quality videos**.
  - Scores videos locally using domain keyword matching, view count, like-to-view engagement ratio, substantive duration, recency, and category—while filtering out Shorts and off-topic noise.

### 2. Full Distraction Shield (Home & Watch Pages)
- **Watch Sidebar Blocker**: Hides `#related` ("Up Next") recommendations while watching.
- **Comments Shield**: Collapses comments behind a **"Show comments (Distraction Shield)"** button so you still have 1-click access to timestamps and code links without falling into comment threads.
- **End-Screen & Live Chat Blocker**: Removes end-screen video walls and live chat clutter.
- **Shorts Blocker + Redirect**: Hides Shorts shelves/navigation and redirects `/shorts/<id>` straight to `/watch?v=<id>`.

### 3. Calm UI, Interactive Filtering & Focus Tools
- **Domain Filter Chips & Duration Filter** (`5–15 min`, `15m+`, `45m+`) right on the homepage.
- **Card Hover Actions**: `+ Save` to your local Watch Queue, `Hide` (not interested), or `Mute` a channel permanently.
- **Calm UI Toggles**: Normalize shouting `ALL-CAPS` titles, desaturate flashy thumbnails (color on hover), or hide view counts.
- **Zen Mode & Focus Timer**: Switch to a minimalist `"What are you here to learn?"` screen, track daily YouTube watch time locally, and run 25-minute focus sessions from the toolbar popup.
- **Dark & Light Theme Support**: Automatically adapts to YouTube's active Dark or Light theme.

---

## Installation (Developer Mode)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/chaitanyashimpi/ProTube.git
   ```
   *(Or download the ZIP from Releases and extract it.)*
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `ProTube` folder.
5. Visit `https://www.youtube.com/` — **Starter Mode** works immediately!

### Optional: Enable Full Topic Discovery (60-Second API Key Setup)
1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable **YouTube Data API v3** under *APIs & Services → Library*.
3. Create an API key under *APIs & Services → Credentials*.
4. Open ProTube **Settings & Presets**, paste the key, and click **Save changes**.

---

## Project Architecture

```text
ProTube/
├── manifest.json        # Manifest V3 config, permissions, content scripts
├── popup.html           # Toolbar quick control center & 25m focus timer
├── options.html         # Settings, 1-click starter packs, JSON export/import
├── PRIVACY.md           # Privacy policy (100% local, zero telemetry)
├── CONTRIBUTING.md      # Local setup and PR guidelines
├── css/
│   ├── content.css      # YouTube Home overlay, Zen Mode, Watch Shield styles
│   ├── options.css      # Settings page styling
│   └── popup.css        # Popup styling
└── js/
    ├── constants.js     # Defaults, keyword sets, weights, message types
    ├── presets.js       # Curated starter channels & 1-click preset packs
    ├── storage.js       # chrome.storage.sync & chrome.storage.local wrappers
    ├── youtube-api.js   # YouTube Data API v3 + official Atom RSS XML parser
    ├── scoring.js       # Quality/relevance scoring, calm titles, batch rotation
    ├── background.js    # MV3 service worker (pool rotation, history, actions)
    ├── content.js       # Home overlay, card actions, watch shield & timer
    ├── options.js       # Options UI logic, quota estimator, backup import/export
    └── popup.js         # Popup quick toggles & live status
```

All JavaScript is dependency-free vanilla JS—no bundler, no build step required.

---

## Privacy

- **Zero tracking, zero analytics, zero external backend servers.**
- Minimal permissions: only `storage` plus host access to `youtube.com` and `googleapis.com`.
- Read the full [Privacy Policy](PRIVACY.md).

---

## Contributing & License

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Licensed under the [MIT License](LICENSE).
