import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { bootstrapAuthSession } from '../bootstrap-auth-session';

type AuthGateValue = {
  /** 앱 기동 시 세션 부트스트랩(토큰·/auth/me) 완료 여부 */
  isAuthReady: boolean;
};

const AuthGateContext = createContext<AuthGateValue>({
  isAuthReady: false,
});

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await bootstrapAuthSession(queryClient);
      if (!cancelled) setIsAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const value = useMemo(() => ({ isAuthReady }), [isAuthReady]);

  return (
    <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateValue {
  return useContext(AuthGateContext);
}
