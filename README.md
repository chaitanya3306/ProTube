# YT Focus Feed — Productive YouTube

A privacy-first Manifest V3 Chrome extension that transforms YouTube into an intentional learning and research workspace.

It works **out of the box with zero setup** (using official YouTube channel RSS feeds) and optionally unlocks full cross-YouTube topic discovery with your own free **YouTube Data API v3** key.

---

## Why it's better than standard distraction blockers

Traditional extensions like Unhook or DF Tube hide the homepage, leaving an empty screen. **YT Focus Feed** combines a full distraction shield with an intelligent, non-repeating feed of the best videos in your chosen domains:

1. **Works Immediately (Starter RSS Mode)**: No API key required on install. Curated high-signal educational channels match your enabled domains via official YouTube Atom feeds (`0` quota cost).
2. **Full Quality-Scored Discovery (Optional API Key)**:
   - Rotates across search strategies (`relevance`, `viewCount`, `rating`, `date`, and recent time windows) plus pagination so **every refresh surfaces fresh, top-quality videos — never the same 24 videos**.
   - Scores videos locally by domain relevance, view/like engagement ratio, substantive length, recency, and category, while filtering out Shorts and clickbait noise.
3. **Zen Mode (Focus Search)**: Switch the homepage to a blank, intentional search bar with 1 click whenever you want zero browsing.
4. **Watch-Page Distraction Shield**:
   - Hides the "Up Next" recommended sidebar, end-screen video walls, and live chat.
   - Collapses comments behind a 1-click **"Show comments"** button (keep access to timestamps and code links without doom-scrolling).
   - Optionally redirects `/shorts/...` URLs into the normal player.
5. **Calm UI & Feed Controls**:
   - Filter by domain chips, video length (`5–15m`, `15m+`, `45m+`), or your local **Saved Queue**.
   - Card hover actions: **+ Save**, **Hide** (not interested), and **Mute channel**.
   - Optional **Clean Titles** (normalizes ALL-CAPS clickbait), **Calm Thumbnails** (grayscale until hover), **Hide View Counts**, **25m Focus Session Timer**, and **Daily Mindful Watch-Time Tracker**.
6. **1-Click Starter Packs & JSON Backup**: Choose presets (*AI & Software Engineering*, *Science, Math & Deep Thinking*, *Founders, Product & Strategy*, *Strict Zen Study Mode*) and export/import configs in Settings.

---

## Installation

1. Open `chrome://extensions` in Chrome, enable **Developer mode**, and click **Load unpacked** → select the `yt-feed` folder.
2. Open `https://www.youtube.com/` — your **Starter Feed** works right away.
3. *(Optional)* Click the extension icon → **Settings & Presets** to choose a starter pack, customize topics/channels, or paste a free **YouTube Data API v3** key from Google Cloud Console.

---

## Privacy

- **Zero tracking, zero analytics, zero external servers.**
- All preferences, saved videos, watch-time stats, and seen-video history stay inside your browser's `chrome.storage`.
- Minimal permissions: only `storage` and host access to `youtube.com` and `googleapis.com`.
