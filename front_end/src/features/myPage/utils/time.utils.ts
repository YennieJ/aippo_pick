/**
 * 24시간 형식을 12시간 형식으로 변환
 * @param time24 24시간 형식 (예: "23:30")
 * @returns { period: "AM" | "PM", hour: number, minute: number }
 */
export function convert24To12(time24: string): {
  period: 'AM' | 'PM';
  hour: number;
  minute: number;
} {
  const [hourStr, minuteStr] = time24.split(':');
  const hour24 = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (hour24 === 0) {
    return { period: 'AM', hour: 12, minute };
  } else if (hour24 < 12) {
    return { period: 'AM', hour: hour24, minute };
  } else if (hour24 === 12) {
    return { period: 'PM', hour: 12, minute };
  } else {
    return { period: 'PM', hour: hour24 - 12, minute };
  }
}

/**
 * 12시간 형식을 24시간 형식으로 변환
 * @param period "AM" | "PM"
 * @param hour 1-12
 * @param minute 0-59
 * @returns 24시간 형식 (예: "23:30")
 */
export function convert12To24(
  period: 'AM' | 'PM',
  hour: number,
  minute: number
): string {
  let hour24: number;

  if (period === 'AM') {
    if (hour === 12) {
      hour24 = 0;
    } else {
      hour24 = hour;
    }
  } else {
    // PM
    if (hour === 12) {
      hour24 = 12;
    } else {
      hour24 = hour + 12;
    }
  }

  return `${hour24.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}`;
}
