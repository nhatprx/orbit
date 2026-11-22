import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { ImagePlus, Paperclip, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { uploadChatImage, validateChatImageFile } from '../../services/workspace/chatImageUpload';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatMessageDto, MemberDto, SendChatMessageRequest } from '../../types/workspace.types';
import { ChatComposerBars, type PendingImageAttachment } from './ChatComposerBars';
import { ChatMentionMenu } from './ChatMentionMenu';
import { MAX_MESSAGE_LENGTH, checkDraft } from './chatMessages';
import { useChatMentionInput } from './useChatMentionInput';
import { useTypingSignal } from './useTypingSignal';

interface ChatComposerProps {
  channelId?: string;
  mentionMembers?: MemberDto[];
  placeholder: string;
  disabled?: boolean;
  readOnlyNotice?: string | null;
  replyTo?: ChatMessageDto | null;
  editingMessage?: ChatMessageDto | null;
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
  channelId, mentionMembers = [], placeholder, disabled = false, readOnlyNotice = null,
  replyTo = null, editingMessage = null, onClearReply, onCancelEdit, onSaveEdit, onSend, onTyping,
}: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImageAttachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateTyping = useTypingSignal(onTyping);
  const mention = useChatMentionInput(draft, setDraft, mentionMembers, inputRef, updateTyping);

  useEffect(() => () => { if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl); }, [pendingImage]);
  useEffect(() => {
    if (!editingMessage) return;
    setDraft(editingMessage.content);
    setError(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [editingMessage]);

  function selectImageFile(file: File | null | undefined) {
    if (!file || disabled) return;
    const err = validateChatImageFile(file);
    if (err) return setError(err);
    setError(null);
    setShowAttachment(false);
    setAttachmentName('');
    setAttachmentUrl('');
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  function clearPendingImage() {
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const items = event.clipboardData?.items;
    if (!items || !channelId) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { event.preventDefault(); selectImageFile(file); return; }
      }
    }
  }

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
    } catch (err) {
      setError(errorMessage(err, 'Message could not be updated.'));
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (editingMessage && onSaveEdit) return void submitEdit(editingMessage);
    const trimmedUrl = attachmentUrl.trim();
    const trimmedName = attachmentName.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      return setError('Attachment URL must start with https://, http://, or /api/.');
    }
    const hasMedia = Boolean(pendingImage || trimmedUrl);
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
      let finalUrl = trimmedUrl || null;
      let finalName = trimmedUrl ? trimmedName || null : null;
      if (pendingImage) {
        if (!channelId) throw new Error('Image upload requires an active channel.');
        const uploaded = await uploadChatImage(channelId, pendingImage.file);
        finalUrl = uploaded.attachmentUrl;
        finalName = uploaded.attachmentName;
      }
      await onSend({ content, replyToId: replyTo?.id ?? null, attachmentName: finalName, attachmentUrl: finalUrl });
      setDraft('');
      mention.resetMention();
      updateTyping('');
      setAttachmentName('');
      setAttachmentUrl('');
      setShowAttachment(false);
      clearPendingImage();
      onClearReply?.();
    } catch (err) {
      setError(errorMessage(err, 'Message could not be sent.'));
    } finally {
      setPending(false);
    }
  }

  const canSubmit = !disabled && !pending && Boolean(draft.trim() || pendingImage || attachmentUrl.trim() || editingMessage?.attachmentUrl);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="relative border-t border-[#30363D] bg-[#161B22] p-3">
      <ChatMentionMenu candidates={mention.candidates} selectedIndex={mention.selectedIndex} onSelect={mention.selectCandidate} />
      <ChatComposerBars
        readOnlyNotice={readOnlyNotice} replyTo={replyTo} editingMessage={editingMessage}
        pendingImage={pendingImage} showAttachment={showAttachment} attachmentName={attachmentName}
        attachmentUrl={attachmentUrl} error={error} onClearReply={onClearReply}
        onCancelEdit={() => { setDraft(''); onCancelEdit?.(); }} onClearImage={clearPendingImage}
        onChangeAttachmentName={setAttachmentName} onChangeAttachmentUrl={setAttachmentUrl}
        onCloseAttachment={() => { setShowAttachment(false); setAttachmentName(''); setAttachmentUrl(''); }}
      />
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Upload image" className="hidden" onChange={(e) => selectImageFile(e.target.files?.[0])} />
        {channelId && !editingMessage && (
          <button type="button" aria-label="Send image" title="Send image" disabled={disabled || pending} onClick={() => fileInputRef.current?.click()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors disabled:opacity-50 ${pendingImage ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'}`}>
            <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
        {!editingMessage && (
          <button type="button" aria-label="Attach link" aria-pressed={showAttachment} title="Attach link" disabled={disabled} onClick={() => setShowAttachment((prev) => !prev)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors disabled:opacity-50 ${showAttachment || attachmentUrl.trim() ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'}`}>
            <Paperclip className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
        <input
          ref={inputRef} type="text" aria-label="Message" value={draft} maxLength={MAX_MESSAGE_LENGTH + 100} disabled={disabled}
          onKeyDown={mention.handleKeyDown} onPaste={handlePaste}
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
