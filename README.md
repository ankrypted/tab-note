# Tab Note

A browser extension for **Brave** (Manifest V3; Chrome and Edge also work) for quick, throwaway notes that belong to the tab you are on.

- Requirements: [docs/functional-requirements.md](docs/functional-requirements.md), [docs/non-functional-requirements.md](docs/non-functional-requirements.md)
- Roadmap and stage checklists: [docs/roadmap.md](docs/roadmap.md)

## How it works

- Each tab has its own note. It follows the tab as you navigate.
- **When the tab closes, its note is deleted.** Notes are stored in your browser profile on this device (`chrome.storage.local`) and never sent anywhere.
- **Restore:** if Brave restores your tabs after a restart (Settings > On startup > Continue where you left off), each tab gets its note back, matched by URL. Notes not claimed within 3 minutes are deleted.
- **Asks before you lose a note:** while a note hasn't been saved to a file, closing the tab shows Brave's "Leave page?" prompt. It works on web pages only, after you've clicked in the page, and it also appears on reload or navigation in that tab. On `brave://` and new-tab pages Brave doesn't allow a prompt, so save first.
- **Side panel:** the button in the popup header opens the same notes in a side panel that follows the active tab.
- To keep a note, use **Save to file** (the download icon). Brave shows its Save dialog, so pick your Desktop or any folder. The `.txt` file has the tab title, URL, date and your note.
- A teal dot on the toolbar icon marks tabs that have a note. **Tab notes** lists the open tabs that have one and switches to a tab when you click it.

## Download (for friends)

Grab `tab-note-<version>.tar.gz` from the [Releases page](https://github.com/ankrypted/tab-note/releases). It holds the `extension` folder and an install guide. To build it yourself: `npm run package` (writes `dist/`).

## Try it from source

1. In Brave, open `brave://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose the [src/](src/) folder.
3. Pin it: click the puzzle-piece icon in the toolbar, then the pin next to Tab Note. Brave hides extensions by default, and the badge dot only shows when it is pinned.
4. Open any web page and click the Tab Note icon, or press `Alt+N`.

Notes for Brave:
- Change the shortcut at `brave://extensions/shortcuts`.
- Private and Tor windows: extensions are off there by default. To use Tab Note in a private window, open its **Details** on `brave://extensions` and turn on **Allow in Private**.
- Brave Shields do not affect it. The extension makes no network requests.
- Brave keeps the Save dialog's last folder, so pick the Desktop once and it will remember.

## Develop

```
npm test         # unit tests for storage, export and URL helpers (Node 18+)
npm run icons    # regenerate the toolbar icons (Python 3)
npm run package  # build dist/tab-note-<version>.tar.gz for sharing (Python 3)
```

## Layout

```
src/
  manifest.json
  background.js      tab lifecycle, session restore, badge, close guard
  content.js         shows the "Leave page?" prompt for unsaved notes
  lib/url.js         short display form of a URL
  lib/storage.js     per-tab note store, restore and cleanup (chrome.storage.local behind a small interface)
  lib/export.js      file name and contents for Save to file
  popup/             the popup UI
tests/               unit tests
tools/make_icons.py  icon generator
tools/package.py     builds the shareable tar.gz
tools/dist-readme.md install guide that goes inside the tar.gz
```

