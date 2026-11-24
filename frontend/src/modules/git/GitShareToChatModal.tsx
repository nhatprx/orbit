import { useEffect, useState, type FormEvent } from 'react';
import { Check, Hash, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { httpChatService } from '../../services/workspace/httpChat.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { GitScope } from '../../types/git.types';
import type { ChatChannelDto } from '../../types/workspace.types';

export interface ShareToChatPayload {
  title: string;
  body: string;
}

interface GitShareToChatModalProps {
  open: boolean;
  scope: GitScope;
  payload: ShareToChatPayload | null;
  onClose: () => void;
}

export function GitShareToChatModal({ open, scope, payload, onClose }: GitShareToChatModalProps) {
  const [channels, setChannels] = useState<ChatChannelDto[]>([]);
  const [channelId, setChannelId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSent(false);
    setError(null);
    setNote('');
    setLoading(true);
    const loader =
      scope.type === 'PROJECT'
        ? httpChatService.listProjectChannels(scope.workspaceId, scope.projectId)
        : httpChatService.listWorkspaceChannels(scope.workspaceId);
    loader
      .then((list) => {
        const textOnly = list.filter((c) => c.channelType !== 'VOICE');
        setChannels(textOnly);
        setChannelId((prev) => (textOnly.some((c) => c.id === prev) ? prev : textOnly[0]?.id ?? ''));
      })
      .catch((err) => setError(errorMessage(err, 'Could not load chat channels.')))
      .finally(() => setLoading(false));
  }, [open, scope]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!payload || !channelId) return;
    setSending(true);
    setError(null);
    try {
      const content = note.trim() ? `${note.trim()}\n\n${payload.body}` : payload.body;
      await httpChatService.sendMessage(channelId, { content });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not post message to chat.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} title="Share to Chat" subtitle={payload?.title ?? 'Git update'} size="sm" onClose={onClose}>
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border border-[#22C55E] bg-[#052E16] px-3 py-2.5 text-xs text-[#4ADE80]">
            <Check className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Shared to chat channel. Your team can discuss or invoke @ai directly in the thread.</span>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          {error && <p role="alert" className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">{error}</p>}
          <div>
            <label htmlFor="git-share-channel" className="mb-1 block text-xs font-medium text-[#BDBDBD]">
              Target Channel
            </label>
            {loading ? (
              <p className="text-xs text-[#8A8A8A]">Loading channels...</p>
            ) : channels.length === 0 ? (
              <p className="text-xs text-[#8A8A8A]">No text channels available in this scope.</p>
            ) : (
              <div className="flex items-center border border-[#30363D] bg-[#0D1117] px-2.5">
                <Hash className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
                <select
                  id="git-share-channel"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="h-9 flex-1 bg-transparent px-1.5 text-xs text-[#E6EDF3] focus:outline-none"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-[#161B22]">{ch.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="git-share-note" className="mb-1 block text-xs font-medium text-[#BDBDBD]">
              Optional Note (tip: mention @ai to ask for analysis)
            </label>
            <textarea
              id="git-share-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. @ai please review this PR with the team"
              className="w-full border border-[#30363D] bg-[#0D1117] p-2.5 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap border border-[#21262D] bg-[#0D1117] p-2.5 font-mono text-[11px] text-[#BDBDBD]">
            {payload?.body}
          </pre>

          <div className="flex justify-end gap-2 border-t border-[#30363D] pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={sending || !channelId}>
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              {sending ? 'Sharing...' : 'Share to Chat'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
