import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  /** 확인 버튼 라벨 (기본: '확인') */
  confirmText?: string;
  /** 취소 버튼 라벨 (기본: '취소') */
  cancelText?: string;
  /** 파괴적 액션(로그아웃, 삭제 등) → 빨간 확인 버튼 */
  destructive?: boolean;
  /** 확인 버튼 로딩 중 표시용 — 활성화 시 버튼 비활성화 + 라벨 대체 */
  loading?: boolean;
  /**
   * 취소 버튼 숨김 (info/에러 알림용).
   * true면 확인 버튼만 표시되고, 배경/뒤로가기도 onConfirm으로 처리된다.
   */
  hideCancel?: boolean;
  onConfirm: () => void;
  /** hideCancel=true일 때는 선택 (내부적으로 onConfirm로 폴백) */
  onCancel?: () => void;
};

/**
 * 프로젝트 디자인 시스템에 맞춘 확인 다이얼로그.
 *
 * - 중앙 정렬 카드 형태 (fade 애니메이션)
 * - 바깥 영역 탭하거나 Android 뒤로가기로 닫기
 * - 기본은 노란색(브랜드) 확인 버튼, destructive=true면 빨간색
 *
 * 사용 예:
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <ConfirmDialog
 *   visible={open}
 *   title="로그아웃"
 *   message="정말 로그아웃 하시겠습니까?"
 *   confirmText="로그아웃"
 *   destructive
 *   onConfirm={() => { logout(); setOpen(false); }}
 *   onCancel={() => setOpen(false)}
 * />
 * ```
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  destructive = false,
  loading = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // hideCancel=true이면 배경/뒤로가기도 onConfirm로 처리 (취소 개념이 없음)
  const handleDismiss = hideCancel ? onConfirm : (onCancel ?? onConfirm);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        {/* 배경: 탭 시 닫힘 */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleDismiss}
        />

        {/* 다이얼로그 카드 */}
        <View className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 px-6 pt-6 pb-4 shadow-xl">
          {/* 타이틀 */}
          <Text
            className="text-lg font-bold text-gray-900 dark:text-white text-center"
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* 메시지 (선택) */}
          {message ? (
            <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center leading-5">
              {message}
            </Text>
          ) : null}

          {/* 버튼 영역 */}
          <View className="flex-row mt-5 gap-2">
            {/* 취소 (hideCancel=false일 때만) */}
            {!hideCancel && (
              <Pressable
                onPress={onCancel}
                disabled={loading}
                className="flex-1 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 py-3"
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {cancelText}
                </Text>
              </Pressable>
            )}

            {/* 확인 */}
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className={`flex-1 items-center justify-center rounded-xl py-3 ${
                destructive
                  ? 'bg-red-500'
                  : 'bg-[#FED45C] dark:bg-[#D4A72C]'
              }`}
              android_ripple={{
                color: destructive
                  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(0,0,0,0.1)',
              }}
              style={({ pressed }) => ({
                opacity: pressed || loading ? 0.7 : 1,
              })}
            >
              <Text
                className={`text-sm font-bold ${
                  destructive ? 'text-white' : 'text-black dark:text-white'
                }`}
              >
                {loading ? '처리 중...' : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
