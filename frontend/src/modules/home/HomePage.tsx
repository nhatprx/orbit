import {
  ArrowRight,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers,
  Mail,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AuthSession } from '../../types/auth.types';

interface HomePageProps {
  session: AuthSession | null;
  onNavigateAuth: () => void;
  onNavigateDashboard: () => void;
}

const WORKSPACE_AREAS = [
  { id: 'git', name: 'Git', icon: GitBranch, note: 'Repositories and pull requests' },
  { id: 'docs', name: 'Docs', icon: FileText, note: 'Collaborative documents' },
  { id: 'sheets', name: 'Sheets', icon: FileSpreadsheet, note: 'Structured spreadsheets' },
  { id: 'chat', name: 'Chat', icon: MessageSquare, note: 'Real-time workspace and project messaging' },
  { id: 'workspaces', name: 'Workspaces', icon: Users, note: 'Invite teammates and manage custom roles' },
  { id: 'mail', name: 'Mails', icon: Mail, note: 'Connect your own mailbox from the header' },
];

export function HomePage({
  session,
  onNavigateAuth,
  onNavigateDashboard,
}: HomePageProps) {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <header className="border-b border-[#30363D] bg-[#161B22]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight">ORBIT</span>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <Button variant="primary" onClick={onNavigateDashboard}>
                Open Dashboard
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={onNavigateAuth}>
                  Sign In
                </Button>
                <Button variant="primary" onClick={onNavigateAuth}>
                  Launch Workspace
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="mb-14 border border-[#30363D] bg-[#161B22] p-8 md:p-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="green" withDot>
              10,000+ CCU ARCHITECTURE
            </Badge>
            <Badge tone="neutral">REACT + SPRING BOOT + POSTGRESQL + REDIS</Badge>
          </div>
          <h1 className="mb-4 max-w-2xl text-3xl font-semibold tracking-tight text-[#E6EDF3] md:text-4xl">
            Minimal Developer Workspace Platform. Built for Scale.
          </h1>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[#A3A3A3]">
            Orbit organizes work into workspaces and projects. Enable Git, Docs,
            Sheets, and Chat where you need them, connect your own mailbox, and
            control access with custom roles.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={session ? onNavigateDashboard : onNavigateAuth}
            >
              {session ? 'Go to Dashboard' : 'Sign In to Workspace'}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
            {session && (
              <Badge tone="neutral">
                SIGNED IN AS {session.user.role.toUpperCase()} ({session.user.email})
              </Badge>
            )}
          </div>
        </section>

        <section className="mb-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A3A3A3]">
              Modules
            </h2>
            <span className="font-mono text-xs text-[#666666]">
              PER WORKSPACE AND PROJECT
            </span>
          </div>
          <div className="grid grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] sm:grid-cols-2 lg:grid-cols-3">
            {WORKSPACE_AREAS.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.id} className="bg-[#161B22] p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <Icon className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                    <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-[#E6EDF3]">
                    {area.name}
                  </h3>
                  <p className="text-xs text-[#A3A3A3]">{area.note}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="border border-[#30363D] bg-[#161B22] p-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#22C55E]">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              Role Separation
            </div>
            <p className="text-xs leading-relaxed text-[#A3A3A3]">
              Custom roles at both workspace and project level, checked by permission
              key on every request, with strict tenant isolation and Redis-backed
              session governance.
            </p>
          </div>
          <div className="border border-[#30363D] bg-[#161B22] p-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#22C55E]">
              <Layers className="h-4 w-4" strokeWidth={1.5} />
              Production Ready Stack
            </div>
            <p className="text-xs leading-relaxed text-[#A3A3A3]">
              Containerized Docker deployment on AWS with PostgreSQL primary storage,
              Redis caching, and modular service boundaries.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
