import { useState } from 'react';
import { Check, Copy, CornerUpLeft, ExternalLink, Heart, Laugh, MoreHorizontal, Paperclip, PartyPopper, Reply, ThumbsUp, Trash2 } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { ChatMessageDto, ChatReactionKey } from '../../types/workspace.types';
import { formatTime } from '../../utils/format';

interface ChatMessageRowProps {
  message: ChatMessageDto;
  mine: boolean;
  canDelete: boolean;
  canWriteChat: boolean;
  onReply: (message: ChatMessageDto) => void;
  onDelete: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, key: ChatReactionKey) => Promise<void>;
}

const reactions: { key: ChatReactionKey; label: string; Icon: typeof ThumbsUp }[] = [
  { key: 'LIKE', label: 'Like', Icon: ThumbsUp }, { key: 'LOVE', label: 'Love', Icon: Heart },
  { key: 'LAUGH', label: 'Laugh', Icon: Laugh }, { key: 'CELEBRATE', label: 'Celebrate', Icon: PartyPopper },
];

function safeUrl(url: string): boolean {
  const value = url.toLowerCase();
  return value.startsWith('https://') || value.startsWith('http://') || url.startsWith('/api/');
}

export function ChatMessageRow({ message, mine, canDelete, canWriteChat, onReply, onDelete, onToggleReaction }: ChatMessageRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const attachmentUrl = message.attachmentUrl?.trim();
  const hasReply = Boolean(message.replyToSenderName || message.replyToSnippet);
  const toggleQuick = () => void onToggleReaction(message.id, 'LIKE');

  async function copyMessage() {
    try { await navigator.clipboard.writeText(message.content); } catch { return; }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
    setMenuOpen(false);
  }

  async function deleteMessage() {
    setDeleting(true);
    try { await onDelete(message.id); } finally { setDeleting(false); setMenuOpen(false); }
  }

  return (
    <div className={`group relative flex items-start gap-2 border border-transparent px-2 py-1.5 hover:border-[#30363D] hover:bg-[#161B22] ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine && <UserAvatar name={message.senderName} avatarUrl={message.senderAvatarUrl} />}
      <div className={`min-w-0 max-w-[80%] ${mine ? 'text-right' : 'flex-1 text-left'}`}>
        <div className={`relative flex min-w-0 items-baseline gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
          <span className="min-w-0 break-words text-sm font-semibold text-[#E6EDF3]">{message.senderName}</span>
          <time dateTime={message.createdAt} className={`absolute top-0 font-mono text-xs text-[#7D8590] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${mine ? 'right-full mr-2' : 'left-full ml-2'}`}>{formatTime(message.createdAt)}</time>
        </div>
        {hasReply && <div className={`mt-1 flex items-center gap-1.5 border-l-2 border-[#22C55E] bg-[#0D1117] px-2.5 py-1 text-xs text-[#8A8A8A] ${mine ? 'justify-end border-l-0 border-r-2' : ''}`}>
          <CornerUpLeft className="h-3 w-3 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          {message.replyToSenderName && <span className="shrink-0 font-semibold text-[#BDBDBD]">{message.replyToSenderName}:</span>}
          <span className="truncate">{message.replyToSnippet ?? 'Replied message'}</span>
        </div>}
        <p className={`mt-1 inline-block max-w-full border px-3 py-2 text-left whitespace-pre-wrap break-words text-sm leading-relaxed text-[#E6EDF3] ${mine ? 'border-[#14532D] bg-[#052E16]' : 'border-transparent bg-transparent px-0'}`}>{message.content}</p>
        {attachmentUrl && safeUrl(attachmentUrl) && <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-md items-center gap-2 border border-[#30363D] bg-[#0D1117] px-3 py-1.5 text-xs text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#4ADE80]">
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} /><span className="truncate font-mono">{message.attachmentName || attachmentUrl}</span><ExternalLink className="h-3 w-3 shrink-0 text-[#8A8A8A]" strokeWidth={1.5} />
        </a>}
        {(message.reactions ?? []).length > 0 && <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : ''}`}>
          {message.reactions?.map((reaction) => {
            const Icon = reactions.find((item) => item.key === reaction.reactionKey)?.Icon ?? ThumbsUp;
            return <button key={reaction.reactionKey} type="button" disabled={!canWriteChat} aria-pressed={reaction.reactedByMe} onClick={() => void onToggleReaction(message.id, reaction.reactionKey)} className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs ${reaction.reactedByMe ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#30363D] bg-[#0D1117] text-[#8A8A8A]'} disabled:cursor-not-allowed`}><Icon className="h-3 w-3" />{reaction.count}</button>;
          })}
        </div>}
      </div>
      {mine && <UserAvatar name={message.senderName} avatarUrl={message.senderAvatarUrl} />}
      <div className={`absolute top-1.5 z-10 flex items-start gap-0.5 border border-[#30363D] bg-[#21262D] p-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${mine ? 'right-10' : 'left-10'}`}>
        <button type="button" disabled={!canWriteChat} title="React" aria-label="React to message" onClick={toggleQuick} className="p-1 text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#22C55E] disabled:opacity-40"><ThumbsUp className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={!canWriteChat} title="Reply" aria-label={`Reply to ${message.senderName}`} onClick={() => onReply(message)} className="p-1 text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#22C55E] disabled:opacity-40"><Reply className="h-3.5 w-3.5" /></button>
        <button type="button" title="More" aria-label="More message actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="p-1 text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#E6EDF3]"><MoreHorizontal className="h-3.5 w-3.5" /></button>
        {menuOpen && <div className={`absolute top-full mt-1 flex flex-col border border-[#30363D] bg-[#0D1117] p-1 shadow-lg ${mine ? 'right-0' : 'left-0'}`}>
          <div className="flex border-b border-[#30363D] pb-1">{reactions.map(({ key, label, Icon }) => <button key={key} type="button" title={label} disabled={!canWriteChat} onClick={() => { void onToggleReaction(message.id, key); setMenuOpen(false); }} className="p-1.5 text-[#8A8A8A] hover:bg-[#161B22] hover:text-[#4ADE80] disabled:opacity-40"><Icon className="h-3.5 w-3.5" /></button>)}</div>
          <button type="button" onClick={() => void copyMessage()} className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22]">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}Copy</button>
          {canDelete && <button type="button" disabled={deleting} onClick={() => void deleteMessage()} className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-red-400 disabled:opacity-40"><Trash2 className="h-3 w-3" />Delete</button>}
        </div>}
      </div>
    </div>
  );
}
