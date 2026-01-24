import React from 'react';
import { Platform, View, ViewProps } from 'react-native';

interface WebContainerProps extends ViewProps {
  children: React.ReactNode;
  /** 최대 너비 (기본값: 640) */
  maxWidth?: number;
}

/**
 * 웹에서 최대 너비를 제한하고 중앙 정렬하는 컨테이너
 * 앱에서는 그대로 children을 렌더링합니다.
 */
export function WebContainer({
  children,
  maxWidth = 640,
  style,
  ...props
}: WebContainerProps) {
  const isWeb = Platform.OS === 'web';

  if (!isWeb) {
    return <>{children}</>;
  }

  return (
    <View
      style={[
        {
          flex: 1,
          width: '100%',
          maxWidth,
          alignSelf: 'center',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
