import { useEffect, useState } from 'react';
import { AuthPage } from './modules/auth/AuthPage';
import { DashboardShell } from './modules/dashboard/DashboardShell';
import { HomePage } from './modules/home/HomePage';
import { authService } from './services/auth.service';
import type { AuthSession } from './types/auth.types';

type AppRoute = 'home' | 'auth' | 'dashboard';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    authService.getSession()
  );
  const [route, setRoute] = useState<AppRoute>(() =>
    authService.getSession() ? 'dashboard' : 'home'
  );
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get('oauth_code');
    const errorParam = params.get('oauth_error');

    if (!oauthCode && !errorParam) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    if (errorParam) {
      setOauthError(errorParam);
      setRoute('auth');
      return;
    }

    if (oauthCode) {
      authService
        .exchangeOAuthCode(oauthCode)
        .then((nextSession) => {
          setSession(nextSession);
          setRoute('dashboard');
        })
        .catch((err) => {
          setOauthError(
            err instanceof Error ? err.message : 'OAuth exchange failed.'
          );
          setRoute('auth');
        });
    }
  }, []);

  function handleAuthSuccess(nextSession: AuthSession) {
    setOauthError(null);
    setSession(nextSession);
    setRoute('dashboard');
  }

  async function handleLogout() {
    await authService.logout();
    setSession(null);
    setRoute('home');
  }

  if (route === 'auth') {
    return (
      <AuthPage
        initialError={oauthError}
        onSuccess={handleAuthSuccess}
        onBackHome={() => setRoute('home')}
      />
    );
  }

  if (route === 'dashboard' && session) {
    return (
      <DashboardShell
        session={session}
        onNavigateHome={() => setRoute('home')}
        onLogout={handleLogout}
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
