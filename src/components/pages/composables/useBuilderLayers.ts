import { Ref } from "vue";
import { useMapDraft } from "../../../data/builder/draft";

export function useBuilderLayers(preview: Ref<HTMLDivElement | undefined>) {
  const {
    terrain, mask, background, layers, advancedSettings,
    setTerrainImage, setBackgroundImage, setMaskImage,
  } = useMapDraft();

  const handleAddTerrain = (_: File, data: string) => setTerrainImage(data);
  const handleSetTerrainVisibility = (visible: boolean) =>
    (terrain.value.visible = visible);

  const handleAddMask = (_: File, data: string) => setMaskImage(data);
  const handleSetMaskVisibility = (visible: boolean) =>
    (mask.value.visible = visible);

  const handleAddBackground = (_: File, data: string) => setBackgroundImage(data);
  const handleSetBackgroundVisibility = (visible: boolean) =>
    (background.value.visible = visible);

  const handleAddLayer = () =>
    layers.value.push({
      data: "",
      x: Math.round(preview.value!.scrollLeft / advancedSettings.value.scale),
      y: Math.round(preview.value!.scrollTop / advancedSettings.value.scale),
      visible: true,
    });

  const handleRemoveLayer = (index: number) => {
    layers.value = layers.value.filter((_, i) => i !== index);
  };

  const handleSetLayerVisibility = (visible: boolean, index: number) => {
    layers.value[index].visible = visible;
  };

  return {
    terrain, mask, background, layers,
    handleAddTerrain, handleSetTerrainVisibility,
    handleAddMask, handleSetMaskVisibility,
    handleAddBackground, handleSetBackgroundVisibility,
    handleAddLayer, handleRemoveLayer, handleSetLayerVisibility,
  };
}
