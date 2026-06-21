import { ref } from "vue";
import { useBuilderOverlays } from "../useBuilderOverlays";
import { useMapDraft } from "../../../../data/builder/draft";

const draft = useMapDraft();

beforeEach(() => draft.reset());

describe("useBuilderOverlays", () => {
  it("startDrawOverlay records the target layer index", () => {
    const preview = ref<HTMLDivElement>();
    const { creatingOverlayIndex, startDrawOverlay } = useBuilderOverlays(preview);

    expect(creatingOverlayIndex.value).toBeNull();
    startDrawOverlay(2);
    expect(creatingOverlayIndex.value).toBe(2);
  });

  it("handleCreateOverlay is a no-op while no draw is in progress", () => {
    const preview = ref<HTMLDivElement>();
    const { handleCreateOverlay } = useBuilderOverlays(preview);

    expect(() =>
      handleCreateOverlay({ preventDefault() {} } as MouseEvent)
    ).not.toThrow();
    expect(draft.layers.value).toEqual([]);
  });
});
