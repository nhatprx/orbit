import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollabStompClient } from '../../services/collab/collabClient';
import type { CollabParticipant, ScopeCatalogEvent } from '../../types/collab.types';
import { CollabPresenceBar } from './CollabPresenceBar';
import { useScopeCatalogSync } from './useScopeCatalogSync';

function makeParticipants(count: number): CollabParticipant[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `u-${idx + 1}`,
    sessionId: `s-${idx + 1}`,
    displayName: idx === 0 ? 'Ada Lovelace' : `Member ${idx + 1}`,
    color: '#22C55E',
    cursor: idx === 0 ? { cellLabel: 'B3' } : null,
  }));
}

describe('CollabPresenceBar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders square initials badges, overflow counter, active hint, locked badge, and lock toggle', () => {
    const onToggleLock = vi.fn();
    render(
      <CollabPresenceBar
        participants={makeParticipants(7)}
        locked={true}
        canToggleLock={true}
        activeHint="Cell B3"
        onToggleLock={onToggleLock}
      />
    );

    expect(screen.getByTestId('collab-locked-badge')).toBeTruthy();
    expect(screen.getByTestId('collab-active-hint').textContent).toBe('Cell B3');
    const badges = screen.getAllByTestId('collab-participant-badge');
    expect(badges).toHaveLength(5);
    expect(badges[0]?.textContent).toContain('AL');
    expect(badges[0]?.getAttribute('title')).toContain('[B3]');
    expect(screen.getByTestId('collab-participant-overflow').textContent).toBe('+2');

    const toggle = screen.getByTestId('collab-lock-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Unlock resource');
    fireEvent.click(toggle);
    expect(onToggleLock).toHaveBeenCalledTimes(1);
  });

  it('hides lock toggle when canToggleLock is false', () => {
    render(<CollabPresenceBar participants={makeParticipants(1)} locked={false} canToggleLock={false} />);
    expect(screen.queryByTestId('collab-locked-badge')).toBeNull();
    expect(screen.queryByTestId('collab-lock-toggle')).toBeNull();
  });
});

describe('useScopeCatalogSync', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes to scope topic, filters by module, and debounces refreshes', () => {
    vi.useFakeTimers();
    let emit: ((event: ScopeCatalogEvent) => void) | null = null;
    const unsubscribe = vi.fn();
    const fakeClient = {
      subscribeScopeCatalog: vi.fn((_scope, handler) => {
        emit = handler;
        return unsubscribe;
      }),
    } as unknown as CollabStompClient;

    const onRefresh = vi.fn();
    const onEvent = vi.fn();
    const { unmount } = renderHook(() =>
      useScopeCatalogSync({
        scope: { type: 'PROJECT', workspaceId: 'ws-1', projectId: 'p-1' },
        module: 'whiteboard',
        debounceMs: 100,
        client: fakeClient,
        onRefresh,
        onEvent,
      })
    );

    expect(fakeClient.subscribeScopeCatalog).toHaveBeenCalledWith(
      { type: 'PROJECT', workspaceId: 'ws-1', projectId: 'p-1' },
      expect.any(Function)
    );

    act(() => {
      emit?.({ module: 'issues', action: 'UPDATED', resourceId: 'i-1' });
    });
    vi.advanceTimersByTime(150);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();

    act(() => {
      emit?.({ module: 'whiteboard', action: 'LOCK_CHANGED', resourceId: 'b-1', locked: true });
      emit?.({ module: 'whiteboard', action: 'UPDATED', resourceId: 'b-1' });
    });
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onRefresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
