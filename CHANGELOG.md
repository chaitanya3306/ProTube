# Changelog

All notable changes to ProTube (YT Focus Feed) are documented in this file.

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
