import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileUp, ImagePlus, Paperclip, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { uploadChatFile } from '../../services/workspace/chatImageUpload';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatMessageDto, MemberDto, SendChatMessageRequest } from '../../types/workspace.types';
import { ChatComposerBars } from './ChatComposerBars';
import { ChatMentionMenu } from './ChatMentionMenu';
import { ChatSlashFileMenu } from './ChatSlashFileMenu';
import { MAX_MESSAGE_LENGTH, checkDraft } from './chatMessages';
import { useChatComposerFiles } from './useChatComposerFiles';
import { useChatMentionInput } from './useChatMentionInput';
import { useChatSlashFiles } from './useChatSlashFiles';
import { useTypingSignal } from './useTypingSignal';

interface ChatComposerProps {
  channelId?: string;
  workspaceId?: string;
  projectId?: string | null;
  mentionMembers?: MemberDto[];
  placeholder: string;
  disabled?: boolean;
  textOnly?: boolean;
  readOnlyNotice?: string | null;
  replyTo?: ChatMessageDto | null;
  editingMessage?: ChatMessageDto | null;
  droppedFiles?: { id: number; files: File[] } | null;
  onClearDroppedFiles?: () => void;
  onClearReply?: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, content: string) => Promise<void>;
  onSend: (request: SendChatMessageRequest) => Promise<void>;
  onTyping?: (active: boolean) => void;
}

const isValidUrl = (url: string) => {
  const lower = url.toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://') || url.startsWith('/api/');
};

