export const DEFAULT_TZ = "Asia/Karachi";

export function formatDateTime(
  date: Date | string | number | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDateOnly(
  date: Date | string | number | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatTime12(
  date: Date | string | number | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDateTime12(
  date: Date | string | number | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDateOnly(d, timeZone)}, ${formatTime12(d, timeZone)}`;
}

