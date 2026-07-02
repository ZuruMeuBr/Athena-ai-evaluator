const reportTimeZone = "America/Sao_Paulo";

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);

  if (date === null) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: reportTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(date);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));

  return `${partByType.get("day")}/${partByType.get("month")}/${partByType.get("year")} ${partByType.get(
    "hour"
  )}:${partByType.get("minute")}:${partByType.get("second")}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) {
    return "0 ms";
  }

  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  const seconds = ms / 1000;
  const formattedSeconds = Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);

  return `${formattedSeconds} s`;
}
