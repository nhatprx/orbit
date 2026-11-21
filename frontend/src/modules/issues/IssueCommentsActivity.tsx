import { useState, type FormEvent } from 'react';
import { History, MessageSquare, Send, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { issuesService } from '../../services/issues/issues.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { IssueActivityDto, IssueCommentDto } from '../../types/issues.types';
import { formatDateTime } from '../../utils/format';
import { formatActivitySummary } from './issueDetailMeta';

export interface IssueCommentsActivityProps {
  workspaceId: string;
  projectId: string;
  issueId: string;
  comments: IssueCommentDto[];
  activities: IssueActivityDto[];
  canWrite: boolean;
  canManage: boolean;
  currentUserId: string | null;
  onMutated: () => Promise<void> | void;
}

type ActivityTab = 'comments' | 'activity';

export function IssueCommentsActivity({
  workspaceId,
  projectId,
  issueId,
  comments,
  activities,
  canWrite,
  canManage,
  currentUserId,
  onMutated,
}: IssueCommentsActivityProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('comments');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabs: TabItem<ActivityTab>[] = [
    { id: 'comments', label: `Comments (${comments.length})`, icon: MessageSquare },
    { id: 'activity', label: `Activity History (${activities.length})`, icon: History },
  ];

  async function handleAddComment(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await issuesService.addComment(workspaceId, projectId, issueId, { body: trimmed });
      setBody('');
      await onMutated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    setDeletingId(commentId);
    setError(null);
    try {
      await issuesService.deleteComment(workspaceId, projectId, issueId, commentId);
      await onMutated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-3 border-t border-[#30363D] pt-4">
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {error && (
        <p role="alert" className="border border-[#EF4444] bg-[#0D1117] px-2.5 py-1.5 text-xs text-[#EF4444]">
          {error}
        </p>
      )}

      {activeTab === 'comments' ? (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-[#8B949E]">No comments yet. Start the discussion below.</p>
          ) : (
            <div className="space-y-2">
              {comments.map((comment) => {
                const canDeleteComment =
                  canManage || (Boolean(currentUserId) && comment.authorId === currentUserId && canWrite);
                return (
                  <article key={comment.id} className="border border-[#30363D] bg-[#0D1117] p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#E6EDF3]">{comment.authorName}</span>
                        <span className="font-mono text-[11px] text-[#8B949E]">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      {canDeleteComment && (
                        <button
                          type="button"
                          aria-label={`Delete comment by ${comment.authorName}`}
                          disabled={deletingId === comment.id}
                          onClick={() => void handleDeleteComment(comment.id)}
                          className="text-[#8B949E] hover:text-[#EF4444] disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#E6EDF3]">
                      {comment.body}
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          {canWrite && (
            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                rows={3}
                aria-label="Add comment"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a comment..."
                maxLength={4000}
                className="w-full rounded-none border border-[#3B434B] bg-[#0D1117] p-2.5 text-xs text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#22C55E] focus:outline-none"
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={submitting || !body.trim()}>
                  <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {activities.length === 0 ? (
            <p className="text-xs text-[#8B949E]">No activity recorded for this issue yet.</p>
          ) : (
            activities.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border border-[#30363D] bg-[#0D1117] px-3 py-2"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" />
                    <span className="text-xs font-medium text-[#E6EDF3]">{item.actorName}</span>
                    <Badge tone="neutral">{item.action}</Badge>
                  </div>
                  <p className="text-xs text-[#8B949E]">{formatActivitySummary(item)}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-[#8B949E]">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
