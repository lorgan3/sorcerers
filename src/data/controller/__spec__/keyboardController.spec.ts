import { KeyboardController } from "../keyboardController";
import { Key, keyMap } from "../controller";
import { Viewport } from "../../map/viewport";

const fakeTarget = () =>
  ({
    scale: { x: 1, y: 1 },
    left: 0,
    top: 0,
    addListener() {},
    removeListener() {},
  } as unknown as Viewport);

const touch = (pointerId: number, x: number, y: number) =>
  ({
    pointerId,
    pointerType: "touch",
    button: 0,
    global: { x, y },
  } as any);

const mouse = (x: number, y: number) =>
  ({
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    global: { x, y },
  } as any);

describe("KeyboardController touch handling", () => {
  it("synthesizes M1 for a single touch when not suppressed", () => {
    const kb = new KeyboardController(fakeTarget());
    (kb as any).handleMouseDown(touch(1, 10, 10));
    expect(kb.pressedKeys & keyMap[Key.M1]).toBeTruthy();
  });

  it("does not synthesize M1 for touch while cast is suppressed", () => {
    const kb = new KeyboardController(fakeTarget());
    kb.setSuppressTouchCast(true);
    (kb as any).handleMouseDown(touch(1, 10, 10));
    expect(kb.pressedKeys & keyMap[Key.M1]).toBeFalsy();
  });

  it("still synthesizes M1 for a mouse while cast is suppressed (desktop unchanged)", () => {
    const kb = new KeyboardController(fakeTarget());
    kb.setSuppressTouchCast(true);
    (kb as any).handleMouseDown(mouse(10, 10));
    expect(kb.pressedKeys & keyMap[Key.M1]).toBeTruthy();
  });

  it("suppresses and clears M1 when a second touch begins (pinch)", () => {
    const kb = new KeyboardController(fakeTarget());
    (kb as any).handleMouseDown(touch(1, 0, 0));
    expect(kb.pressedKeys & keyMap[Key.M1]).toBeTruthy();

    (kb as any).handleMouseDown(touch(2, 100, 0));
    expect(kb.pressedKeys & keyMap[Key.M1]).toBeFalsy();
  });

  it("fires pinch listeners with the distance delta", () => {
    const kb = new KeyboardController(fakeTarget());
    const deltas: number[] = [];
    kb.addPinchListener((delta) => deltas.push(delta));

    (kb as any).handleMouseDown(touch(1, 0, 0));
    (kb as any).handleMouseDown(touch(2, 100, 0)); // initial distance 100
    (kb as any).handleMouseMove(touch(2, 140, 0)); // distance now 140

    expect(deltas).toContain(40);
  });

  it("does not fire pinch listeners for a single touch", () => {
    const kb = new KeyboardController(fakeTarget());
    const deltas: number[] = [];
    kb.addPinchListener((delta) => deltas.push(delta));

    (kb as any).handleMouseDown(touch(1, 0, 0));
    (kb as any).handleMouseMove(touch(1, 50, 0));

    expect(deltas).toHaveLength(0);
  });
});
