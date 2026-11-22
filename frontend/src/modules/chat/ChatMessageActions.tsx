import { useEffect, useRef, useState } from 'react';
import {
  Check, CheckSquare, Copy, MoreHorizontal,
  Pencil, Pin, PinOff, Reply, ThumbsUp, Trash2,
} from 'lucide-react';
import type { ChatMessageDto, ChatReactionKey } from '../../types/workspace.types';

interface ChatMessageActionsProps {
  message: ChatMessageDto;
  mine: boolean;
  canDelete: boolean;
  canWriteChat: boolean;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  onReply: (message: ChatMessageDto) => void;
  onEdit?: (message: ChatMessageDto) => void;
  onTogglePin?: (messageId: string) => Promise<void>;
  onStartSelect?: (messageId: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, key: ChatReactionKey) => Promise<void>;
}

export function ChatMessageActions({
  message, mine, canDelete, canWriteChat,
  menuOpen: controlledOpen, onMenuOpenChange,
  onReply, onEdit, onTogglePin, onStartSelect, onDelete, onToggleReaction,
}: ChatMessageActionsProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const [openDown, setOpenDown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const menuOpen = controlledOpen ?? localOpen;
  const setMenuOpen = (next: boolean) => {
    if (onMenuOpenChange) onMenuOpenChange(next);
    else setLocalOpen(next);
  };

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function toggleMenu() {
    if (!menuOpen && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const scroller = rootRef.current.closest('[aria-label="Messages"]');
      const topBound = scroller ? scroller.getBoundingClientRect().top : 0;
      setOpenDown(rect.top - topBound < 190);
    }
    setMenuOpen(!menuOpen);
  }

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

  const visibility = menuOpen
    ? 'z-30 opacity-100'
    : 'z-10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

  return (
    <div ref={rootRef} className={`relative flex shrink-0 items-center self-center border border-[#30363D] bg-[#161B22] p-0.5 transition-opacity ${visibility}`}>
      <button
        type="button"
        disabled={!canWriteChat}
        title="Like"
        aria-label="React to message"
        onClick={() => void onToggleReaction(message.id, 'LIKE')}
        className="p-1 text-[#8B949E] hover:bg-[#21262D] hover:text-[#22C55E] disabled:opacity-40"
      >
        <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        disabled={!canWriteChat}
        title="Reply"
        aria-label={`Reply to ${message.senderName}`}
        onClick={() => onReply(message)}
        className="p-1 text-[#8B949E] hover:bg-[#21262D] hover:text-[#22C55E] disabled:opacity-40"
      >
        <Reply className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        title="More"
        aria-label="More message actions"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
        className="p-1 text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]"
      >
        <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>

      {menuOpen && (
        <div
          className={`absolute z-40 flex min-w-[136px] flex-col border border-[#30363D] bg-[#0D1117] p-1 shadow-lg ${
            openDown ? 'top-full mt-1' : 'bottom-full mb-1'
          } ${mine ? 'right-0' : 'left-0'}`}
        >
          {mine && canWriteChat && onEdit && (
            <button
              type="button"
              onClick={() => { onEdit(message); setMenuOpen(false); }}
              className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#E6EDF3]"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
              Edit
            </button>
          )}
          {canWriteChat && onTogglePin && (
            <button
              type="button"
              onClick={() => { void onTogglePin(message.id); setMenuOpen(false); }}
              className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#4ADE80]"
            >
              {message.pinned ? <PinOff className="h-3 w-3" strokeWidth={1.5} /> : <Pin className="h-3 w-3" strokeWidth={1.5} />}
              {message.pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {onStartSelect && (
            <button
              type="button"
              onClick={() => { onStartSelect(message.id); setMenuOpen(false); }}
              className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#E6EDF3]"
            >
              <CheckSquare className="h-3 w-3" strokeWidth={1.5} />
              Select
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyMessage()}
            className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#E6EDF3]"
          >
            {copied ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              aria-label={`Delete message from ${message.senderName}`}
              onClick={() => void deleteMessage()}
              className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#EF4444] disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
