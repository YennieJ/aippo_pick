import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAllBrokers } from '../../../features/ipo/hooks/useIpoQueries';
import { cn } from '../../../lib/cn';
import { openDeepLink } from '../../utils/linking.utils';

interface DeepLinkButtonProps {
  /** 증권사 이름 */
  brokerName: string;
  /** 버튼 텍스트 (기본값: '바로가기') */
  buttonText?: string;
  /** 커스텀 className */
  className?: string;
  /** 버튼 텍스트 className */
  textClassName?: string;
  /** 클릭 핸들러 (선택사항, 기본 동작을 오버라이드) */
  onPress?: () => void | Promise<void>;
}

/**
 * 증권사 앱 딥링크를 여는 버튼 컴포넌트
 */
export function DeepLinkButton({
  brokerName,
  buttonText = '바로가기',
  className,
  textClassName,
  onPress,
}: DeepLinkButtonProps) {
  const { data: allBrokers = [] } = useAllBrokers();

  // API에서 받아온 broker 데이터에서 찾기
  const broker = allBrokers.find((b: any) => b.broker_name === brokerName);

  const handlePress = async () => {
    if (onPress) {
      await onPress();
      return;
    }

    if (!broker) {
      return;
    }

    // API 데이터로 딥링크 열기
    await openDeepLink(
      broker.scheme,
      broker.play_store_url,
      broker.app_atore_url
    );
  };

  // 일치하는 이름이 없으면 버튼을 렌더링하지 않음
  if (!broker) {
    return null;
  }

  return (
    <TouchableOpacity
      className={cn(
        'bg-[#4A90E2] dark:bg-[#3A7BC8] px-4 py-2 rounded-md',
        className
      )}
      onPress={handlePress}
    >
      <Text className={cn('text-white text-sm font-semibold', textClassName)}>
        {buttonText}
      </Text>
    </TouchableOpacity>
  );
}
