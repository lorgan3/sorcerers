import { createTouchDeviceState } from "../useTouchDevice";

describe("createTouchDeviceState", () => {
  it("defaults to false in a non-touch (jsdom) environment", () => {
    const { showTouchControls } = createTouchDeviceState();
    expect(showTouchControls.value).toBe(false);
  });

  it("shows on a touch pointer and hides on keyboard input", () => {
    const { showTouchControls, onPointerDown, onKeyDown } =
      createTouchDeviceState();

    onPointerDown({ pointerType: "touch" } as PointerEvent);
    expect(showTouchControls.value).toBe(true);

    onKeyDown();
    expect(showTouchControls.value).toBe(false);
  });

  it("re-shows on the next touch after a keyboard hide", () => {
    const { showTouchControls, onPointerDown, onKeyDown } =
      createTouchDeviceState();

    onPointerDown({ pointerType: "touch" } as PointerEvent);
    onKeyDown();
    expect(showTouchControls.value).toBe(false);

    onPointerDown({ pointerType: "touch" } as PointerEvent);
    expect(showTouchControls.value).toBe(true);
  });

  it("ignores non-touch pointer events", () => {
    const { showTouchControls, onPointerDown } = createTouchDeviceState();
    onPointerDown({ pointerType: "mouse" } as PointerEvent);
    expect(showTouchControls.value).toBe(false);
  });
});
