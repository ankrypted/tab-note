# Tab Note

A browser extension (Chrome / Edge, Manifest V3) for quick notes tied to the page you are on. Notes are stored locally and never leave your device.

- Requirements: [docs/functional-requirements.md](docs/functional-requirements.md), [docs/non-functional-requirements.md](docs/non-functional-requirements.md)

## Try it

1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and choose the [src/](src/) folder.
3. Open any web page and click the Tab Note icon, or press `Alt+N`.

## Develop

```
npm test         # unit tests for the URL logic (Node 18+)
npm run icons    # regenerate the toolbar icons (Python 3)
```

## Layout

```
src/
  manifest.json
  background.js      toolbar badge: a dot on pages that have a note
  lib/url.js         page URL -> note key
  lib/storage.js     note store (chrome.storage.local behind a small interface)
  popup/             the popup UI
tests/               unit tests
tools/make_icons.py  icon generator
```

A note belongs to a page URL. The hash and tracking parameters (`utm_*`, `fbclid`, and so on) are ignored.
