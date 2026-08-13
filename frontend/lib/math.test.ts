import { describe, it, expect } from "vitest";
import {
  toStroops,
  fromStroops,
  formatAmount,
  formatUsd,
  tickToPrice,
  roundTick,
} from "./math";

describe("toStroops / fromStroops", () => {
  it("converts a decimal string to 7-decimal stroops", () => {
    expect(toStroops("1")).toBe(10_000_000n);
    expect(toStroops("1.5")).toBe(15_000_000n);
    expect(toStroops("0.0000001")).toBe(1n);
  });

  it("treats empty / partial input as zero", () => {
    expect(toStroops("")).toBe(0n);
    expect(toStroops(".")).toBe(0n);
  });

  it("round-trips through fromStroops", () => {
    expect(fromStroops(15_000_000n)).toBe("1.5");
    expect(fromStroops(10_000_000n)).toBe("1");
    expect(fromStroops(toStroops("123.456"))).toBe("123.456");
  });
});

describe("formatAmount", () => {
  it("truncates to the requested fractional digits", () => {
    expect(formatAmount(12_345_678n, 7, 4)).toBe("1.2345");
    expect(formatAmount(10_000_000n)).toBe("1");
  });
});

describe("formatUsd", () => {
  it("formats normal amounts as USD currency", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });

  it("handles zero and sub-cent amounts", () => {
    expect(formatUsd(0)).toBe("");
    expect(formatUsd(0.005)).toBe("< $0.01");
  });
});

describe("tick math", () => {
  it("maps tick 0 to price 1.0", () => {
    expect(tickToPrice(0)).toBeCloseTo(1, 10);
  });

  it("rounds a tick to the nearest spacing", () => {
    expect(roundTick(7, 10)).toBe(10);
    expect(roundTick(12, 10)).toBe(10);
    expect(roundTick(-7, 10)).toBe(-10);
  });
});
