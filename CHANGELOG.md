# Changelog

All notable changes to ProTube (YT Focus Feed) are documented in this file.

## [2.1.1] - 2026-11-28

### Improved
- **Clickbait detection recall**: the first release only caught extreme ALL-CAPS/`!!!` titles. A holdout test of realistic Title-Case clickbait found 0 of 15 flagged. Added typographic-apostrophe normalization, shouted-hype-word detection, ~40 more hook phrases and patterns, a combination bonus for multiple independent signals, and a larger acronym whitelist. Holdout result: 13/13 clickbait titles flagged (7 hard-rejected, 6 borderline) with 0 of 24 legitimate titles flagged.
- Added the holdout set to `tests/clickbait.test.js` as a permanent regression test.

### Added
- **Firefox build** (`scripts/package_firefox.py`) and **Release workflow** (`.github/workflows/release.yml`): tag `vX.Y.Z` to publish Chromium and Firefox ZIPs as a GitHub Release.
- `STORE_LISTING.md`: listing copy and permission justifications for Edge, Firefox and Opera submissions.

### Fixed
- `manifest.json` version now matches the changelog (2.1.x).
- `background.js` guards `importScripts` so the same file also runs as a Firefox event page.

## [2.1.0] - 2026-11-28

### Added
- **Clickbait & Value Detection (`js/clickbait.js`)**:
  - Layer 1 title heuristics (ALL-CAPS ratio with acronym & domain-term whitelist, punctuation/emoji spam, curiosity-gap phrases, vague pronoun hooks, number-bait, and positive educational/timestamp signals).
  - Layer 2 metadata signals (like/view, comment/view, velocity spikes, RSS `starRating`, duration sanity, muted & trusted channel priors) with graceful degradation in RSS mode.
  - Layer 3 title-vs-description coherence check.
  - Layer 4 local user feedback loop (**Good** / **Clickbait** card hover buttons, per-channel/phrase weights in `chrome.storage.local`, **Reset learned data**, and JSON export/import support).
  - Layer 5 optional, disabled-by-default AI Judge for borderline videos using runtime `optional_host_permissions` (`https://api.openai.com/*`) and a daily call cap.
- **UI & Controls**:
  - Card **Value** badge with rank/value reason tooltips (toggleable in Settings).
  - Sensitivity selector (`Strict` / `Balanced` / `Lenient`), Trusted Channels manager, and weekly filtered clickbait stats in Options.
  - Quick **Clickbait Filter** toggle in Popup.
  - Fail-open backfill in `scoring.js` so the feed never empties if candidates are scarce.
- **Testing & CI**:
  - Added dependency-free Node test suite (`tests/clickbait.test.js`) with 60 labeled fixtures + edge cases and integrated it into `.github/workflows/ci.yml`.

### Fixed
- `youtube-api.js`: Independent `average`/`count` parsing for `media:starRating`, safe JSON parsing, and `AbortController` timeouts.
- `content.js`: Live re-render on `calmUI` / `clickbait` display changes, `blockedChannels` / `clickbait` config change detection, and `try/catch` isolation per video card.
- `popup.js`: Route quick setting toggles through `SAVE_SETTINGS` so feed cache invalidates cleanly.
