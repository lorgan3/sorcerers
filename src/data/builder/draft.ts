import { ref } from "vue";
import { BBox } from "../map/bbox";
import { Config, Layer, Map } from "../map";
import type { LadderInfo } from "../wfc/postProcess";
import { logEvent } from "../../util/firebase";

export interface AdvancedSettings {
  bbox: BBox;
  scale: number;
  customMask: boolean;
  parallaxName: string;
  parallaxOffset: number;
}

const emptyAdvanced = (): AdvancedSettings => ({
  scale: 6,
  bbox: BBox.create(0, 0),
  customMask: false,
  parallaxName: "",
  parallaxOffset: 0,
});

const terrain = ref({ data: "", visible: false });
const mask = ref({ data: "", visible: false });
const background = ref({ data: "", visible: false });
const layers = ref<Array<Layer & { visible: boolean }>>([]);
const ladders = ref<BBox[]>([]);
const advancedSettings = ref<AdvancedSettings>(emptyAdvanced());
const name = ref("");
const oldScale = ref(advancedSettings.value.scale);

const setImage = (
  target: typeof terrain,
  data: string,
  visible: boolean
) => {
  target.value = { data, visible };
  if (advancedSettings.value.bbox.isEmpty() && data) {
    const image = new Image();
    image.src = data;
    image.onload = () => {
      advancedSettings.value.bbox = BBox.create(image.width, image.height);
    };
  }
};

const setTerrainImage = (data: string) => setImage(terrain, data, true);
const setBackgroundImage = (data: string) => setImage(background, data, true);

const applyWfc = (maskData: string, wfcLadders: LadderInfo[]) => {
  mask.value = { data: maskData, visible: true };
  advancedSettings.value.customMask = true;
  ladders.value = wfcLadders.map(
    (l) =>
      new BBox(l.x - l.width / 2, l.y, l.x + l.width / 2, l.y + l.height)
  );
  layers.value = [];

  const image = new Image();
  image.src = maskData;
  image.onload = () => {
    advancedSettings.value.bbox = BBox.create(image.width, image.height);
  };
};

const applyPaint = (result: {
  terrain: string;
  background: string;
  width: number;
  height: number;
}) => {
  terrain.value = { data: result.terrain, visible: true };
  background.value = { data: result.background, visible: true };
  // the painted terrain's alpha is the wallmask, so drop any generated mask
  mask.value = { data: "", visible: false };
  advancedSettings.value.customMask = false;
  advancedSettings.value.bbox = BBox.create(result.width, result.height);
  if (!advancedSettings.value.parallaxName) {
    advancedSettings.value.parallaxName = "Ocean";
  }
};

const applyAiAlign = (result: {
  terrain: string;
  background: string;
  mask: string;
  width: number;
  height: number;
}) => {
  terrain.value = { data: result.terrain, visible: true };
  background.value = { data: result.background, visible: true };
  mask.value = { data: result.mask, visible: false };
  advancedSettings.value.bbox = BBox.create(result.width, result.height);
};

const loadConfig = (config: Config, mapName: string) => {
  oldScale.value = config.scale;
  terrain.value = { data: config.terrain.data as string, visible: true };
  background.value = {
    data: (config.background?.data as string) || "",
    visible: true,
  };
  layers.value = config.layers.map((layer) => ({ ...layer, visible: true }));
  advancedSettings.value = {
    bbox: BBox.fromJS(config.bbox) || BBox.create(0, 0),
    scale: config.scale,
    customMask: !!config.terrain.mask,
    parallaxName: config.parallax.name,
    parallaxOffset: config.parallax.offset,
  };
  name.value = mapName;
  ladders.value =
    (config.ladders
      ?.map((bbox) => BBox.fromJS(bbox))
      .filter(Boolean) as BBox[]) || [];
  mask.value = config.terrain.mask
    ? { data: config.terrain.mask as string, visible: false }
    : { data: "", visible: false };
};

const toConfig = (): Config => ({
  terrain: {
    data: terrain.value.data || mask.value.data,
    mask: mask.value.data,
  },
  background: background.value.data ? { data: background.value.data } : undefined,
  layers: layers.value.filter((layer) => !!layer.data).map((layer) => ({ ...layer })),
  bbox: advancedSettings.value.bbox,
  parallax: {
    name: advancedSettings.value.parallaxName,
    offset: advancedSettings.value.parallaxOffset,
  },
  scale: advancedSettings.value.scale,
  ladders: ladders.value,
});

const build = async () => {
  const map = await Map.fromConfig(toConfig());
  const url = URL.createObjectURL(await map.toBlob());
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  const link = document.createElement("a");
  link.download = `${name.value || "map"}.png`;
  link.href = url;
  link.click();
  logEvent("build_map");
};

const reset = () => {
  terrain.value = { data: "", visible: false };
  mask.value = { data: "", visible: false };
  background.value = { data: "", visible: false };
  layers.value = [];
  ladders.value = [];
  advancedSettings.value = emptyAdvanced();
  name.value = "";
  oldScale.value = advancedSettings.value.scale;
};

export function useMapDraft() {
  return {
    terrain, mask, background, layers, ladders, advancedSettings, name, oldScale,
    setTerrainImage, setBackgroundImage,
    applyWfc, applyPaint, applyAiAlign,
    loadConfig, toConfig, build, reset,
  };
}
