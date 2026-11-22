import { useEffect } from 'react';
import type { CloudNodeDto } from '../../types/cloud.types';

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

interface UseFinderShortcutsOptions {
  enabled: boolean;
  quickLookOpen: boolean;
  selectedSingleFile: CloudNodeDto | null;
  onOpenQuickLook: (node: CloudNodeDto) => void;
  onToggleInspector?: () => void;
}

export function useFinderShortcuts({
  enabled,
  quickLookOpen,
  selectedSingleFile,
  onOpenQuickLook,
  onToggleInspector,
}: UseFinderShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      if (onToggleInspector && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        onToggleInspector();
        return;
      }

      if (
        !quickLookOpen &&
        selectedSingleFile &&
        (e.key === ' ' || e.code === 'Space') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        onOpenQuickLook(selectedSingleFile);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, quickLookOpen, selectedSingleFile, onOpenQuickLook, onToggleInspector]);
}
