import {
  ArrowRight,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers,
  Mail,
  Presentation,
  ShieldCheck,
  Terminal,
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
  { id: 'git', name: 'Git', icon: GitBranch, note: 'Code & version control workspace' },
  { id: 'mail', name: 'Mail', icon: Mail, note: 'Unified developer messaging' },
  { id: 'docs', name: 'Docs', icon: FileText, note: 'Structured engineering docs' },
  { id: 'sheets', name: 'Sheets', icon: FileSpreadsheet, note: 'High-density data grids' },
  { id: 'ppt', name: 'Presentations', icon: Presentation, note: 'Technical slide decks' },
  { id: 'markdown', name: 'Markdown', icon: Terminal, note: 'Fast plain-text knowledge base' },
];

export function HomePage({
  session,
  onNavigateAuth,
  onNavigateDashboard,
}: HomePageProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5]">
      <header className="border-b border-[#1F1F1F] bg-[#0A0A0A]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-xs font-semibold text-[#22C55E]">
              OR
            </div>
            <span className="text-sm font-semibold tracking-tight">ORBIT</span>
            <Badge tone="green" withDot>
              PHASE 1
            </Badge>
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
        <section className="mb-14 border border-[#1F1F1F] bg-[#0A0A0A] p-8 md:p-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="green" withDot>
              10,000+ CCU ARCHITECTURE
            </Badge>
            <Badge tone="neutral">REACT + SPRING BOOT + POSTGRESQL + REDIS</Badge>
          </div>
          <h1 className="mb-4 max-w-2xl text-3xl font-semibold tracking-tight text-[#F5F5F5] md:text-4xl">
            Minimal Developer Workspace Platform. Built for Scale.
          </h1>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[#A3A3A3]">
            Orbit unifies Git, Mail, Docs, Sheets, Presentations, and Markdown into
            one distraction-free environment with strict role-based access control
            for Admin and User workspaces.
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
              Workspace Areas
            </h2>
            <span className="font-mono text-xs text-[#666666]">
              UI MOCKUP SCOPE
            </span>
          </div>
          <div className="grid grid-cols-1 gap-px border border-[#1F1F1F] bg-[#1F1F1F] sm:grid-cols-2 lg:grid-cols-3">
            {WORKSPACE_AREAS.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.id} className="bg-[#0A0A0A] p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <Icon className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                    <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-[#F5F5F5]">
                    {area.name}
                  </h3>
                  <p className="text-xs text-[#A3A3A3]">{area.note}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#22C55E]">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              Role Separation
            </div>
            <p className="text-xs leading-relaxed text-[#A3A3A3]">
              Dedicated Admin and User workspace views with strict tenant isolation
              and Redis-backed session governance.
            </p>
          </div>
          <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6">
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
