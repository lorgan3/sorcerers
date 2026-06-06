import { getContextOrNull } from "../context";

// Bot debug visualisation flag. Off by default; flip at runtime via window.debug().
// Toggles BOTH the boolean (which gates DebugLayer's draw methods) AND the layer's
// visibility, so turning it off both stops new draws and hides existing graphics.
let enabled = false;

export function isBotDebugEnabled(): boolean {
  return enabled;
}

export function setBotDebugEnabled(value: boolean) {
  setEnabled(value);
}

function setEnabled(value: boolean) {
  enabled = value;
  const layer = getContextOrNull()?.level?.debugLayer;
  if (layer) {
    layer.visible = value;
    if (!value) {
      layer.clear();
      layer.removeChildren();
    }
  }
}

if (typeof window !== "undefined") {
  (window as Window & { debug?: () => boolean }).debug = () => {
    setEnabled(!enabled);
    console.log(`bot debug ${enabled ? "ON" : "OFF"}`);
    return enabled;
  };
}
