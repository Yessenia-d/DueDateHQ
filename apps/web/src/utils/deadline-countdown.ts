const MS_PER_HOUR = 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type CountdownOptions = {
  dateKey?: string;
  now?: Date;
};

function getEndOfDateMs(dateKey: string | undefined, now: Date): number {
  const match = dateKey?.match(DATE_KEY_PATTERN);

  if (match) {
    const [, year, month, day] = match;

    return Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
  }

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return endOfToday.getTime();
}

export function getHoursRemainingToday(options: CountdownOptions = {}): number {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();

  if (!Number.isFinite(nowMs)) return 0;

  const endOfDateMs = getEndOfDateMs(options.dateKey, now);

  if (!Number.isFinite(endOfDateMs)) return 0;

  return Math.max(0, Math.ceil((endOfDateMs - nowMs) / MS_PER_HOUR));
}

export function formatDueTodayCountdown(options: CountdownOptions = {}): string {
  return `Due today · ${getHoursRemainingToday(options)} h`;
}
