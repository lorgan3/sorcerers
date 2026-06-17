import { Ref, ref } from "vue";
import { BBox } from "../../../data/map/bbox";
import { useMapDraft } from "../../../data/builder/draft";

export function useBuilderLadders(preview: Ref<HTMLDivElement | undefined>) {
  const { ladders, advancedSettings } = useMapDraft();
  const creatingLadder = ref(false);

  const handleCreateLadder = (event: MouseEvent) => {
    if (!creatingLadder.value) return;
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

    ladders.value.push(
      BBox.fromJS({ left: startX, top: startY, right: startX, bottom: startY })!
    );

    const handleMouseMove = (moveEvent: MouseEvent) => {
      ladders.value[ladders.value.length - 1].right = Math.max(
        startX,
        Math.round(moveEvent.pageX / advancedSettings.value.scale) - x
      );
      ladders.value[ladders.value.length - 1].bottom = Math.max(
        startY,
        Math.round(moveEvent.pageY / advancedSettings.value.scale) - y
      );
    };
    const handleMouseUp = () => {
      document.onselectstart = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      creatingLadder.value = false;
    };
    document.onselectstart = () => false;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return { ladders, creatingLadder, handleCreateLadder };
}
