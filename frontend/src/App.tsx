import { useCallback, useEffect, useState } from 'react';
import { AuthPage } from './modules/auth/AuthPage';
import type { AuthMode } from './modules/auth/useAuthPageLifecycle';
import { DashboardShell } from './modules/dashboard/DashboardShell';
import { HomePage } from './modules/home/HomePage';
import { InviteAcceptPage } from './modules/invite/InviteAcceptPage';
import { authService } from './services/auth.service';
import { updateStoredSessionUser } from './services/auth.storage';
import { SESSION_EXPIRED_EVENT } from './services/workspace/httpClient';
import { chatConnection } from './services/workspace/httpChat.service';
import { acceptPendingInvite } from './services/workspace/inviteFlow';
import { parseInviteToken, savePendingInvite } from './services/workspace/pendingInvite';
import { invitationService } from './services/workspace/services';
import { workspaceActions } from './store/workspaceActions';
import type { AuthSession, AuthUser } from './types/auth.types';
import type { ProfileSectionId } from './types/dashboard.types';

type AppRoute = 'home' | 'auth' | 'dashboard' | 'invite';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => authService.getSession());
  const [inviteToken, setInviteToken] = useState<string | null>(() => parseInviteToken(window.location.pathname));
  const [route, setRoute] = useState<AppRoute>(() =>
    parseInviteToken(window.location.pathname) ? 'invite' : authService.getSession() ? 'dashboard' : 'home'
  );
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pendingMfaToken, setPendingMfaToken] = useState<string | null>(null);
  const [joinedWorkspaceId, setJoinedWorkspaceId] = useState<string | null>(null);
  const [initialProfileSection, setInitialProfileSection] = useState<ProfileSectionId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const leaveInviteUrl = useCallback(() => {
    if (window.location.pathname.startsWith('/invite/')) {
      window.history.replaceState({}, document.title, '/');
    }
    setInviteToken(null);
  }, []);

  /** After any successful sign-in: join the invitation saved before authentication, then open the app. */
  const completeSignIn = useCallback(
    async (nextSession: AuthSession) => {
      setOauthError(null);
      setPendingMfaToken(null);
      setSession(nextSession);
      const outcome = await acceptPendingInvite(invitationService);
      if (outcome.status === 'joined') setJoinedWorkspaceId(outcome.workspaceId);
      setNotice(outcome.status === 'failed' ? outcome.message : null);
      leaveInviteUrl();
      setRoute('dashboard');
    },
    [leaveInviteUrl]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get('oauth_code');
    const errorParam = params.get('oauth_error');
    const oauthLinked = params.get('oauth_linked');
    const oauthLinkError = params.get('oauth_link_error');
    if (!oauthCode && !errorParam && !oauthLinked && !oauthLinkError) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    if (oauthLinked || oauthLinkError) {
      setInitialProfileSection('settings');
      setNotice(
        oauthLinked
          ? `Connected ${oauthLinked.charAt(0).toUpperCase() + oauthLinked.slice(1)} account successfully.`
          : oauthLinkError
      );
      if (authService.getSession()) setRoute('dashboard');
      return;
    }
    if (errorParam) {
      setOauthError(errorParam);
      setRoute('auth');
      return;
    }
    if (oauthCode) {
      authService
        .exchangeOAuthCode(oauthCode)
        .then((res) => {
          if (res.mfaRequired && res.mfaToken) {
            setPendingMfaToken(res.mfaToken);
            setRoute('auth');
            return;
          }
          if (res.user && res.accessToken && res.expiresAt) {
            return completeSignIn({ user: res.user, accessToken: res.accessToken, expiresAt: res.expiresAt });
          }
          throw new Error('OAuth exchange failed.');
        })
        .catch((err) => {
          setOauthError(err instanceof Error ? err.message : 'OAuth exchange failed.');
          setRoute('auth');
        });
    }
  }, [completeSignIn]);

  useEffect(() => {
    function handleExpired() {
      workspaceActions.reset();
      chatConnection.close();
      setSession(null);
      setNotice('Your session expired. Sign in again.');
      setRoute('auth');
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const handleUserUpdated = useCallback((nextUser: AuthUser) => {
    const stored = updateStoredSessionUser(nextUser);
    setSession((prev) => stored ?? (prev ? { ...prev, user: nextUser } : prev));
  }, []);

  async function handleLogout() {
    await authService.logout();
    workspaceActions.reset();
    chatConnection.close();
    setSession(null);
    setNotice(null);
    setJoinedWorkspaceId(null);
    setInitialProfileSection(null);
    setRoute('home');
  }

  if (route === 'invite' && inviteToken) {
    return (
      <InviteAcceptPage
        token={inviteToken}
        session={session}
        onJoined={(workspaceId) => {
          setJoinedWorkspaceId(workspaceId);
          leaveInviteUrl();
          setRoute('dashboard');
        }}
        onNeedAuth={(mode) => {
          savePendingInvite(inviteToken);
          setAuthMode(mode);
          setRoute('auth');
        }}
        onClose={() => {
          leaveInviteUrl();
          setRoute(session ? 'dashboard' : 'home');
        }}
      />
    );
  }

  if (route === 'auth') {
    return (
      <AuthPage
        initialError={oauthError ?? notice}
        initialMode={authMode}
        initialMfaToken={pendingMfaToken}
        onSuccess={(next) => void completeSignIn(next)}
        onBackHome={() => { setPendingMfaToken(null); setRoute('home'); }}
      />
    );
  }

  if (route === 'dashboard' && session) {
    return (
      <DashboardShell
        session={session}
        initialWorkspaceId={joinedWorkspaceId}
        initialProfileSection={initialProfileSection}
        notice={notice}
        onUserUpdated={handleUserUpdated}
        onNavigateHome={() => setRoute('home')}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return (
    <HomePage
      session={session}
      onNavigateAuth={() => setRoute('auth')}
      onNavigateDashboard={() => setRoute(session ? 'dashboard' : 'auth')}
    />
  );
}
