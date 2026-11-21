import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  applyFormulaSuggestion,
  getFormulaSuggestions,
  type FormulaSuggestionItem,
} from './sheetFormulaSuggest';

interface UseSheetFormulaSuggestArgs {
  activeRaw: string;
  isEditing: boolean;
  readOnly: boolean;
  onApplyValue: (nextValue: string, nextCursor: number) => void;
}

export interface SheetFormulaSuggestController {
  isOpen: boolean;
  items: FormulaSuggestionItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  updateCursor: (selectionStart: number | null | undefined, valueLength: number) => void;
  resetDismissed: () => void;
  acceptSuggestion: (fnName: string) => void;
  handleSuggestKeyDown: (e: KeyboardEvent) => boolean;
}

export function useSheetFormulaSuggest({
  activeRaw,
  isEditing,
  readOnly,
  onApplyValue,
}: UseSheetFormulaSuggestArgs): SheetFormulaSuggestController {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [cursorPos, setCursorPos] = useState<number | undefined>(undefined);

  const result = useMemo(() => {
    if (readOnly || !isEditing || dismissed) return null;
    return getFormulaSuggestions(activeRaw, cursorPos);
  }, [readOnly, isEditing, dismissed, activeRaw, cursorPos]);

  const queryKey = result?.token.query ?? '';
  useEffect(() => {
    setActiveIndex(0);
  }, [queryKey, isEditing]);

  useEffect(() => {
    setDismissed(false);
  }, [activeRaw]);

  useEffect(() => {
    if (!isEditing) {
      setDismissed(false);
      setCursorPos(undefined);
    }
  }, [isEditing]);

  const items = result?.items ?? [];
  const safeIndex = items.length > 0 ? Math.min(activeIndex, items.length - 1) : 0;
  const isOpen = Boolean(result && items.length > 0);

  const updateCursor = (selectionStart: number | null | undefined, valueLength: number) => {
    setDismissed(false);
    setCursorPos(
      typeof selectionStart === 'number' && selectionStart > 0 && selectionStart < valueLength
        ? selectionStart
        : undefined
    );
  };

  const acceptSuggestion = (fnName: string) => {
    if (!result) return;
    const { nextValue, nextCursor } = applyFormulaSuggestion(activeRaw, result.token, fnName);
    setCursorPos(undefined);
    setDismissed(false);
    setActiveIndex(0);
    onApplyValue(nextValue, nextCursor);
  };

  const handleSuggestKeyDown = (e: KeyboardEvent): boolean => {
    if (!isOpen) return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
      return true;
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const chosen = items[safeIndex] ?? items[0];
      if (chosen) acceptSuggestion(chosen.name);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setDismissed(true);
      return true;
    }
    return false;
  };

  return {
    isOpen,
    items,
    activeIndex: safeIndex,
    setActiveIndex,
    updateCursor,
    resetDismissed: () => setDismissed(false),
    acceptSuggestion,
    handleSuggestKeyDown,
  };
}
