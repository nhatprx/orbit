import { useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '../../services/auth.service';
import type {
  AuthSession,
  LoginPayload,
  OAuthProvider,
  RegisterPayload,
} from '../../types/auth.types';

export type AuthMode = 'login' | 'register' | 'forgot';

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useAuthPageState(
  initialError: string | null,
  onSuccess: (session: AuthSession) => void
) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const oauthPendingRef = useRef(false);

  const resetPendingState = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    oauthPendingRef.current = false;
    setSubmitting(false);
    setOauthProvider(null);
  }, []);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || oauthPendingRef.current) resetPendingState();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && oauthPendingRef.current) {
        resetPendingState();
      }
    };
    const handleFocus = () => {
      if (oauthPendingRef.current) resetPendingState();
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [resetPendingState]);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
      oauthPendingRef.current = false;
    };
  }, []);

  async function runAuthAction(
    action: (signal: AbortSignal) => Promise<AuthSession>,
    fallbackError: string
  ) {
    resetPendingState();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const session = await action(controller.signal);
      if (requestIdRef.current !== requestId) return;
      onSuccess(session);
    } catch (err) {
      if (requestIdRef.current !== requestId || isAbortError(err)) return;
      setError(err instanceof Error ? err.message : fallbackError);
    } finally {
      if (requestIdRef.current === requestId) setSubmitting(false);
    }
  }

  function handleLoginSubmit(payload: LoginPayload) {
    return runAuthAction(
      (signal) => authService.login(payload, signal),
      'Authentication failed.'
    );
  }

  function handleRegisterSubmit(payload: RegisterPayload) {
    return runAuthAction(
      (signal) => authService.register(payload, signal),
      'Registration failed.'
    );
  }

  function handleOAuth(provider: OAuthProvider) {
    resetPendingState();
    setError(null);
    setNotice(null);
    oauthPendingRef.current = true;
    setOauthProvider(provider);
    authService.startOAuthLogin(provider);
  }

  function switchMode(nextMode: AuthMode) {
    resetPendingState();
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  function handleResetSuccess(message: string) {
    resetPendingState();
    setMode('login');
    setError(null);
    setNotice(message);
  }

  return {
    mode,
    submitting,
    oauthProvider,
    isBusy: submitting || oauthProvider !== null,
    error,
    notice,
    resetPendingState,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleOAuth,
    switchMode,
    handleResetSuccess,
  };
}
