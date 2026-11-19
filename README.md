# Tab Note

A browser extension for **Brave** (Manifest V3; Chrome and Edge also work) for quick notes tied to the page you are on. Notes are stored locally and never leave your device.

- Requirements: [docs/functional-requirements.md](docs/functional-requirements.md), [docs/non-functional-requirements.md](docs/non-functional-requirements.md)

## Try it

1. In Brave, open `brave://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose the [src/](src/) folder.
3. Pin it: click the puzzle-piece icon in the toolbar, then the pin next to Tab Note. Brave hides extensions by default, and the badge dot only shows when it is pinned.
4. Open any web page and click the Tab Note icon, or press `Alt+N`.

Notes for Brave:
- Change the shortcut at `brave://extensions/shortcuts`.
- Private and Tor windows: extensions are off there by default. To use Tab Note in a private window, open its **Details** on `brave://extensions` and turn on **Allow in Private**.
- Brave Shields do not affect it. The extension makes no network requests.

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
