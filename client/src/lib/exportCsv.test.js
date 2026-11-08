import { describe, expect, it } from "vitest";
import { buildCsv } from "./exportCsv";

describe("buildCsv", () => {
  it("writes UTF-8 CSV and escapes delimiters, quotes, and formula-like text", () => {
    const csv = buildCsv(
      [
        { label: "Име", value: (row) => row.name },
        { label: "Количество", value: (row) => row.quantity }
      ],
      [{ name: '=SUM("A1:A2")', quantity: -2 }]
    );

    expect(csv).toBe('\uFEFF"Име","Количество"\r\n"\'=SUM(""A1:A2"")","-2"');
  });

  it("rejects exports without columns", () => {
    expect(() => buildCsv([], [])).toThrow(RangeError);
  });
});
