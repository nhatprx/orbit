import { useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '../../services/auth.service';
import type {
  AuthSession,
  LoginPayload,
  OAuthProvider,
  RegisterPayload,
} from '../../types/auth.types';

export type AuthMode = 'login' | 'register' | 'forgot' | 'mfa';

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useAuthPageState(
  initialError: string | null,
  onSuccess: (session: AuthSession) => void,
  initialMode: AuthMode = 'login',
  initialMfaToken: string | null = null
) {
  const [mode, setMode] = useState<AuthMode>(initialMfaToken ? 'mfa' : initialMode);
  const [mfaToken, setMfaToken] = useState<string | null>(initialMfaToken);
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
    const onShow = (e: PageTransitionEvent) => { if (e.persisted || oauthPendingRef.current) resetPendingState(); };
    const onVis = () => { if (document.visibilityState === 'visible' && oauthPendingRef.current) resetPendingState(); };
    const onFocus = () => { if (oauthPendingRef.current) resetPendingState(); };
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [resetPendingState]);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  useEffect(() => {
    if (initialMfaToken) {
      setMfaToken(initialMfaToken);
      setMode('mfa');
    }
  }, [initialMfaToken]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    oauthPendingRef.current = false;
  }, []);

  async function runSessionAction(
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

  async function handleLoginSubmit(payload: LoginPayload) {
    resetPendingState();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await authService.login(payload, controller.signal);
      if (requestIdRef.current !== requestId) return;
      if (res.mfaRequired && res.mfaToken) {
        setMfaToken(res.mfaToken);
        setMode('mfa');
        return;
      }
      if (res.user && res.accessToken && res.expiresAt) {
        onSuccess({ user: res.user, accessToken: res.accessToken, expiresAt: res.expiresAt });
      }
    } catch (err) {
      if (requestIdRef.current !== requestId || isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      if (requestIdRef.current === requestId) setSubmitting(false);
    }
  }

  function handleMfaSubmit(code: string) {
    if (!mfaToken) return Promise.resolve();
    return runSessionAction(
      (signal) => authService.completeMfaLogin(mfaToken, code, signal),
      'Two-factor verification failed.'
    );
  }

  function handleRegisterSubmit(payload: RegisterPayload) {
    return runSessionAction((signal) => authService.register(payload, signal), 'Registration failed.');
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
    if (nextMode !== 'mfa') setMfaToken(null);
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
    handleMfaSubmit,
    handleRegisterSubmit,
    handleOAuth,
    switchMode,
    handleResetSuccess,
  };
}
