// Short, readable form of a URL for display.
export function displayUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return url;
    const path = u.pathname === "/" ? "" : u.pathname;
    return u.host.replace(/^www\./, "") + path;
  } catch {
    return url || "";
  }
}
