import { useEffect, useState } from 'react';
import { Bot, ExternalLink, FileCode2, MessageSquare, Share2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useNoticeToast } from '../../components/ui/useNoticeToast';
import { fetchPrDetail, requestAiPrReview, submitPrReview } from '../../services/git/gitInsightsApi';
import { errorMessage } from '../../services/workspace/httpClient';
import type { GitAiAnalysisDto, GitPrDetailDto } from '../../types/git-insights.types';
import type { GitScope } from '../../types/git.types';
import { formatGitTimestamp } from './gitFormat';
import type { ShareToChatPayload } from './GitShareToChatModal';

interface GitPrDetailModalProps {
  scope: GitScope;
  pullNumber: number | null;
  canWrite: boolean;
  onClose: () => void;
  onShareToChat: (payload: ShareToChatPayload) => void;
}

export function GitPrDetailModal({ scope, pullNumber, canWrite, onClose, onShareToChat }: GitPrDetailModalProps) {
  const [detail, setDetail] = useState<GitPrDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<'files' | 'comments'>('files');
  const [aiReview, setAiReview] = useState<GitAiAnalysisDto | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewBody, setReviewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pullNumber === null) return;
    const ctrl = new AbortController();
    setLoading(true); setDetail(null); setAiReview(null); setError(null); setNotice(null); setReviewBody('');
    fetchPrDetail(scope, pullNumber, ctrl.signal)
      .then(setDetail)
      .catch((err) => { if (!ctrl.signal.aborted) setError(errorMessage(err, 'Failed to load PR details.')); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [scope, pullNumber]);

  useNoticeToast(notice, 'success', () => setNotice(null));
  useNoticeToast(error, 'error', () => setError(null));

  if (pullNumber === null) return null;

  async function handleAiReview() {
    if (pullNumber === null) return;
    setAiLoading(true); setError(null);
    try { setAiReview(await requestAiPrReview(scope, pullNumber)); }
    catch (err) { setError(errorMessage(err, 'AI review failed.')); }
    finally { setAiLoading(false); }
  }

  async function handleReview(event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES') {
    if (pullNumber === null) return;
    setSubmitting(true); setError(null); setNotice(null);
    try {
      await submitPrReview(scope, pullNumber, { event, body: reviewBody });
      setReviewBody('');
      setNotice(event === 'APPROVE' ? 'Pull request approved.' : event === 'REQUEST_CHANGES' ? 'Requested changes submitted.' : 'Comment posted.');
      setDetail(await fetchPrDetail(scope, pullNumber));
    } catch (err) {
      setError(errorMessage(err, 'Failed to submit review.'));
    } finally { setSubmitting(false); }
  }

  const pr = detail?.pullRequest;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between gap-3 border-b border-[#30363D] px-5 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#22C55E]">PR #{pullNumber}</span>
              <h2 className="truncate text-sm font-semibold text-[#E6EDF3]">{pr?.title ?? 'Loading Pull Request...'}</h2>
              {pr && <Badge tone={pr.status === 'open' ? 'green' : 'neutral'}>{pr.status}</Badge>}
            </div>
            {pr && (
              <p className="mt-0.5 font-mono text-[11px] text-[#8A8A8A]">
                {pr.author} · {pr.sourceBranch} -&gt; {pr.targetBranch} · +{detail.additions} / -{detail.deletions}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {pr && (
              <>
                <Button type="button" variant="primary" disabled={aiLoading} onClick={() => void handleAiReview()}>
                  <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {aiLoading ? 'Reviewing...' : 'AI Review PR'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onShareToChat({
                    title: `PR #${pr.number}`,
                    body: `[Git PR #${pr.number}] ${pr.title}\nBranch: ${pr.sourceBranch} -> ${pr.targetBranch} (${pr.status})\nChanges: +${detail.additions} / -${detail.deletions}${pr.htmlUrl ? `\n${pr.htmlUrl}` : ''}`,
                  })}
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Share
                </Button>
                {pr.htmlUrl && (
                  <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8A8A8A] hover:border-[#22C55E] hover:text-[#E6EDF3]">
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </a>
                )}
              </>
            )}
            <button type="button" aria-label="Close PR detail" onClick={onClose} className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8A8A8A] hover:text-[#E6EDF3]">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {aiReview && (
            <div className="border border-[#22C55E] bg-[#052E16]/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#4ADE80]">
                <span className="inline-flex items-center gap-1.5"><Bot className="h-4 w-4" strokeWidth={1.5} />Orbit AI Review</span>
                <span className="font-mono text-[10px] text-[#8B949E]">{aiReview.modelUsed}</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#E6EDF3]">{aiReview.summary}</pre>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-[#8A8A8A]">Loading files and comments...</p>
          ) : detail && (
            <>
              <div className="flex gap-1 border-b border-[#30363D]">
                <button type="button" onClick={() => setSubTab('files')} className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium ${subTab === 'files' ? 'border-[#22C55E] text-[#4ADE80]' : 'border-transparent text-[#8B949E]'}`}>
                  <FileCode2 className="h-3.5 w-3.5" />Files Changed ({detail.files.length})
                </button>
                <button type="button" onClick={() => setSubTab('comments')} className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium ${subTab === 'comments' ? 'border-[#22C55E] text-[#4ADE80]' : 'border-transparent text-[#8B949E]'}`}>
                  <MessageSquare className="h-3.5 w-3.5" />Comments ({detail.comments.length})
                </button>
              </div>

              {subTab === 'files' ? (
                <div className="space-y-3">
                  {detail.files.map((f) => (
                    <div key={f.filename} className="border border-[#30363D] bg-[#0D1117]">
                      <div className="flex items-center justify-between border-b border-[#21262D] px-3 py-2 font-mono text-xs">
                        <span className="truncate text-[#E6EDF3]">{f.filename}</span>
                        <span className="shrink-0 text-[11px]"><span className="text-[#22C55E]">+{f.additions}</span> <span className="text-[#EF4444]">-{f.deletions}</span></span>
                      </div>
                      {f.patch && (
                        <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
                          {f.patch.split('\n').map((line, i) => (
                            <div key={i} className={line.startsWith('+') && !line.startsWith('+++') ? 'bg-[#052E16]/70 text-[#4ADE80]' : line.startsWith('-') && !line.startsWith('---') ? 'bg-[#EF4444]/15 text-[#F87171]' : 'text-[#BDBDBD]'}>{line}</div>
                          ))}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {detail.comments.map((c) => (
                    <div key={c.id} className="border border-[#30363D] bg-[#0D1117] p-3 text-xs">
                      <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-[#8A8A8A]">
                        <span className="font-semibold text-[#4ADE80]">@{c.author}</span>
                        <span>{formatGitTimestamp(c.createdAt, '')}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[#E6EDF3]">{c.body}</p>
                    </div>
                  ))}
                  {detail.comments.length === 0 && <p className="text-xs text-[#8A8A8A]">No comments yet.</p>}
                </div>
              )}

              {canWrite && (
                <div className="space-y-2 border-t border-[#30363D] pt-3">
                  <textarea
                    rows={2}
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="Leave a review comment..."
                    className="w-full border border-[#30363D] bg-[#0D1117] p-2.5 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="secondary" disabled={submitting || !reviewBody.trim()} onClick={() => void handleReview('COMMENT')}>Comment</Button>
                    <Button type="button" variant="secondary" disabled={submitting} onClick={() => void handleReview('REQUEST_CHANGES')}>Request Changes</Button>
                    <Button type="button" variant="primary" disabled={submitting} onClick={() => void handleReview('APPROVE')}>Approve</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
