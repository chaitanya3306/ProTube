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
   git clone https://github.com/chaitanya3306/ProTube.git
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

## Public distribution

The project is prepared for Chromium-based browsers. The repository includes a validation script and a reproducible store-package ZIP builder:

```bash
python scripts/validate_extension.py
python scripts/package_extension.py
```

The package is written to `dist/` and contains the runtime files only. GitHub Actions runs manifest checks, JavaScript syntax checks, and package creation on pushes and pull requests. A successful run exposes the ZIP as a downloadable workflow artifact.

For Microsoft Edge Add-ons, register a free developer account in Microsoft Partner Center, create a new extension, and upload the generated ZIP. Complete the privacy disclosures, store listing, screenshots, and certification notes before submitting. See the official [Edge publishing guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

For Chrome Web Store publication, a Chrome Web Store developer account and its one-time registration fee are still required. GitHub Releases and developer-mode installation are alternatives for testing, but are not equivalent to a one-click public Chrome Web Store installation.

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
    ├── clickbait.js     # 5-layer Clickbait & Value Detection engine
    ├── scoring.js       # Quality/relevance scoring, calm titles, batch rotation
    ├── background.js    # MV3 service worker (pool rotation, history, actions)
    ├── content.js       # Home overlay, card actions, watch shield & timer
    ├── options.js       # Options UI logic, quota estimator, backup import/export
    └── popup.js         # Popup quick toggles & live status
```

All JavaScript is dependency-free vanilla JS—no bundler, no build step required.

---

## Clickbait & Value Detection

ProTube includes a deterministic, local-first **Clickbait & Value Detection** layer (`js/clickbait.js`) that runs in `< 1 ms` per video and fails open when unsure:

1. **Layer 1 — Title Heuristics**: Checks ALL-CAPS word ratio (excluding an acronym whitelist and your domain keywords), excessive punctuation/emoji spam, curiosity-gap/hype phrases, vague pronoun hooks, and lightweight number-bait—while subtracting penalties for substantive signals (`explained`, `from scratch`, `lecture`, `paper review`, chapter timestamps).
2. **Layer 2 — Metadata Signals**: Uses available engagement ratios (like/view, comment/view, high-velocity spikes with weak engagement, RSS `starRating`, duration sanity) without penalizing missing fields in RSS mode. Trusted channels get a value bonus and skip hard rejection.
3. **Layer 3 — Title-vs-Description Coherence**: Lightly penalizes hype-heavy titles with empty or promotional-only descriptions.
4. **Layer 4 — Local Feedback Loop**: Use the **Good** / **Clickbait** buttons on any video card to nudge future channel and phrase weights in `chrome.storage.local` (exportable/importable and resettable in Settings).
5. **Layer 5 — Optional AI Judge (Off by default)**: Can be enabled in Settings with your own OpenAI API key and runtime permission for `api.openai.com` to classify only borderline videos under a strict daily call cap.

### Tuning & Testing

- All phrase lists, acronym whitelists, and sensitivity thresholds (`strict`, `balanced`, `lenient`) live as plain data in `CLICKBAIT_DATA` inside [js/constants.js](js/constants.js).
- Run the automated test suite and extension validator locally:

```bash
node tests/clickbait.test.js
python scripts/validate_extension.py
```

### Known Limitations

- In Starter (RSS) mode, YouTube Atom feeds do not include video duration or comment counts, so duration-based and comment-ratio heuristics are skipped (failing open).
- Transcripts are not fetched in v1 to avoid unstable undocumented endpoints and extra host permissions.
- Non-Latin titles skip English-specific ALL-CAPS and coherence heuristics so valuable non-English content is not falsely rejected.

---

## Privacy

- **Zero tracking, zero analytics, zero external backend servers.**
- Minimal permissions: only `storage` plus host access to `youtube.com` and `googleapis.com`.
- Read the full [Privacy Policy](PRIVACY.md).

---

## Contributing & License

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Licensed under the [MIT License](LICENSE).
