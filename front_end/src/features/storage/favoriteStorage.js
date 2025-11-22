import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔑 이 앱에서 즐겨찾기 데이터를 저장할 때 사용할 키 이름
// - 실제 저장소에서는 key-value 형태로 저장되는데,
//   여기서는 key를 'favorites' 로 통일해서 사용함
const FAVORITES_KEY = 'favorites';

/**
 * [내부 공용 함수] 주어진 key에 저장된 JSON 배열을 읽어서 JS 배열로 변환
 * - AsyncStorage는 string만 저장 가능 → JSON 문자열로 저장했다가 다시 파싱해서 사용
 * - JSON 파싱 실패나 에러가 나도 항상 [] 를 반환해서 호출 쪽에서 안전하게 사용 가능
 *
 * @param {string} key AsyncStorage에 사용한 키 이름
 * @returns {Promise<any[]>} 배열 형식의 데이터 (배열이 아니거나 에러일 때는 [])
 */
async function loadArrayFromStorage(key) {
  try {
    // key에 해당하는 값(JSON 문자열)을 가져옴
    const json = await AsyncStorage.getItem(key);

    // 값이 없으면(null) → 아직 한 번도 저장되지 않은 상태이므로 빈 배열 반환
    if (!json) return [];

    // JSON 문자열을 JS 객체로 변환
    const parsed = JSON.parse(json);

    // 혹시라도 배열이 아니면 타입이 예상과 다르다는 뜻 → 방어적으로 빈 배열 처리
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // 디버깅용 로그 (어떤 key에서 문제가 났는지 함께 출력)
    console.log(`[storage] loadArrayFromStorage error (${key})`, e);
    return [];
  }
}

/**
 * [내부 공용 함수] JS 배열을 JSON 문자열로 변환해서 AsyncStorage에 저장
 *
 * @param {string} key AsyncStorage에 사용할 키 이름
 * @param {any[]} list 저장할 배열 (null/undefined여도 []로 저장)
 */
async function saveArrayToStorage(key, list) {
  try {
    // list가 null/undefined이면 []로 대체해서 저장
    await AsyncStorage.setItem(key, JSON.stringify(list ?? []));
  } catch (e) {
    console.log(`[storage] saveArrayToStorage error (${key})`, e);
  }
}

/**
 * 💛 즐겨찾기 전체 가져오기
 *
 * - FAVORITES_KEY('favorites') 아래에 저장된 배열을 그대로 가져옴
 * - 항상 "문자열 배열"을 기대하지만, 내부에서는 any[]로 받아서 사용 쪽에서 타입 맞춰도 됨
 * - 에러가 나도 [] 반환하므로, 화면에서 map() 같은 거 바로 써도 안전함
 *
 * @returns {Promise<string[]>} 즐겨찾기된 공모주 ID 리스트
 */
export async function loadFavorites() {
  return await loadArrayFromStorage(FAVORITES_KEY);
}

/**
 * 💾 즐겨찾기 전체 저장
 *
 * - 이미 가공된 즐겨찾기 리스트(문자열 배열)를 한 번에 저장할 때 사용
 * - list가 없거나 null이어도 내부에서 []로 치환해서 저장
 *
 * @param {string[]} list 저장할 즐겨찾기 ID 배열
 * @returns {Promise<void>}
 */
export async function saveFavorites(list) {
  await saveArrayToStorage(FAVORITES_KEY, list);
}

/**
 * ⭐ 특정 공모주 즐겨찾기 토글
 *
 * 동작 방식:
 *  1. 현재 저장된 즐겨찾기 배열을 불러옴
 *  2. 인자로 받은 ipoId가 이미 배열 안에 있는지 확인
 *  3. 이미 있으면 → 해당 ID 제거 (즐겨찾기 해제)
 *     없으면 → 배열에 추가 (즐겨찾기 설정)
 *  4. 변경된 배열을 다시 저장
 *  5. 최종 결과 배열을 반환해서, 화면 상태(favorites / isFavorite 등)를 업데이트할 때 사용
 *
 * @param {string} ipoId 즐겨찾기 토글할 공모주 ID
 * @returns {Promise<string[]>} 업데이트된 전체 즐겨찾기 리스트
 */
export async function toggleFavorite(ipoId) {
  // 현재 저장된 즐겨찾기 리스트 불러오기
  const current = await loadFavorites();

  // 현재 리스트 안에 이 ID가 이미 있는지 여부
  const exists = current.includes(ipoId);

  // exists에 따라 next 배열 구성
  // - 이미 있으면: 해당 id만 제거
  // - 없으면: 기존 리스트 뒤에 새 id 추가(또는 앞에 추가해도 상관 없음 → 정책에 따라 변경 가능)
  const next = exists
    ? current.filter(id => id !== ipoId) // 제거
    : [...current, ipoId];               // 추가

  // 변경된 결과를 다시 저장
  await saveFavorites(next);

  // 화면 쪽에서 즉시 상태 업데이트에 사용할 수 있도록 전체 리스트 반환
  return next;
}


