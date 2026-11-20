# Tab Note {{VERSION}}

A browser extension for quick, throwaway notes that belong to the tab you are on. Built for **Brave**; it also works in Chrome and Edge.

This is a test build shared outside the Chrome Web Store, so you install it by hand (about two minutes).

## Install

1. **Unpack the download.** Windows 10/11, macOS and Linux can all do it from a terminal:

   ```
   tar -xzf tab-note-{{VERSION}}.tar.gz
   ```

   (Or use 7-Zip / your archive tool.) You get a folder `tab-note-{{VERSION}}` containing this README and an `extension` folder. **Keep the `extension` folder somewhere permanent**, because the browser loads it from there each time it starts. Don't delete it afterwards.

2. **Open the extensions page.**
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

3. Turn on **Developer mode** (toggle at the top right).

4. Click **Load unpacked** and choose the **`extension`** folder, the one that contains `manifest.json`. Not the parent folder.

5. **Pin it.** Click the puzzle-piece icon in the toolbar and pin Tab Note. The small teal dot that marks tabs with a note only shows when it is pinned.

6. Open a web page and click the Tab Note icon, or press `Alt+N`.

Brave may show a "disable developer mode extensions" notice on startup, which is normal for hand-installed extensions. Dismiss it, and don't turn the extension off.

## How it works

- Each tab has its own note. It follows the tab as you navigate.
- **When you close the tab, its note is deleted.**
- To keep a note, click the **download icon** (Save to file). Your browser's Save dialog opens, so pick your Desktop or any folder. The `.txt` file has the tab title, URL, date and your note.
- **Asks before you lose a note.** While a note hasn't been saved to a file, closing the tab shows the browser's "Leave page?" prompt. This works on regular web pages, after you have clicked in the page. It also appears when you reload or navigate in that tab. On `brave://` and new-tab pages the browser doesn't allow a prompt, so save first there.
- **Restore.** If your browser restores your tabs after a restart ("Continue where you left off"), each tab gets its note back, matched by URL. Notes nobody claims within 3 minutes are deleted.
- **Side panel.** The button in the popup header opens the same notes in a side panel that follows the active tab. The button in the panel brings you back to the popup. If your browser doesn't support extension side panels, the button is hidden.
- **Tab notes** (bottom left of the popup) lists the tabs that have a note. Click one to jump to it.

## Privacy

Everything stays on your computer, in your browser profile. Nothing is sent anywhere: no accounts, no analytics, no network requests. The extension asks for these permissions:

| Permission | Why |
|---|---|
| `storage` | keep notes while their tab is open |
| `tabs` | read tab titles and URLs for the header, the list, restore and the badge |
| `downloads` | Save to file |
| `alarms` | clean up notes of closed tabs |
| `sidePanel` | the side panel |
| web pages (http/https) | a tiny script that shows the "Leave page?" prompt. It reads nothing from the page. |

## Known limits

- Notes are plain text, up to 100,000 characters each.
- Reopening a closed tab (Ctrl+Shift+T) does not bring its note back. Restoring a whole session does.
- The "Leave page?" prompt cannot appear on `brave://` or new-tab pages.
- After updating the extension, reload any open web pages once so the prompt works on them.
- Private windows: extensions are off there by default. In the extension's **Details**, turn on **Allow in Private** if you want it.

## Change the shortcut

`brave://extensions/shortcuts` (or the same page in Chrome/Edge). If another extension already uses `Alt+N`, set your own.

## Update

Download the newer archive, unpack it, then on the extensions page remove the old Tab Note and load the new `extension` folder. (If you unpack over the same folder, just click the reload arrow on the extension card.) Notes of open tabs are kept.

## Uninstall

Remove it from the extensions page. Notes it holds are deleted with it. Files you saved stay where you put them.

## Feedback

Found a bug, or something confusing? Tell me what you did, what you expected, and what happened. Source and issues: https://github.com/ankrypted/tab-note
