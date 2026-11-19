import { useState } from 'react';
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

  function handleAuthSuccess(nextSession: AuthSession) {
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
