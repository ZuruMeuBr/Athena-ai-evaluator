import { formatDateTime, formatDuration } from "../src/report/reportFormatters";

describe("reportFormatters", () => {
  it("formats date time as DD/MM/YYYY HH:mm:ss in America/Sao_Paulo", () => {
    expect(formatDateTime("2026-06-25T17:05:32.000Z")).toBe("25/06/2026 14:05:32");
  });

  it("returns fallback for missing date values", () => {
    expect(formatDateTime(undefined)).toBe("-");
    expect(formatDateTime(null)).toBe("-");
  });

  it("returns fallback for invalid date values", () => {
    expect(formatDateTime("not-a-date")).toBe("-");
  });

  it("formats durations in milliseconds", () => {
    expect(formatDuration(0)).toBe("0 ms");
    expect(formatDuration(245)).toBe("245 ms");
  });

  it("formats durations above 1000 milliseconds in seconds", () => {
    expect(formatDuration(1200)).toBe("1.2 s");
    expect(formatDuration(1000)).toBe("1 s");
  });
});
