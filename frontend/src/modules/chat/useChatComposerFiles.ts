import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { isChatImageFile, validateChatFile } from '../../services/workspace/chatImageUpload';
import type { PendingChatFile } from './ChatComposerBars';

const MAX_BATCH_FILES = 10;

export function useChatComposerFiles(
  disabled: boolean,
  channelId: string | undefined,
  onError: (message: string | null) => void,
  onClearLinkAttachment: () => void
) {
  const [pendingFiles, setPendingFiles] = useState<PendingChatFile[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    pendingFiles.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
  }, []);

  function addFiles(fileList: FileList | File[] | null | undefined) {
    if (!fileList || disabled) return;
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;
    const next: PendingChatFile[] = [];
    for (const file of incoming) {
      const err = validateChatFile(file);
      if (err) { onError(err); return; }
      const isImage = isChatImageFile(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        isImage,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
      });
    }
    onError(null);
    onClearLinkAttachment();
    setPendingFiles((prev) => [...prev, ...next].slice(0, MAX_BATCH_FILES));
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(id: string) {
    setPendingFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function clearFiles() {
    setPendingFiles((prev) => {
      prev.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
      return [];
    });
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const items = event.clipboardData?.items;
    if (!items || !channelId) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      event.preventDefault();
      addFiles(files);
    }
  }

  return { pendingFiles, imageInputRef, fileInputRef, addFiles, removeFile, clearFiles, handlePaste };
}