export function ChatComposer({
  channelId, workspaceId, projectId = null, mentionMembers = [], placeholder, disabled = false, textOnly = false, readOnlyNotice = null,
  replyTo = null, editingMessage = null, droppedFiles = null, onClearDroppedFiles, onClearReply, onCancelEdit, onSaveEdit, onSend, onTyping,
}: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTyping = useTypingSignal(onTyping);
  const mention = useChatMentionInput(draft, setDraft, mentionMembers, inputRef, updateTyping);
  const slash = useChatSlashFiles(
    draft, setDraft, mention.cursor, mention.setCursor, workspaceId, projectId,
    disabled || textOnly || Boolean(editingMessage), inputRef, setError
  );
  const files = useChatComposerFiles(disabled, channelId, setError, () => {
    setShowAttachment(false); setAttachmentName(''); setAttachmentUrl('');
  });

  useEffect(() => {
    if (!droppedFiles || droppedFiles.files.length === 0) return;
    files.addFiles(droppedFiles.files);
    onClearDroppedFiles?.();
  }, [droppedFiles]);

  useEffect(() => {
    if (!editingMessage) return;
    setDraft(editingMessage.content);
    setError(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [editingMessage]);

  async function submitEdit(target: ChatMessageDto) {
    const trimmed = draft.trim();
    if (!target.attachmentUrl) {
      const check = checkDraft(draft);
      if (!check.ok) return setError(check.error);
    } else if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return setError(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
    }
    setError(null);
    setPending(true);
    try {
      await onSaveEdit?.(target.id, trimmed);
      setDraft('');
      mention.resetMention();
      onCancelEdit?.();
    } catch (err) { setError(errorMessage(err, 'Message could not be updated.')); }
    finally { setPending(false); }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (editingMessage && onSaveEdit) return void submitEdit(editingMessage);
    const trimmedUrl = attachmentUrl.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      return setError('Attachment URL must start with https://, http://, or /api/.');
    }
    const hasMedia = !textOnly && Boolean(files.pendingFiles.length > 0 || slash.attachedFiles.length > 0 || trimmedUrl);
    let content = draft.trim();
    if (!hasMedia) {
      const check = checkDraft(draft);
      if (!check.ok) return setError(check.error);
      content = check.content;
    } else if (content.length > MAX_MESSAGE_LENGTH) {
      return setError(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
    }
    setError(null);
    setPending(true);
    try {
      const uploaded = !textOnly && files.pendingFiles.length > 0
        ? (channelId ? await Promise.all(files.pendingFiles.map((item) => uploadChatFile(channelId, item.file))) : (() => { throw new Error('File upload requires an active channel.'); })())
        : [];
      const allAttachments = [
        ...uploaded.map((u) => ({ name: u.attachmentName, url: u.attachmentUrl })),
        ...slash.attachedFiles.map((f) => ({ name: f.name, url: f.url })),
        ...(trimmedUrl ? [{ name: attachmentName.trim() || trimmedUrl, url: trimmedUrl }] : []),
      ];
      const first = allAttachments[0];
      await onSend({
        content,
        replyToId: replyTo?.id ?? null,
        attachmentName: first?.name ?? null,
        attachmentUrl: first?.url ?? null,
        ...(allAttachments.length > 1 ? { attachments: allAttachments } : {}),
      });
      setDraft(''); mention.resetMention(); updateTyping('');
      setAttachmentName(''); setAttachmentUrl(''); setShowAttachment(false);
      files.clearFiles(); slash.clearAttachedFiles(); onClearReply?.();
    } catch (err) { setError(errorMessage(err, 'Message could not be sent.')); }
    finally { setPending(false); }
  }

  const canSubmit = !disabled && !pending && Boolean(draft.trim() || files.pendingFiles.length > 0 || slash.attachedFiles.length > 0 || attachmentUrl.trim() || editingMessage?.attachmentUrl);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="relative border-t border-[#30363D] bg-[#161B22] p-3">
      <ChatMentionMenu candidates={mention.candidates} selectedIndex={mention.selectedIndex} onSelect={mention.selectCandidate} />
      <ChatSlashFileMenu open={slash.open && mention.candidates.length === 0} loading={slash.loading} attachingId={slash.attachingId} files={slash.files} selectedIndex={slash.selectedIndex} onSelect={(f) => void slash.selectFile(f)} />
      <ChatComposerBars
        readOnlyNotice={readOnlyNotice} replyTo={replyTo} editingMessage={editingMessage}
        pendingFiles={files.pendingFiles} workspaceFiles={slash.attachedFiles} showAttachment={showAttachment} attachmentName={attachmentName}
        attachmentUrl={attachmentUrl} error={error} onClearReply={onClearReply}
        onCancelEdit={() => { setDraft(''); onCancelEdit?.(); }}
        onRemoveFile={files.removeFile} onClearFiles={files.clearFiles} onRemoveWorkspaceFile={slash.removeAttachedFile}
        onChangeAttachmentName={setAttachmentName} onChangeAttachmentUrl={setAttachmentUrl}
        onCloseAttachment={() => { setShowAttachment(false); setAttachmentName(''); setAttachmentUrl(''); }}
      />
      <div className="flex items-center gap-2">
        {!textOnly && (
          <>
            <input ref={files.imageInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Upload image" className="hidden" onChange={(e) => files.addFiles(e.target.files)} />
            <input ref={files.fileInputRef} type="file" multiple aria-label="Upload files" className="hidden" onChange={(e) => files.addFiles(e.target.files)} />
            {channelId && !editingMessage && (
              <>
                <button type="button" aria-label="Send image" title="Upload images" disabled={disabled || pending} onClick={() => files.imageInputRef.current?.click()}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors disabled:opacity-50 ${files.pendingFiles.some((f) => f.isImage) ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'}`}>
                  <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button type="button" aria-label="Upload file" title="Upload files" disabled={disabled || pending} onClick={() => files.fileInputRef.current?.click()}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors disabled:opacity-50 ${files.pendingFiles.some((f) => !f.isImage) ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'}`}>
                  <FileUp className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </>
            )}
            {!editingMessage && (
              <button type="button" aria-label="Attach link" aria-pressed={showAttachment} title="Attach link" disabled={disabled} onClick={() => setShowAttachment((prev) => !prev)}
                className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors disabled:opacity-50 ${showAttachment || attachmentUrl.trim() ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'}`}>
                <Paperclip className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
          </>
        )}
        <input
          ref={inputRef} type="text" aria-label="Message" value={draft} maxLength={MAX_MESSAGE_LENGTH + 100} disabled={disabled}
          onKeyDown={(e) => { if (!slash.handleKeyDown(e)) mention.handleKeyDown(e); }} onPaste={textOnly ? undefined : files.handlePaste}
          onClick={(e) => mention.setCursor(e.currentTarget.selectionStart ?? draft.length)}
          onChange={(e) => { const v = e.target.value; setDraft(v); mention.setCursor(e.currentTarget.selectionStart ?? v.length); mention.resetSelection(); updateTyping(v); }}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none disabled:opacity-50"
        />
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          <Send className="h-4 w-4" strokeWidth={1.5} />
          {pending ? (editingMessage ? 'Saving...' : 'Sending...') : editingMessage ? 'Save' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
