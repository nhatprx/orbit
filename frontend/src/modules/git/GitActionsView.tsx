import { useState } from 'react';
import { Bot, CheckCircle2, ChevronDown, ChevronRight, Clock, ExternalLink, PlayCircle, RefreshCw, RotateCcw, Share2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { fetchWorkflowJobs, requestAiWorkflowExplain, rerunWorkflowRun } from '../../services/git/gitInsightsApi';
import { errorMessage } from '../../services/workspace/httpClient';
import type { GitAiAnalysisDto, GitWorkflowJobDto, GitWorkflowRunDto } from '../../types/git-insights.types';
import type { GitScope } from '../../types/git.types';
import { formatGitTimestamp } from './gitFormat';
import type { ShareToChatPayload } from './GitShareToChatModal';

interface GitActionsViewProps {
  scope: GitScope;
  runs: GitWorkflowRunDto[];
  loading: boolean;
  canWrite: boolean;
  onRefresh: () => void;
  onShareToChat: (payload: ShareToChatPayload) => void;
}

export function renderRunStatus(status: string, conclusion: string | null) {
  const key = (conclusion || status || 'unknown').toLowerCase();
  if (key === 'success') {
    return (
      <span className="inline-flex items-center gap-1 border border-[#1E5631] bg-[#052E16] px-1.5 py-0.5 font-mono text-[10px] text-[#4ADE80]">
        <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />passing
      </span>
    );
  }
  if (key === 'failure' || key === 'timed_out' || key === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 border border-[#EF4444]/60 bg-[#EF4444]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#EF4444]">
        <XCircle className="h-3 w-3" strokeWidth={1.5} />{key}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 border border-[#EAB308]/60 bg-[#EAB308]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#EAB308]">
      <Clock className="h-3 w-3" strokeWidth={1.5} />{status || 'running'}
    </span>
  );
}

export function GitActionsView({ scope, runs, loading, canWrite, onRefresh, onShareToChat }: GitActionsViewProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [jobsByRun, setJobsByRun] = useState<Record<number, GitWorkflowJobDto[]>>({});
  const [jobsLoading, setJobsLoading] = useState<number | null>(null);
  const [rerunningId, setRerunningId] = useState<number | null>(null);
  const [explainingId, setExplainingId] = useState<number | null>(null);
  const [aiByRun, setAiByRun] = useState<Record<number, GitAiAnalysisDto>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleJobs(runId: number) {
    if (expandedId === runId) { setExpandedId(null); return; }
    setExpandedId(runId);
    if (jobsByRun[runId]) return;
    setJobsLoading(runId); setActionError(null);
    try {
      const jobs = await fetchWorkflowJobs(scope, runId);
      setJobsByRun((prev) => ({ ...prev, [runId]: jobs }));
    } catch (err) {
      setActionError(errorMessage(err, 'Could not load workflow jobs.'));
    } finally { setJobsLoading(null); }
  }

  async function handleRerun(runId: number, failed: boolean) {
    setRerunningId(runId); setActionError(null);
    try {
      await rerunWorkflowRun(scope, runId, failed);
      onRefresh();
    } catch (err) {
      setActionError(errorMessage(err, 'Could not re-run workflow.'));
    } finally { setRerunningId(null); }
  }

  async function handleExplain(runId: number) {
    setExplainingId(runId); setActionError(null); setExpandedId(runId);
    try {
      const analysis = await requestAiWorkflowExplain(scope, runId);
      setAiByRun((prev) => ({ ...prev, [runId]: analysis }));
    } catch (err) {
      setActionError(errorMessage(err, 'AI explanation failed.'));
    } finally { setExplainingId(null); }
  }

  return (
    <section className="border border-[#30363D] bg-[#161B22]">
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
          <PlayCircle className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span>GitHub Actions &amp; CI/CD Runs ({runs.length})</span>
        </div>
        <Button type="button" variant="secondary" disabled={loading} onClick={onRefresh}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />Refresh
        </Button>
      </div>

      {actionError && <div role="alert" className="border-b border-[#EF4444] bg-[#0D1117] px-4 py-2 text-xs text-[#EF4444]">{actionError}</div>}

      {runs.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-[#8A8A8A]">
          {loading ? 'Loading GitHub Actions workflow runs...' : 'No workflow runs found for this repository yet.'}
        </div>
      ) : (
        <div className="divide-y divide-[#21262D]">
          {runs.map((run) => {
            const isFailed = (run.conclusion ?? '').toLowerCase() === 'failure';
            const isOpen = expandedId === run.id;
            const jobs = jobsByRun[run.id] ?? [];
            const ai = aiByRun[run.id];
            return (
              <div key={run.id} className="px-4 py-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => void toggleJobs(run.id)} className="flex min-w-0 flex-1 items-start gap-2 text-left">
                    {isOpen ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A8A8A]" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A8A8A]" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderRunStatus(run.status, run.conclusion)}
                        <span className="truncate font-semibold text-[#E6EDF3]">{run.name}</span>
                        <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] text-[#BDBDBD]">{run.headBranch}</span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[#8A8A8A]">
                        {run.event} by @{run.actorLogin} · {run.headSha.slice(0, 7)} · {formatGitTimestamp(run.updatedAt ?? run.createdAt, 'recently')}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {isFailed && (
                      <button type="button" disabled={explainingId === run.id} onClick={() => void handleExplain(run.id)} className="inline-flex h-7 items-center gap-1 border border-[#22C55E] bg-[#052E16] px-2 font-mono text-[11px] text-[#4ADE80] hover:bg-[#22C55E] hover:text-[#0D1117] disabled:opacity-50">
                        <Bot className="h-3 w-3" strokeWidth={1.5} />{explainingId === run.id ? 'Analyzing...' : 'AI Explain'}
                      </button>
                    )}
                    {canWrite && (
                      <button type="button" disabled={rerunningId === run.id} onClick={() => void handleRerun(run.id, isFailed)} className="inline-flex h-7 items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-[11px] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3] disabled:opacity-50">
                        <RotateCcw className="h-3 w-3" strokeWidth={1.5} />{rerunningId === run.id ? 'Starting...' : isFailed ? 'Re-run Failed' : 'Re-run'}
                      </button>
                    )}
                    <button type="button" aria-label={`Share ${run.name} to chat`} onClick={() => onShareToChat({ title: `CI: ${run.name}`, body: `[GitHub Actions] ${run.name} (${run.conclusion || run.status})\nBranch: ${run.headBranch} (${run.headSha.slice(0, 7)}) by @${run.actorLogin}${run.htmlUrl ? `\n${run.htmlUrl}` : ''}` })} className="inline-flex h-7 items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 text-[#8A8A8A] hover:border-[#22C55E] hover:text-[#E6EDF3]">
                      <Share2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    {run.htmlUrl && (
                      <a href={run.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-[11px] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#4ADE80]">
                        Logs<ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 ml-5 space-y-2.5 border-l border-[#30363D] pl-3">
                    {ai && (
                      <div className="border border-[#22C55E] bg-[#052E16]/30 p-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#4ADE80]">
                          <span className="inline-flex items-center gap-1"><Bot className="h-3.5 w-3.5" />Orbit AI Diagnosis</span>
                          <span className="font-mono text-[10px] text-[#8B949E]">{ai.modelUsed}</span>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#E6EDF3]">{ai.summary}</pre>
                      </div>
                    )}
                    {jobsLoading === run.id ? (
                      <p className="text-[11px] text-[#8A8A8A]">Loading jobs and steps...</p>
                    ) : jobs.length === 0 ? (
                      <p className="text-[11px] text-[#8A8A8A]">No job breakdown available.</p>
                    ) : (
                      jobs.map((job) => (
                        <div key={job.id} className="border border-[#21262D] bg-[#0D1117] p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#E6EDF3]">{job.name}</span>
                            {renderRunStatus(job.status, job.conclusion)}
                          </div>
                          <div className="mt-2 space-y-1">
                            {job.steps.map((s) => (
                              <div key={s.number} className="flex items-center justify-between gap-2 font-mono text-[11px]">
                                <span className="truncate text-[#BDBDBD]">{s.number}. {s.name}</span>
                                <span className={s.conclusion === 'failure' ? 'text-[#EF4444]' : s.conclusion === 'success' ? 'text-[#4ADE80]' : 'text-[#8A8A8A]'}>
                                  {s.conclusion || s.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
