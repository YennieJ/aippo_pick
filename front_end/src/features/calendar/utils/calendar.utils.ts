// 날짜 포맷
export const formatDate = (year: number, month: number, day: number) => {
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(
    2,
    '0'
  )}`;
};

// 월의 날짜 배열 생성 (주 단위로 그룹화, 주말 제외)
export const generateCalendarWeeks = (year: number, month: number) => {
  const weeks: Array<Array<{ day: number; isCurrentMonth: boolean } | null>> =
    [];

  // 해당 월의 1일
  const firstDate = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDate.getDay(); // 0(일) ~ 6(토)

  // 1일이 속한 주의 월요일 날짜를 계산
  let startDate: Date;
  if (firstDayOfWeek === 0) {
    // 일요일이면 이전 주 월요일부터 (6일 전)
    startDate = new Date(year, month - 1, 1 - 6);
  } else if (firstDayOfWeek === 6) {
    // 토요일이면 이전 주 월요일부터 (5일 전)
    startDate = new Date(year, month - 1, 1 - 5);
  } else {
    // 월~금이면 그 주의 월요일 (firstDayOfWeek - 1일 전)
    startDate = new Date(year, month - 1, 1 - (firstDayOfWeek - 1));
  }

  // 다음 달 1일
  const nextMonthFirstDate = new Date(year, month, 1);

  // startDate부터 다음 달 전까지 주 단위로 생성
  let currentDate = new Date(startDate);
  let currentWeek: Array<{ day: number; isCurrentMonth: boolean } | null> = [];

  while (currentDate < nextMonthFirstDate || currentWeek.length > 0) {
    const dayOfWeek = currentDate.getDay();

    // 주말이 아니면 추가
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const isCurrentMonth =
        currentDate.getMonth() === month - 1 &&
        currentDate.getFullYear() === year;

      currentWeek.push({
        day: currentDate.getDate(),
        isCurrentMonth,
      });

      // 금요일이면 주 완성
      if (dayOfWeek === 5) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 다음 날로 이동
    currentDate.setDate(currentDate.getDate() + 1);

    // 다음 달로 넘어가고 주가 완성되지 않았다면 계속 진행
    if (currentDate >= nextMonthFirstDate && currentWeek.length === 0) {
      break;
    }

    // 다음 달로 넘어가고 주가 있으면 금요일까지 채우기
    if (currentDate >= nextMonthFirstDate && currentWeek.length > 0) {
      while (currentWeek.length < 5) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          currentWeek.push({
            day: currentDate.getDate(),
            isCurrentMonth: false,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(currentWeek);
      break;
    }
  }

  return weeks;
};

// 주말인지 확인 (주말 제거했으므로 항상 false)
export const isWeekend = (dayIndex: number) => {
  return false;
};

// 요일별 너비 계산 (월~금 5일, 각 20%)
export const getDayWidth = (dayIndex: number) => {
  return 20; // 각 요일 20%
};

// 특정 요일까지의 누적 너비 계산 (이벤트 위치용)
export const getCumulativeWidth = (dayIndex: number) => {
  let width = 0;
  for (let i = 0; i < dayIndex; i++) {
    width += getDayWidth(i);
  }
  return width;
};
