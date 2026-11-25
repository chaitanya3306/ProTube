# Contributing to ProTube (YT Focus Feed)

Thank you for your interest in contributing to **ProTube**! All JavaScript in this project is dependency-free vanilla JS (Manifest V3), making it quick to hack on and test locally.

## Local Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/ProTube.git
   cd ProTube
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the cloned `ProTube` folder.
5. After making edits to `js/` or `css/`, click the **Reload** icon on the extension card at `chrome://extensions` and refresh `https://www.youtube.com/`.

## Project Layout

| Path | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3 extension definition |
| `js/constants.js` | Default topics, keyword dictionaries, weights, storage keys, message types |
| `js/presets.js` | Curated starter RSS channels and 1-click preset packs |
| `js/storage.js` | `chrome.storage.sync` (settings) & `chrome.storage.local` (pool, cache, saved queue, stats) |
| `js/youtube-api.js` | YouTube Data API v3 client + zero-key official Atom RSS parser |
| `js/scoring.js` | Quality scoring, domain matching, Shorts detection, calm titles, batch selection |
| `js/background.js` | MV3 service worker orchestrating dual-mode fetching, strategy rotation, and state |
| `js/content.js` | Homepage replacement, Zen Mode, card actions, and watch-page distraction shield |
| `js/options.js` / `options.html` | Settings, starter packs, quota estimator, JSON export/import |
| `js/popup.js` / `popup.html` | Toolbar popup quick controls and focus session timer |

## Guidelines for Pull Requests

- Keep changes vanilla JS / HTML / CSS with **zero external runtime dependencies** or tracking scripts.
- Preserve minimal Chrome permissions (`storage` and `youtube.com` / `googleapis.com` hosts only).
- Test both **Starter RSS Mode** (empty API key) and **API Mode** (with a key), as well as Dark & Light YouTube themes.
- Keep PRs focused and include a short summary of what changed and why.

## Reporting Bugs & Feature Requests

Please open a GitHub Issue with:
- Chrome version and OS
- Steps to reproduce
- Any console errors from the YouTube page DevTools or the extension's Service Worker inspector (`chrome://extensions` → Inspect views: service worker)
