import { CornerUpLeft, FileText, Lock, Pencil, X } from 'lucide-react';
import type { ChatMessageDto } from '../../types/workspace.types';

export interface PendingChatFile {
  id: string;
  file: File;
  isImage: boolean;
  previewUrl: string | null;
}

interface ChatComposerBarsProps {
  readOnlyNotice: string | null;
  replyTo: ChatMessageDto | null;
  editingMessage: ChatMessageDto | null;
  pendingFiles: PendingChatFile[];
  showAttachment: boolean;
  attachmentName: string;
  attachmentUrl: string;
  error: string | null;
  onClearReply?: () => void;
  onCancelEdit?: () => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  onChangeAttachmentName: (value: string) => void;
  onChangeAttachmentUrl: (value: string) => void;
  onCloseAttachment: () => void;
}

export function ChatComposerBars({
  readOnlyNotice,
  replyTo,
  editingMessage,
  pendingFiles,
  showAttachment,
  attachmentName,
  attachmentUrl,
  error,
  onClearReply,
  onCancelEdit,
  onRemoveFile,
  onClearFiles,
  onChangeAttachmentName,
  onChangeAttachmentUrl,
  onCloseAttachment,
}: ChatComposerBarsProps) {
  return (
    <>
      {readOnlyNotice && (
        <div role="status" className="mb-2 flex items-center gap-2 border border-[#EAB308] bg-[#0D1117] px-2.5 py-1.5 text-xs text-[#EAB308]">
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
          <button type="button" aria-label="Cancel edit" onClick={() => onCancelEdit?.()} className="shrink-0 text-[#BDBDBD] hover:text-[#E6EDF3]">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {!editingMessage && replyTo && (
        <div className="mb-2 flex items-center justify-between gap-2 border border-[#22C55E] bg-[#052E16] px-2.5 py-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 text-[#E6EDF3]">
            <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
            <span className="shrink-0 font-semibold text-[#4ADE80]">Replying to {replyTo.senderName}</span>
            <span className="truncate text-[#BDBDBD]">{replyTo.content || replyTo.attachmentName || 'Image'}</span>
          </div>
          <button type="button" aria-label="Cancel reply" onClick={() => onClearReply?.()} className="shrink-0 text-[#BDBDBD] hover:text-[#E6EDF3]">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="mb-2 border border-[#1E5631] bg-[#0D1117] p-2">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#8B949E]">
            <span className="font-mono text-[#4ADE80]">
              {pendingFiles.length} {pendingFiles.length === 1 ? 'attachment' : 'attachments'} ready
            </span>
            {pendingFiles.length > 1 && (
              <button type="button" onClick={onClearFiles} className="text-[10px] text-[#8B949E] hover:text-[#EF4444]">
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
            {pendingFiles.map((item) => {
              const ext = item.file.name.includes('.') ? item.file.name.split('.').pop()?.slice(0, 4).toUpperCase() : 'FILE';
              return (
                <div
                  key={item.id}
                  title={item.file.name}
                  className="relative h-16 w-16 shrink-0 overflow-hidden border border-[#30363D] bg-[#161B22]"
                >
                  {item.isImage && item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#052E16]/50 text-[#22C55E]">
                      <FileText className="h-5 w-5" strokeWidth={1.5} />
                      <span className="font-mono text-[9px] font-semibold tracking-wider text-[#4ADE80]">{ext}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => onRemoveFile(item.id)}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center border border-[#30363D] bg-[#0D1117]/90 text-[#E6EDF3] hover:border-[#EF4444] hover:text-[#EF4444]"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={1.75} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAttachment && (
        <div className="mb-2 grid grid-cols-1 gap-2 border border-[#30363D] bg-[#0D1117] p-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <input
            type="text" aria-label="Attachment name" value={attachmentName} maxLength={255}
            onChange={(e) => onChangeAttachmentName(e.target.value)} placeholder="Attachment label (optional)"
            className="h-8 border border-[#3B434B] bg-[#161B22] px-2.5 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
          <input
            type="text" aria-label="Attachment URL" value={attachmentUrl} maxLength={1024}
            onChange={(e) => onChangeAttachmentUrl(e.target.value)} placeholder="https://... or /api/..."
            className="h-8 border border-[#3B434B] bg-[#161B22] px-2.5 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
          <button type="button" aria-label="Close attachment bar" onClick={onCloseAttachment}
            className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8A8A8A] hover:text-[#E6EDF3]">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {error && <p role="alert" className="mb-2 text-xs text-[#EF4444]">{error}</p>}
    </>
  );
}
