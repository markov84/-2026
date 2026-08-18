import { beforeEach, describe, expect, it } from "vitest";
import {
  getProductLabelCustomHeightMm,
  getProductLabelCustomWidthMm,
  getProductLabelPaperPreset,
  getProductLabelScale,
  getProductLabelThermalOrientation,
  resolveThermalPrintSurface
} from "./printDocuments";

describe("product label defaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses a larger default label scale so printed labels stay readable", () => {
    expect(getProductLabelScale()).toBe(100);
  });

  it("uses thermal preset as default paper type", () => {
    expect(getProductLabelPaperPreset()).toBe("thermal-40x30");
  });

  it("uses safe default custom thermal size", () => {
    expect(getProductLabelCustomWidthMm()).toBe(60);
    expect(getProductLabelCustomHeightMm()).toBe(40);
  });

  it("uses long-edge as default thermal orientation", () => {
    expect(getProductLabelThermalOrientation()).toBe("long-edge");
  });

  it("applies short-edge thermal rotation and swapped page dimensions", () => {
    const surface = resolveThermalPrintSurface({ widthMm: 40, heightMm: 30 }, "short-edge");

    expect(surface).toMatchObject({
      pageWidthMm: 30,
      pageHeightMm: 40,
      rotationClassName: "rotation-short-edge"
    });
  });
});
