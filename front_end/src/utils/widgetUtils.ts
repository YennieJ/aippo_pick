import { NativeModules, Platform } from 'react-native';
import type { IpoData } from '../features/ipo/types/ipo.types';
import {
  calcDDay,
  getNearestStatusAndDate,
  parseYmdToDate,
} from '../shared/utils/dday.utils';

const { WidgetModule } = NativeModules;

// 위젯은 최대 6종목(medium=3, large=6)을 표시
const WIDGET_MAX_ROWS = 6;

interface WidgetTableData {
  [key: string]: string | undefined;
}

/**
 * 앱과 동일 규칙의 디데이 텍스트
 * - 과거: "-" (앱에서는 숨김)
 * - 오늘: "D-Day"
 * - 미래: "D-N"
 */
function getAppDdayTextFromDateString(dateString?: string | null): string {
  const date = parseYmdToDate(dateString);
  if (!date) return '-';

  const dday = calcDDay(date);
  if (dday < 0) return '-';
  if (dday === 0) return 'D-Day';
  return `D-${dday}`;
}

function calculateWidgetDday(item: IpoData): string {
  // 상세(날짜 3종) 기준으로 통일: status는 신뢰하지 않고 무조건 날짜로 상태를 추론한다
  const nearest = getNearestStatusAndDate(
    item.subscriptiondate ?? null,
    item.listingdate ?? null,
    item.refunddate ?? null
  );
  const fallbackText = getAppDdayTextFromDateString(nearest?.dateString ?? null);
  if (fallbackText === '-') return '-';
  return nearest?.status ? `${nearest.status} ${fallbackText}` : fallbackText;
};

/**
 * 증권사 배열을 콤마로 구분된 문자열로 변환
 */
const formatSecurities = (securities?: string[]): string => {
  if (!securities || securities.length === 0) return '-';
  return securities.join(', ');
};

/**
 * 위젯 데이터 업데이트
 */
export const updateWidget = async (data: WidgetTableData): Promise<boolean> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  try {
    await WidgetModule.updateWidgetData(data);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 위젯 데이터 조회
 * @returns 위젯 데이터 또는 null
 */
export const getWidgetData = async (): Promise<WidgetTableData | null> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }

  try {
    return await WidgetModule.getWidgetData();
  } catch (error) {
    return null;
  }
};

/**
 * IPO 데이터를 위젯에 업데이트
 * @param ipoData IPO 데이터
 * @returns 업데이트 성공 여부
 */
export const updateWidgetWithIpoData = async (
  ipoData: IpoData | IpoData[]
): Promise<boolean> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  try {
    const dataArray = Array.isArray(ipoData) ? ipoData : [ipoData];

    // row1~row6 전부 채워서 보냄 (빈 슬롯은 sentinel로 덮어 이전 잔존 데이터 제거)
    const widgetData: WidgetTableData = {};
    for (let i = 0; i < WIDGET_MAX_ROWS; i++) {
      const idx = i + 1;
      const ipo = dataArray[i];
      if (ipo) {
        widgetData[`row${idx}_name`] = ipo.company;
        widgetData[`row${idx}_dday`] = calculateWidgetDday(ipo);
        widgetData[`row${idx}_price`] = ipo.confirmedprice || '-';
        widgetData[`row${idx}_securities`] = formatSecurities(ipo.bank);
      } else {
        widgetData[`row${idx}_name`] = '데이터 없음';
        widgetData[`row${idx}_dday`] = '-';
        widgetData[`row${idx}_price`] = '-';
        widgetData[`row${idx}_securities`] = '-';
      }
    }

    return await updateWidget(widgetData);
  } catch (error) {
    if (__DEV__) {
      console.error('Widget update with IPO data error:', error);
    }
    return false;
  }
};

/**
 * 위젯을 강제로 새로고침
 * @returns 새로고침 성공 여부
 */
export const forceRefreshWidget = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  try {
    const result = await WidgetModule.forceRefreshWidget();
    return true;
  } catch (error) {
    return false;
  }
};
