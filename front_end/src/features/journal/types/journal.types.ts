/** GET /records/years 한 행 — 손익합계는 서버에서 집계해 내려준다 */
export type JournalYearSummary = {
  연도: number;
  종목수: number;
  손익합계: number;
};

/**
 * GET /records?year=
 * - 문서 스펙 기준: 매도 정보는 항상 존재(매매 완료 레코드).
 * - 손익금/수익률은 서버가 내려주는 값을 그대로 사용한다(리스트/월 합계).
 */
export type JournalRecordListItem = {
  id: number;
  종목명: string;
  종목코드: string;
  확정공모가: number;
  수량: number;
  매도가: number;
  매도일: string; // "YYYY-MM-DD"
  수수료: number;
  제세금: number;
  메모: string; // 서버에서 null이면 ""로 내려옴
  상장일: string;
  /** 서버가 내려주는 손익(리스트/집계 UI는 이 값을 기준으로 표시) */
  손익금: number;
  수익률: number;
};

/** POST/PUT 바디 */
export type JournalRecordWriteBody = Omit<JournalRecordListItem, 'id'>;

/** 종목 검색용 마스터 종목 */
export type JournalStockMaster = {
  종목명: string;
  종목코드: string;
  확정공모가: number;
  상장일: string;
  /** 사용자의 매매일지에 이미 등록된 종목 */
  이미등록됨: boolean;
};
