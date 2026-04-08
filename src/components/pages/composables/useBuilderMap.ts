import { Ref } from "vue";
import { Config, Layer, Map } from "../../../data/map";
import { BBox } from "../../../data/map/bbox";
import { Server } from "../../../data/network/server";
import { Team } from "../../../data/team";
import { logEvent } from "../../../util/firebase";
import { defaults, GameSettings } from "../../../util/localStorage/settings";
import type { AdvancedSettings } from "../../organisms/BuilderSettings.vue";

export function useBuilderMap(
  name: Ref<string>,
  terrain: Ref<{ data: string; visible: boolean }>,
  mask: Ref<{ data: string; visible: boolean }>,
  background: Ref<{ data: string; visible: boolean }>,
  layers: Ref<Array<Layer & { visible: boolean }>>,
  ladders: Ref<BBox[]>,
  advancedSettings: Ref<AdvancedSettings>,
  oldScale: Ref<number>
) {
  const buildConfig = (): Config => ({
    terrain: {
      data: terrain.value.data || mask.value.data,
      mask: mask.value.data,
    },
    background: background.value.data
      ? { data: background.value.data }
      : undefined,
    layers: layers.value
      .filter((layer) => !!layer.data)
      .map((layer) => ({ ...layer })),
    bbox: advancedSettings.value.bbox,
    parallax: {
      name: advancedSettings.value.parallaxName,
      offset: advancedSettings.value.parallaxOffset,
    },
    scale: advancedSettings.value.scale,
    ladders: ladders.value,
  });

  const handleBuild = async () => {
    const map = await Map.fromConfig(buildConfig());

    const url = URL.createObjectURL(await map.toBlob());
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);

    const link = document.createElement("a");
    link.download = `${name.value || "map"}.png`;
    link.href = url;
    link.click();

    logEvent("build_map");
  };

  const handleTest = async (
    onPlay: (key: string, map: Map | Config, settings: GameSettings) => void
  ) => {
    const config = buildConfig();

    const server = new Server();
    server.addPlayer("Test player", Team.random());
    onPlay("0000", config, { ...defaults().gameSettings, teamSize: 1 });
  };

  const loadMap = (config: Config, mapName: string) => {
    oldScale.value = config.scale;
    terrain.value = { data: config.terrain.data as string, visible: true };
    background.value = {
      data: (config.background?.data as string) || "",
      visible: true,
    };
    layers.value = config.layers.map((layer) => ({
      ...layer,
      visible: true,
    }));
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

    if (config.terrain.mask) {
      mask.value = { data: config.terrain.mask as string, visible: false };
    } else {
      mask.value = { data: "", visible: false };
    }
  };

  return {
    handleBuild,
    handleTest,
    loadMap,
  };
}
