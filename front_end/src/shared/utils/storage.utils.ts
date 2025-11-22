import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 스토리지 키 상수
 */
export const STORAGE_KEYS = {
  /** 즐겨찾기 공모주 ID 리스트 */
  FAVORITES: 'favorites',
  /** 최근 본 공모주 ID 리스트 */
  RECENT_IPO: 'recent_ipo',
  // 필요시 추가 키들을 여기에 정의
} as const satisfies Record<string, string>;

/**
 * AsyncStorage에서 문자열 배열을 불러오기
 * @param key 저장소 키
 * @returns Promise<string[]> 문자열 배열 (에러 시 빈 배열)
 */
export async function loadStringArray(key: string): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (!json) return [];

    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch (e) {
    return [];
  }
}

/**
 * AsyncStorage에 문자열 배열 저장하기
 * @param key 저장소 키
 * @param list 저장할 문자열 배열
 */
export async function saveStringArray(
  key: string,
  list: string[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list ?? []));
  } catch (e) {
    // 저장 실패 시 무시
  }
}

/**
 * AsyncStorage에서 객체 불러오기
 * @param key 저장소 키
 * @returns Promise<T | null> 파싱된 객체 (에러 시 null)
 */
export async function loadObject<T>(key: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (!json) return null;

    return JSON.parse(json) as T;
  } catch (e) {
    return null;
  }
}

/**
 * AsyncStorage에 객체 저장하기
 * @param key 저장소 키
 * @param value 저장할 객체
 */
export async function saveObject<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 저장 실패 시 무시
  }
}

/**
 * AsyncStorage에서 문자열 불러오기
 * @param key 저장소 키
 * @returns Promise<string | null> 저장된 문자열 (없으면 null)
 */
export async function loadString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

/**
 * AsyncStorage에 문자열 저장하기
 * @param key 저장소 키
 * @param value 저장할 문자열
 */
export async function saveString(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // 저장 실패 시 무시
  }
}

/**
 * AsyncStorage에서 특정 키 삭제하기
 * @param key 삭제할 키
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // 삭제 실패 시 무시
  }
}

/**
 * AsyncStorage의 모든 키-값 쌍 삭제하기
 */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    // 삭제 실패 시 무시
  }
}

/**
 * AsyncStorage에 저장된 모든 키 가져오기
 * @returns Promise<string[]> 모든 키 배열
 */
export async function getAllKeys(): Promise<string[]> {
  try {
    return [...(await AsyncStorage.getAllKeys())];
  } catch (e) {
    return [];
  }
}
