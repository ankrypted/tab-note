// Builds the .txt file a note is saved as.

const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

export function noteFilename(title, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  let base = (title || "").replace(ILLEGAL, " ").replace(/\s+/g, " ").trim();
  base = base.replace(/[. ]+$/, "").slice(0, 60).trim();
  if (!base || RESERVED.test(base)) base = "note";
  return `${base} - ${stamp}.txt`;
}

export function noteFileContents({ title, url, text }, date = new Date()) {
  const lines = [title || "(untitled)", url || "", `Saved: ${date.toISOString().slice(0, 16).replace("T", " ")} UTC`, "", "----", "", text];
  return lines.join("\n").replace(/\r?\n/g, "\r\n") + "\r\n";
}

export function noteDataUrl(contents) {
  return "data:text/plain;charset=utf-8," + encodeURIComponent(contents);
}
