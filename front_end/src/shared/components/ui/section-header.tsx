import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

interface SectionHeaderProps {
  /** 섹션 제목 */
  title: string;
  subTitle?: string;
  /** 전체보기 버튼 클릭 핸들러 (선택사항) */
  onPress?: () => void;
  /** 전체보기 버튼 텍스트 (기본값: '전체보기') */
  actionText?: string;
}

/**
 * 섹션 헤더 컴포넌트
 * 제목과 선택적 전체보기 버튼을 표시합니다.
 */
export function SectionHeader({
  title,
  subTitle,
  onPress,
  actionText = '전체보기',
}: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';

  return (
    <View className="pb-4 px-4">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-end gap-2">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </Text>
          {subTitle && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {subTitle}
            </Text>
          )}
        </View>
        {onPress && (
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={onPress}
          >
            <Text className="text-sm font-medium text-gray-900 dark:text-gray-300">
              {actionText}
            </Text>
            <IconSymbol size={16} name="chevron.right" color={iconColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
