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

Grab `tab-note-<version>.tar.gz` from the [Releases page](https://github.com/ankrypted/tab-note/releases). It holds the `extension` folder and an install guide. To build it yourself: `npm run package` (writes `dist/`, needs the setup under Develop).

## Try it from source

The code is TypeScript, so build it first, then load the **built** folder.

1. `npm ci` then `npm run build` (needs Node 18 or newer). This writes `dist/extension/`.
2. In Brave, open `brave://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `dist/extension` folder.
4. Pin it: click the puzzle-piece icon in the toolbar, then the pin next to Tab Note. Brave hides extensions by default, and the badge dot only shows when it is pinned.
5. Open any web page and click the Tab Note icon, or press `Alt+N`.

After changing code, run `npm run build` again and click the reload arrow on the extension card.

Notes for Brave:
- Change the shortcut at `brave://extensions/shortcuts`.
- Private and Tor windows: extensions are off there by default. To use Tab Note in a private window, open its **Details** on `brave://extensions` and turn on **Allow in Private**.
- Brave Shields do not affect it. The extension makes no network requests.
- Brave keeps the Save dialog's last folder, so pick the Desktop once and it will remember.

## Develop

```
npm ci               # install the exact pinned dependencies
npm run build        # TypeScript -> dist/extension (loadable folder)
npm test             # unit tests (Vitest)
npm run test:coverage  # tests plus a coverage report; fails under 90% on src/lib
npm run lint         # ESLint (also forbids innerHTML, see NFR-7)
npm run typecheck    # strict TypeScript, no emit
npm run format       # Prettier: rewrite files   (format:check only checks)
npm run check        # everything above in one go: what CI runs
npm run package      # build, then write dist/tab-note-<version>.tar.gz and .zip
npm run icons        # regenerate the toolbar icons (Python 3)
```

GitHub Actions (`.github/workflows/ci.yml`) runs the same checks on every push and pull request and uploads the zip as a build artifact.

## Layout

```
src/
  manifest.json       copied into the build; the version is stamped from package.json
  background.ts       tab lifecycle, session restore, badge, close guard
  content.ts          shows the "Leave page?" prompt for unsaved notes
  lib/url.ts          short display form of a URL
  lib/storage.ts      per-tab note store, restore and cleanup (chrome.storage.local behind a small interface)
  lib/export.ts       file name and contents for Save to file
  popup/              the popup UI (HTML, CSS, popup.ts)
  icons/              toolbar icons
tests/                unit tests (Vitest)
scripts/build.mjs     the esbuild build
tools/make_icons.py   icon generator
tools/package.py      builds the tar.gz and zip from dist/extension
tools/dist-readme.md  install guide that goes inside the tar.gz
.github/workflows/    CI
```
