import { beforeEach, describe, expect, it } from "vitest";
import { getProductLabelScale } from "./printDocuments";

describe("product label defaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses a larger default label scale so printed labels stay readable", () => {
    expect(getProductLabelScale()).toBe(100);
  });
});
