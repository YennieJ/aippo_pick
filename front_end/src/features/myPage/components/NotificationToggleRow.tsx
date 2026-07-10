import type { ReactNode } from 'react';
import { Switch, Text, View } from 'react-native';

type Props = {
  title: string;
  /** 자동 발송 시각 등 보조 설명 (예: "매일 오전 10:00 자동") */
  subtitle?: string;
  value: boolean;
  /** true면 회색 처리 + 스위치 비활성 (전체 알림 OFF일 때) */
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  /** 마지막 행이면 하단 보더 제거 */
  isLast?: boolean;
  /** 스위치 왼쪽에 붙는 부가 요소 (예: 오늘의 공모주 시간 칩) */
  rightAccessory?: ReactNode;
};

/**
 * 알림 종류별 On/Off 토글 행.
 * 마이페이지 "알림 설정" 카드의 기존 전체 알림 행과 동일한 스타일.
 */
export function NotificationToggleRow({
  title,
  subtitle,
  value,
  disabled = false,
  onValueChange,
  isLast = false,
  rightAccessory,
}: Props) {
  return (
    <View
      className={`min-h-[54px] px-4 py-3 flex-row justify-between items-center ${
        isLast ? '' : 'border-b border-gray-200 dark:border-gray-700'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-1 pr-3">
        <Text
          className={`text-sm font-medium ${
            disabled
              ? 'text-gray-500 dark:text-gray-300'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAccessory}

      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#5B9FFF' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
