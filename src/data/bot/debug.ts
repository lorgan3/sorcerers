// Bot debug visualisation flag. Enable with ?debug=bot in the URL query string.
// Off by default to avoid shipping the graph/path overlay to players.
export const BOT_DEBUG_ENABLED = (() => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "bot";
})();
