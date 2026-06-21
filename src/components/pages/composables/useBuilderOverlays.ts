import { Ref, ref } from "vue";
import { BBox } from "../../../data/map/bbox";
import { useMapDraft } from "../../../data/builder/draft";

export function useBuilderOverlays(preview: Ref<HTMLDivElement | undefined>) {
  const { layers, advancedSettings, confirmOverlay } = useMapDraft();
  const creatingOverlayIndex = ref<number | null>(null);

  const startDrawOverlay = (index: number) => {
    creatingOverlayIndex.value = index;
  };

  const handleCreateOverlay = (event: MouseEvent) => {
    const index = creatingOverlayIndex.value;
    if (index === null) return;
    event.preventDefault();

    const position = preview.value!.getBoundingClientRect();
    const x = Math.round(
      (position.left - preview.value!.scrollLeft) / advancedSettings.value.scale
    );
    const y = Math.round(
      (position.top - preview.value!.scrollTop) / advancedSettings.value.scale
    );
    const startX = Math.round(event.pageX / advancedSettings.value.scale) - x;
    const startY = Math.round(event.pageY / advancedSettings.value.scale) - y;

    layers.value[index].box = new BBox(startX, startY, startX, startY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const box = layers.value[index].box!;
      box.right = Math.max(
        startX,
        Math.round(moveEvent.pageX / advancedSettings.value.scale) - x
      );
      box.bottom = Math.max(
        startY,
        Math.round(moveEvent.pageY / advancedSettings.value.scale) - y
      );
    };
    const handleMouseUp = () => {
      document.onselectstart = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      creatingOverlayIndex.value = null;
    };
    document.onselectstart = () => false;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return { creatingOverlayIndex, startDrawOverlay, handleCreateOverlay, confirmOverlay };
}
