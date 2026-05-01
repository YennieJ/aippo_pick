import { NativeModules, Platform } from 'react-native';
import type { IpoData } from '../features/ipo/types/ipo.types';
import {
  calcDDay,
  getNearestStatusAndDate,
  parseYmdToDate,
} from '../shared/utils/dday.utils';

const { WidgetModule } = NativeModules;

interface WidgetTableData {
  row1_name?: string;
  row1_dday?: string;
  row1_price?: string;
  row1_securities?: string;
  row2_name?: string;
  row2_dday?: string;
  row2_price?: string;
  row2_securities?: string;
  row3_name?: string;
  row3_dday?: string;
  row3_price?: string;
  row3_securities?: string;
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

    if (dataArray.length === 0) {
      return await updateWidget({
        row1_name: '오늘 공모주가 없습니다',
        row1_dday: '-',
        row1_price: '-',
        row1_securities: '-',
        row2_name: '데이터 없음',
        row2_dday: '-',
        row2_price: '-',
        row2_securities: '-',
        row3_name: '데이터 없음',
        row3_dday: '-',
        row3_price: '-',
        row3_securities: '-',
      });
    }

    // 첫 번째 행 데이터
    const firstIpo = dataArray[0];
    const widgetData: WidgetTableData = {
      row1_name: firstIpo.company,
      row1_dday: calculateWidgetDday(firstIpo),
      row1_price: firstIpo.confirmedprice || '-',
      row1_securities: formatSecurities(firstIpo.bank),
    };

    // 두 번째 행 데이터 (있는 경우)
    if (dataArray.length > 1) {
      const secondIpo = dataArray[1];
      widgetData.row2_name = secondIpo.company;
      widgetData.row2_dday = calculateWidgetDday(secondIpo);
      widgetData.row2_price = secondIpo.confirmedprice || '-';
      widgetData.row2_securities = formatSecurities(secondIpo.bank);
    } else {
      widgetData.row2_name = '데이터 없음';
      widgetData.row2_dday = '-';
      widgetData.row2_price = '-';
      widgetData.row2_securities = '-';
    }

    // 세 번째 행 데이터 (있는 경우)
    if (dataArray.length > 2) {
      const thirdIpo = dataArray[2];
      widgetData.row3_name = thirdIpo.company;
      widgetData.row3_dday = calculateWidgetDday(thirdIpo);
      widgetData.row3_price = thirdIpo.confirmedprice || '-';
      widgetData.row3_securities = formatSecurities(thirdIpo.bank);
    } else {
      widgetData.row3_name = '데이터 없음';
      widgetData.row3_dday = '-';
      widgetData.row3_price = '-';
      widgetData.row3_securities = '-';
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
