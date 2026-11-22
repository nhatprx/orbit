import { CornerUpLeft, Image as ImageIcon, Lock, Pencil, X } from 'lucide-react';
import type { ChatMessageDto } from '../../types/workspace.types';

export interface PendingImageAttachment {
  file: File;
  previewUrl: string;
}

interface ChatComposerBarsProps {
  readOnlyNotice: string | null;
  replyTo: ChatMessageDto | null;
  editingMessage: ChatMessageDto | null;
  pendingImage: PendingImageAttachment | null;
  showAttachment: boolean;
  attachmentName: string;
  attachmentUrl: string;
  error: string | null;
  onClearReply?: () => void;
  onCancelEdit?: () => void;
  onClearImage: () => void;
  onChangeAttachmentName: (value: string) => void;
  onChangeAttachmentUrl: (value: string) => void;
  onCloseAttachment: () => void;
}

export function ChatComposerBars({
  readOnlyNotice,
  replyTo,
  editingMessage,
  pendingImage,
  showAttachment,
  attachmentName,
  attachmentUrl,
  error,
  onClearReply,
  onCancelEdit,
  onClearImage,
  onChangeAttachmentName,
  onChangeAttachmentUrl,
  onCloseAttachment,
}: ChatComposerBarsProps) {
  return (
    <>
      {readOnlyNotice && (
        <div
          role="status"
          className="mb-2 flex items-center gap-2 border border-[#EAB308] bg-[#0D1117] px-2.5 py-1.5 text-xs text-[#EAB308]"
        >
          <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>{readOnlyNotice}</span>
        </div>
      )}

      {editingMessage && (
        <div className="mb-2 flex items-center justify-between gap-2 border border-[#22C55E] bg-[#052E16] px-2.5 py-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 text-[#E6EDF3]">
            <Pencil className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
            <span className="shrink-0 font-semibold text-[#4ADE80]">Editing message</span>
            <span className="truncate text-[#BDBDBD]">{editingMessage.content}</span>
          </div>
          <button
            type="button"
            aria-label="Cancel edit"
            onClick={() => onCancelEdit?.()}
            className="shrink-0 text-[#BDBDBD] hover:text-[#E6EDF3]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {!editingMessage && replyTo && (
        <div className="mb-2 flex items-center justify-between gap-2 border border-[#22C55E] bg-[#052E16] px-2.5 py-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 text-[#E6EDF3]">
            <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
            <span className="shrink-0 font-semibold text-[#4ADE80]">
              Replying to {replyTo.senderName}
            </span>
            <span className="truncate text-[#BDBDBD]">{replyTo.content || replyTo.attachmentName || 'Image'}</span>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => onClearReply?.()}
            className="shrink-0 text-[#BDBDBD] hover:text-[#E6EDF3]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {pendingImage && (
        <div className="mb-2 flex items-center justify-between gap-2 border border-[#1E5631] bg-[#0D1117] p-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={pendingImage.previewUrl}
              alt={pendingImage.file.name}
              className="h-12 w-12 shrink-0 border border-[#30363D] object-cover"
            />
            <div className="min-w-0 text-xs">
              <p className="flex items-center gap-1.5 truncate font-mono text-[#E6EDF3]">
                <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                <span className="truncate">{pendingImage.file.name}</span>
              </p>
              <p className="text-[10px] text-[#7D8590]">
                {Math.max(1, Math.round(pendingImage.file.size / 1024))} KB - Ready to send
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Remove image"
            onClick={onClearImage}
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8A8A8A] hover:text-[#E6EDF3]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {showAttachment && (
        <div className="mb-2 grid grid-cols-1 gap-2 border border-[#30363D] bg-[#0D1117] p-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <input
            type="text"
            aria-label="Attachment name"
            value={attachmentName}
            maxLength={255}
            onChange={(e) => onChangeAttachmentName(e.target.value)}
            placeholder="Attachment label (optional)"
            className="h-8 border border-[#3B434B] bg-[#161B22] px-2.5 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
          <input
            type="text"
            aria-label="Attachment URL"
            value={attachmentUrl}
            maxLength={1024}
            onChange={(e) => onChangeAttachmentUrl(e.target.value)}
            placeholder="https://... or /api/..."
            className="h-8 border border-[#3B434B] bg-[#161B22] px-2.5 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
          <button
            type="button"
            aria-label="Close attachment bar"
            onClick={onCloseAttachment}
            className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8A8A8A] hover:text-[#E6EDF3]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mb-2 text-xs text-[#EF4444]">
          {error}
        </p>
      )}
    </>
  );
}
