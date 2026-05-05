import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_DURATION_MS = 1500;
const FADE_MS = 200;

type ToastOptions = {
  duration?: number;
};

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Provider 외부에서 호출되더라도 호출부가 폭발하지 않도록 no-op 반환.
    return { show: () => {} };
  }
  return ctx;
}

type Internal = { message: string; duration: number; key: number } | null;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Internal>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const insets = useSafeAreaInsets();

  const clearDismissTimer = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 8,
        duration: FADE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setState(null);
    });
  }, [opacity, translateY]);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const duration = options?.duration ?? DEFAULT_DURATION_MS;
      clearDismissTimer();
      // 새 메시지로 즉시 교체 (큐 미관리). key를 바꿔 fade-in을 다시 트리거.
      setState({ message, duration, key: Date.now() });
    },
    [],
  );

  // state가 바뀔 때 fade-in 시작 + 자동 dismiss 타이머 등록
  useEffect(() => {
    if (!state) return;
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    dismissTimer.current = setTimeout(() => {
      animateOut();
    }, state.duration);

    return clearDismissTimer;
  }, [state, opacity, translateY, animateOut]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return clearDismissTimer;
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {state ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 24,
            alignItems: 'center',
            opacity,
            transform: [{ translateY }],
          }}
        >
          <View
            className="rounded-full bg-gray-900 px-4 py-2.5 dark:bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 6,
              maxWidth: '88%',
            }}
          >
            <Text
              numberOfLines={2}
              className="text-sm font-medium text-white dark:text-gray-900"
            >
              {state.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
