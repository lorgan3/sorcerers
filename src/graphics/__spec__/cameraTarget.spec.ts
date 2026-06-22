import { CameraTarget, PanMode } from "../cameraTarget";
import { Viewport } from "../../data/map/viewport";
import { setGameContext } from "../../data/context";
import type { Manager } from "../../data/network/manager";
import { KeyboardController } from "../../data/controller/keyboardController";

const makeViewport = (worldW = 4000, worldH = 2000, screenW = 1280, screenH = 720) => {
  return new Viewport(screenW, screenH, worldW, worldH, 1);
};

const fakeViewport = () =>
  ({ worldWidth: 1000, worldHeight: 1000 } as unknown as Viewport);

const stubController = (mouseX = 0, mouseY = 0) => {
  // A bare-bones stand-in: the camera tick only calls isLocalKeyDown,
  // getLocalMouse, mouseMove, and addScrollListener.
  const stub: Partial<KeyboardController> = {
    isLocalKeyDown: () => false,
    getLocalMouse: () => [mouseX, mouseY] as [number, number],
    mouseMove: () => {},
    addScrollListener: () => {},
  };
  return stub as KeyboardController;
};

const tickN = (cam: CameraTarget, frames: number, dt = 1) => {
  for (let i = 0; i < frames; i++) cam.tick(dt);
};

const setTargetPosition = (cam: CameraTarget, x: number, y: number) => {
  // Use a fake spawnable that getCenter() returns the desired coordinate.
  const fakeTarget = {
    getCenter: () => [x, y] as [number, number],
  };
  // @ts-expect-error — accessing private
  cam.target = fakeTarget;
  // @ts-expect-error
  cam.attached = true;
};

beforeEach(() => {
  // Minimal fake context: getManager().self?.activeCharacter resolves to undefined,
  // so the auto-attach-to-active-character branch in tick() is skipped cleanly.
  const fakeManager = { self: undefined, isControlling: () => false } as unknown as Manager;
  setGameContext({ level: null as never, manager: fakeManager, server: null });
});

afterEach(() => {
  setGameContext(null);
});

describe("CameraTarget pan mode", () => {
  it("starts focused and attached", () => {
    const camera = new CameraTarget(fakeViewport());
    expect(camera.currentPanMode).toBe(PanMode.Focused);
    expect(camera.isDetached).toBe(false);
  });

  it("cycles Focused -> Panning -> Frozen -> Focused", () => {
    const camera = new CameraTarget(fakeViewport());

    expect(camera.cyclePanMode()).toBe(PanMode.Panning);
    expect(camera.isDetached).toBe(true);

    expect(camera.cyclePanMode()).toBe(PanMode.Frozen);
    expect(camera.isDetached).toBe(true);

    expect(camera.cyclePanMode()).toBe(PanMode.Focused);
    expect(camera.isDetached).toBe(false);
  });

  it("recenter() resets pan mode to Focused", () => {
    const camera = new CameraTarget(fakeViewport());
    camera.cyclePanMode();
    camera.cyclePanMode();
    expect(camera.currentPanMode).toBe(PanMode.Frozen);

    camera.recenter();
    expect(camera.currentPanMode).toBe(PanMode.Focused);
    expect(camera.isDetached).toBe(false);
  });
});

describe("CameraTarget", () => {
  describe("isDetached", () => {
    it("starts attached", () => {
      const cam = new CameraTarget(makeViewport());
      expect(cam.isDetached).toBe(false);
    });
  });

  describe("recenter()", () => {
    it("re-attaches the camera", () => {
      const cam = new CameraTarget(makeViewport());
      // @ts-expect-error — accessing private to set up state
      cam.attached = false;
      expect(cam.isDetached).toBe(true);

      cam.recenter();
      expect(cam.isDetached).toBe(false);
    });
  });

  describe("pan timing", () => {
    it("long-distance pan takes more frames than short-distance pan", () => {
      const ctlr = stubController();
      const buildCam = () => {
        const cam = new CameraTarget(makeViewport());
        cam.connect(ctlr);
        return cam;
      };

      const framesToReach = (cam: CameraTarget, tx: number, ty: number) => {
        setTargetPosition(cam, tx, ty);
        let frames = 0;
        const maxFrames = 600;
        while (frames < maxFrames) {
          cam.tick(1);
          frames++;
          // @ts-expect-error — viewport is private; we read .center for assertions
          const [cx, cy] = cam.viewport.center;
          if (Math.hypot(cx - tx, cy - ty) < 1) return frames;
        }
        return frames;
      };

      // Camera starts at (worldW/2, worldH/2) = (2000, 1000) for the 4000x2000 map.
      // Must be > deadzone (100) to trigger pan, so using 150 and 1500.
      const shortFrames = framesToReach(buildCam(), 2150, 1000); // 150px hop
      const longFrames = framesToReach(buildCam(), 3500, 1000);  // 1500px hop

      expect(longFrames).toBeGreaterThan(shortFrames);
    });

    it("settles without overshoot", () => {
      const ctlr = stubController();
      const cam = new CameraTarget(makeViewport());
      cam.connect(ctlr);
      setTargetPosition(cam, 3500, 1000);

      let maxOvershoot = 0;
      for (let i = 0; i < 1000; i++) {
        cam.tick(1);
        // @ts-expect-error — viewport is private
        const [cx] = cam.viewport.center;
        if (cx > 3500) maxOvershoot = Math.max(maxOvershoot, cx - 3500);
      }
      expect(maxOvershoot).toBeLessThan(1);
    });
  });

  describe("clamp under letterbox", () => {
    it("centers x on world-center when zoomed out past horizontal fit", () => {
      const ctlr = stubController();
      const cam = new CameraTarget(makeViewport(4000, 2000, 1280, 720));
      cam.connect(ctlr);

      // Zoom out far enough that 4000 * scale < 1280 ⇒ scale < 0.32
      cam["scale"] = 0.2;
      cam["viewport"].setZoom(0.2);

      const clamped = cam["clamp"]([100, 1000]);
      expect(clamped[0]).toBe(2000); // world-x center
    });

    it("clamps normally on an axis where the world still overflows the screen", () => {
      const ctlr = stubController();
      const cam = new CameraTarget(makeViewport(4000, 2000, 1280, 720));
      cam.connect(ctlr);

      // At scale 1, world (4000) > screen (1280) on x — should clamp normally.
      const clamped = cam["clamp"]([0, 1000]);
      // Min allowed x = screenW / 2 / scale = 640 at scale 1
      expect(clamped[0]).toBe(640);
    });
  });
});
