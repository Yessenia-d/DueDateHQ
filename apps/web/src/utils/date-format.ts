function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
}

export function formatDate(value: string): string {
  const dateOnly = value.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return dateOnly;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : localDateKey(date);
}

export function formatMonthDay(value: string): string {
  const dateOnly = formatDate(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly.slice(5) : dateOnly;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDate(value);
  }

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${localDateKey(date)} ${time}`;
}
