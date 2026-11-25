# Privacy Policy — YT Focus Feed (ProTube)

Last updated: 2026-11-25

**YT Focus Feed (ProTube)** is a local-first, privacy-respecting Chrome extension.

## Data Collection
- **We do not collect, store, transmit, or sell any personal data.**
- We have no backend servers, no analytics, no telemetry, and no third-party tracking scripts.

## Local Storage
All settings, topic/channel preferences, saved video queues, muted channels, seen-video history, and daily watch-time counters are stored strictly inside your browser using `chrome.storage.sync` and `chrome.storage.local`.

## Network Requests
The extension only communicates directly from your browser with:
1. **YouTube (`youtube.com`)**: To fetch public Atom RSS feeds (`https://www.youtube.com/feeds/videos.xml?channel_id=...`) for Starter Mode and custom channels.
2. **Google YouTube Data API v3 (`googleapis.com`)**: Only when you voluntarily provide your own YouTube Data API v3 key in Settings, used solely to search public video metadata.

## Contact
For questions or issues, please open an issue in this GitHub repository.
