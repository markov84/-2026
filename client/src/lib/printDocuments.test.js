import { beforeEach, describe, expect, it } from "vitest";
import { getProductLabelPaperPreset, getProductLabelScale } from "./printDocuments";

describe("product label defaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses a larger default label scale so printed labels stay readable", () => {
    expect(getProductLabelScale()).toBe(100);
  });

  it("uses thermal preset as default paper type", () => {
    expect(getProductLabelPaperPreset()).toBe("thermal-58x40");
  });
});
