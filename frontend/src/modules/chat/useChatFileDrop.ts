import { useRef, useState, type DragEvent } from 'react';
import { extractDroppedFiles } from './chatFileDrop';

export function useChatFileDrop(enabled: boolean) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<{ id: number; files: File[] } | null>(null);
  const dragDepthRef = useRef(0);

  function hasFilePayload(event: DragEvent): boolean {
    return enabled && Array.from(event.dataTransfer.types ?? []).includes('Files');
  }

  function onDragEnter(event: DragEvent) {
    if (!hasFilePayload(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }

  function onDragOver(event: DragEvent) {
    if (!hasFilePayload(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function onDragLeave(event: DragEvent) {
    if (!hasFilePayload(event)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }

  async function onDrop(event: DragEvent) {
    if (!hasFilePayload(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    const extracted = await extractDroppedFiles(event.dataTransfer);
    if (extracted.length > 0) setDroppedFiles({ id: Date.now(), files: extracted });
  }

  return {
    isDragOver,
    droppedFiles,
    clearDroppedFiles: () => setDroppedFiles(null),
    dropHandlers: {
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop: (e: DragEvent) => void onDrop(e),
    },
  };
}
