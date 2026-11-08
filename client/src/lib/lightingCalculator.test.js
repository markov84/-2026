import { describe, expect, it } from "vitest";
import { calculateLighting } from "./lightingCalculator";

describe("calculateLighting", () => {
  it("calculates the minimum whole fixture count and estimated illuminance", () => {
    expect(
      calculateLighting({
        length: 4,
        width: 5,
        illuminance: 200,
        lumensPerFixture: 1000,
        utilizationFactor: 0.6,
        maintenanceFactor: 0.8
      })
    ).toEqual({
      area: 20,
      requiredLumens: 8333.333333333334,
      fixtureCount: 9,
      installedLumens: 9000,
      estimatedIlluminance: 216
    });
  });

  it("rejects non-positive inputs and factors above one", () => {
    const validInput = {
      length: 4,
      width: 5,
      illuminance: 200,
      lumensPerFixture: 1000,
      utilizationFactor: 0.6,
      maintenanceFactor: 0.8
    };

    expect(() => calculateLighting({ ...validInput, width: 0 })).toThrow(RangeError);
    expect(() => calculateLighting({ ...validInput, utilizationFactor: 1.1 })).toThrow(RangeError);
  });
});
