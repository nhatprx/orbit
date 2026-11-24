import { useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import type { MemberDto } from '../../types/workspace.types';
import {
  applyMention,
  filterMentionCandidates,
  findActiveMention,
  type MentionCandidate,
} from './ChatMentionMenu';

/** Manages @mention autocomplete cursor tracking and keyboard navigation for ChatComposer. */
export function useChatMentionInput(
  draft: string,
  setDraft: (value: string) => void,
  members: MemberDto[],
  inputRef: RefObject<HTMLInputElement | null>,
  onUpdateTyping: (value: string) => void
) {
  const [cursor, setCursor] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeMention = useMemo(() => findActiveMention(draft, cursor), [draft, cursor]);
  const candidates = useMemo(
    () => (activeMention ? filterMentionCandidates(members, activeMention.query) : []),
    [activeMention, members]
  );

  function selectCandidate(candidate: MentionCandidate) {
    if (!activeMention) return;
    const { next, nextCursor } = applyMention(draft, activeMention.start, cursor, candidate.handle);
    setDraft(next);
    setCursor(nextCursor);
    setSelectedIndex(0);
    onUpdateTyping(next);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (candidates.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % candidates.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((i) => (i - 1 + candidates.length) % candidates.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const target = candidates[selectedIndex] ?? candidates[0];
      if (target) selectCandidate(target);
    } else if (event.key === 'Escape') {
      setCursor(0);
    }
  }

  return {
    cursor,
    candidates,
    selectedIndex,
    setCursor,
    resetSelection: () => setSelectedIndex(0),
    resetMention: () => { setCursor(0); setSelectedIndex(0); },
    selectCandidate,
    handleKeyDown,
  };
}
