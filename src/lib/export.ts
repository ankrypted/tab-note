// Builds the .txt file a note is saved as.

// Characters Windows (and most systems) do not allow in file names, control characters included.
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

export interface ExportInfo {
  title?: string;
  url?: string;
  text: string;
}

export function noteFilename(title: string | undefined, date: Date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  let base = (title ?? "").replace(ILLEGAL, " ").replace(/\s+/g, " ").trim();
  base = base
    .replace(/[. ]+$/, "")
    .slice(0, 60)
    .trim();
  if (!base || RESERVED.test(base)) base = "note";
  return `${base} - ${stamp}.txt`;
}

export function noteFileContents(
  { title, url, text }: ExportInfo,
  date: Date = new Date(),
): string {
  const saved = date.toISOString().slice(0, 16).replace("T", " ");
  const lines = [title || "(untitled)", url ?? "", `Saved: ${saved} UTC`, "", "----", "", text];
  return lines.join("\n").replace(/\r?\n/g, "\r\n") + "\r\n";
}

export function noteDataUrl(contents: string): string {
  return "data:text/plain;charset=utf-8," + encodeURIComponent(contents);
}
