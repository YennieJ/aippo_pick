import React from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { openBrokerApp } from '../../utils/linking.utils';

interface DeepLinkButtonProps {
  /** 증권사 이름 */
  brokerName: string;
  /** 버튼 텍스트 (기본값: '바로가기') */
  buttonText?: string;
  /** 커스텀 스타일 */
  style?: ViewStyle;
  /** 버튼 텍스트 스타일 */
  textStyle?: TextStyle;
  /** 클릭 핸들러 (선택사항, 기본 동작을 오버라이드) */
  onPress?: () => void | Promise<void>;
}

/**
 * 증권사 앱 딥링크를 여는 버튼 컴포넌트
 */
export function DeepLinkButton({
  brokerName,
  buttonText = '바로가기',
  style,
  textStyle,
  onPress,
}: DeepLinkButtonProps) {
  const handlePress = async () => {
    if (onPress) {
      await onPress();
    } else {
      await openBrokerApp(brokerName);
    }
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handlePress}>
      <Text style={[styles.buttonText, textStyle]}>{buttonText}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
