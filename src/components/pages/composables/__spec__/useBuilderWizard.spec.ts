import { useBuilderWizard } from "../useBuilderWizard";

const w = useBuilderWizard();
beforeEach(() => {
  w.close();
  w.reset();
});

describe("useBuilderWizard", () => {
  it("starts on the chooser, hidden", () => {
    expect(w.screen.value).toBe("choose");
    expect(w.visible.value).toBe(false);
  });

  it("enters each path on the correct first screen", () => {
    w.selectPath("autoMap");
    expect(w.screen.value).toBe("autoMap-wfc");
    w.selectPath("autoTerrain");
    expect(w.screen.value).toBe("autoTerrain-wfc");
    w.selectPath("manual");
    expect(w.screen.value).toBe("manual-terrain");
  });

  it("autoMap advances wfc -> paint -> build and caps there", () => {
    w.selectPath("autoMap");
    w.next();
    expect(w.screen.value).toBe("autoMap-paint");
    w.next();
    expect(w.screen.value).toBe("build");
    w.next();
    expect(w.screen.value).toBe("build");
  });

  it("autoTerrain advances wfc -> preview -> advanced -> build and caps there", () => {
    w.selectPath("autoTerrain");
    w.next();
    expect(w.screen.value).toBe("autoTerrain-preview");
    w.next();
    expect(w.screen.value).toBe("autoTerrain-advanced");
    w.next();
    expect(w.screen.value).toBe("build");
    w.next();
    expect(w.screen.value).toBe("build");
  });

  it("advances through the manual path", () => {
    w.selectPath("manual");
    w.next();
    expect(w.screen.value).toBe("manual-background");
    w.next();
    expect(w.screen.value).toBe("manual-advanced");
    w.next();
    expect(w.screen.value).toBe("build");
    w.next();
    expect(w.screen.value).toBe("build");
  });

  it("back steps within a path then to the chooser, returning false at the chooser", () => {
    w.selectPath("autoMap");
    w.next();
    expect(w.back()).toBe(true);
    expect(w.screen.value).toBe("autoMap-wfc");
    expect(w.back()).toBe(true);
    expect(w.screen.value).toBe("choose");
    expect(w.back()).toBe(false);
  });

  it("open() resets to a visible chooser; openLast() keeps path/step", () => {
    w.selectPath("manual");
    w.next();
    w.close();
    w.openLast();
    expect(w.visible.value).toBe(true);
    expect(w.screen.value).toBe("manual-background");
    w.open();
    expect(w.visible.value).toBe(true);
    expect(w.screen.value).toBe("choose");
  });

  it("is a singleton — state is shared across calls", () => {
    useBuilderWizard().selectPath("autoMap");
    expect(useBuilderWizard().screen.value).toBe("autoMap-wfc");
  });
});
