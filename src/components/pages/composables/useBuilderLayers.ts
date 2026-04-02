import { Ref, ref } from "vue";
import { Layer } from "../../../data/map";
import { BBox } from "../../../data/map/bbox";
import type { AdvancedSettings } from "../../organisms/BuilderSettings.vue";

export function useBuilderLayers(
  advancedSettings: Ref<AdvancedSettings>,
  preview: Ref<HTMLDivElement | undefined>
) {
  const terrain = ref({ data: "", visible: false });
  const mask = ref({ data: "", visible: false });
  const background = ref({ data: "", visible: false });
  const layers = ref<Array<Layer & { visible: boolean }>>([]);

  const addImageFactory =
    (target: Ref<{ data: string; visible: boolean }>, visible = true) =>
    (_: File, data: string) => {
      target.value = { data, visible };

      if (advancedSettings.value.bbox.isEmpty()) {
        const image = new Image();
        image.src = data;

        image.onload = () => {
          advancedSettings.value.bbox = BBox.create(
            image.width,
            image.height
          );
        };
      }
    };

  const handleAddTerrain = addImageFactory(terrain);
  const handleSetTerrainVisibility = (visible: boolean) =>
    (terrain.value.visible = visible);
  const handleAddMask = addImageFactory(mask, false);
  const handleSetMaskVisibility = (visible: boolean) =>
    (mask.value.visible = visible);
  const handleAddBackground = addImageFactory(background);
  const handleSetBackgroundVisibility = (visible: boolean) =>
    (background.value.visible = visible);

  const handleAddLayer = () =>
    layers.value.push({
      data: "",
      x: Math.round(
        preview.value!.scrollLeft / advancedSettings.value.scale
      ),
      y: Math.round(
        preview.value!.scrollTop / advancedSettings.value.scale
      ),
      visible: true,
    });

  const handleRemoveLayer = (index: number) => {
    layers.value = layers.value.filter((_, i) => i !== index);
  };

  const handleSetLayerVisibility = (visible: boolean, index: number) => {
    layers.value[index].visible = visible;
  };

  return {
    terrain,
    mask,
    background,
    layers,
    handleAddTerrain,
    handleSetTerrainVisibility,
    handleAddMask,
    handleSetMaskVisibility,
    handleAddBackground,
    handleSetBackgroundVisibility,
    handleAddLayer,
    handleRemoveLayer,
    handleSetLayerVisibility,
  };
}
