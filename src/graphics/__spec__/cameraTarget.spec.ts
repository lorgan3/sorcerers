import { CameraTarget } from "../cameraTarget";
import { Viewport } from "../../data/map/viewport";

const makeViewport = (worldW = 4000, worldH = 2000, screenW = 1280, screenH = 720) => {
  return new Viewport(screenW, screenH, worldW, worldH, 1);
};

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
});
