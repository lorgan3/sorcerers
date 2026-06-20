import { computed, ref } from "vue";

export type WizardPath = "choose" | "autoMap" | "autoTerrain" | "manual";

export type WizardScreen =
  | "choose"
  | "autoMap-wfc"
  | "autoMap-paint"
  | "autoTerrain-wfc"
  | "autoTerrain-preview"
  | "autoTerrain-advanced"
  | "manual-terrain"
  | "manual-background"
  | "manual-advanced"
  | "build";

const SCREENS: Record<WizardPath, WizardScreen[]> = {
  choose: ["choose"],
  autoMap: ["autoMap-wfc", "autoMap-paint", "build"],
  autoTerrain: ["autoTerrain-wfc", "autoTerrain-preview", "autoTerrain-advanced", "build"],
  manual: ["manual-terrain", "manual-background", "manual-advanced", "build"],
};

const path = ref<WizardPath>("choose");
const step = ref(0);
const visible = ref(false);

const screen = computed<WizardScreen>(() => SCREENS[path.value][step.value]);

const selectPath = (next: WizardPath) => {
  path.value = next;
  step.value = 0;
};

const next = () => {
  if (step.value < SCREENS[path.value].length - 1) step.value++;
};

const back = (): boolean => {
  if (path.value === "choose") return false;
  if (step.value > 0) step.value--;
  else {
    path.value = "choose";
    step.value = 0;
  }
  return true;
};

const reset = () => {
  path.value = "choose";
  step.value = 0;
};

const open = () => {
  reset();
  visible.value = true;
};

const openLast = () => {
  visible.value = true;
};

const close = () => {
  visible.value = false;
};

export function useBuilderWizard() {
  return { path, step, visible, screen, selectPath, next, back, reset, open, openLast, close };
}
