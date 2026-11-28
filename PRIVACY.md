# Privacy Policy: ProTube

Last updated: 2026-11-25

ProTube is a browser extension that changes how YouTube is presented in your browser. It does not operate a ProTube backend, account system, analytics service, or advertising tracker.

## Information stored on your device

ProTube stores extension preferences, selected topics and channels, muted channels, trusted channels, saved video identifiers, feed/cache data, seen-video history, clickbait assessment caches, local feedback adjustments (channel/phrase weights), focus timer state, and watch-time counters in the browser's extension storage (`chrome.storage.sync` and `chrome.storage.local`). Synced settings may be synchronized by the browser vendor according to the user's browser account and sync settings. You can reset learned clickbait feedback at any time in Settings.

## Network requests and information sent to third parties

ProTube makes requests directly from your browser:

- **YouTube Atom feeds:** In Starter/RSS mode, ProTube requests public channel feed URLs. The channel identifier is included in the request URL.
- **YouTube Data API v3:** If you enter your own Google API key, ProTube sends that key and the search parameters configured in the extension (such as topic query, region, language, and channel identifiers) to Google's YouTube Data API. Google's handling of those requests is governed by Google's terms and privacy policy.
- **Video thumbnails:** The extension may display thumbnail images hosted by YouTube image domains.
- **Optional AI Judge (disabled by default):** Only if you explicitly enable the AI Judge in Settings, grant runtime host permission for `api.openai.com`, and supply your own OpenAI API key, ProTube sends only the video title, channel name, duration, and a 250-character description excerpt for borderline videos to OpenAI. Results are cached locally and capped by your daily call limit.

ProTube does not send this information to a server operated by the developer. The developer does not receive a copy of your settings, search history, saved queue, or watch-time counters through ProTube.

## API keys

The YouTube Data API key is optional and is stored in the browser's extension settings. Use a key restricted in Google Cloud Console to the YouTube Data API where applicable. Do not reuse a key that grants access to unrelated Google Cloud services.

## Data sharing, sale, and tracking

The extension contains no developer-operated analytics, advertising, or telemetry integration. The developer does not sell user data. Requests to YouTube and Google are necessary for the features described above and are subject to those providers' own policies.

## Children's privacy

ProTube is a general-purpose productivity extension and is not designed specifically for children.

## Changes and contact

This policy may be updated when the extension's behavior changes. For privacy questions or security reports, open an issue in the ProTube GitHub repository.
