import { useCallback, useEffect, useRef, useState } from 'react';
import { AtSign, Bell, Check, CheckCheck, ExternalLink, Users, X } from 'lucide-react';
import { getStoredSession } from '../../services/auth.storage';
import { chatConnection } from '../../services/workspace/httpChat.service';
import { invitationService } from '../../services/workspace/services';
import type { InvitationInboxDto } from '../../types/workspace.types';
import { notificationService, type NotificationDto } from '../../services/notifications.service';

interface DashboardNotificationsMenuProps {
  onInviteAccepted: (workspaceId: string, projectId: string | null) => Promise<void>;
  onOpenIssue: (notification: NotificationDto) => Promise<void>;
}

export function DashboardNotificationsMenu({ onInviteAccepted, onOpenIssue }: DashboardNotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<InvitationInboxDto[]>([]);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [inviteResult, notificationResult] = await Promise.allSettled([
      invitationService.listInbox(0, 20), notificationService.list(0, 20),
    ]);
    if (inviteResult.status === 'fulfilled') setInvites(inviteResult.value.items);
    if (notificationResult.status === 'fulfilled') {
      setItems(notificationResult.value.page.items);
      setUnreadCount(notificationResult.value.unreadCount);
    }
    if (inviteResult.status === 'rejected' || notificationResult.status === 'rejected') {
      setError('Some notifications could not be loaded.');
    } else setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    const userId = getStoredSession()?.user.id;
    const unsub = userId
      ? chatConnection.subscribe(`/topic/notifications.${userId}`, (frame) => {
          try {
            const incoming = JSON.parse(frame.body) as NotificationDto;
            if (!incoming?.id) return;
            setItems((current) => {
              if (current.some((n) => n.id === incoming.id)) return current;
              setUnreadCount((count) => count + 1);
              return [incoming, ...current].slice(0, 20);
            });
          } catch { /* ignore malformed notification frame */ }
        })
      : () => {};
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
    };
  }, [load]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function acceptInvite(invite: InvitationInboxDto) {
    setBusyId(invite.id);
    setError(null);
    try {
      await invitationService.acceptInvitation(invite.token);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
      await onInviteAccepted(invite.workspaceId, invite.projectId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not accept invitation.');
    } finally {
      setBusyId(null);
    }
  }

  async function declineInvite(invite: InvitationInboxDto) {
    setBusyId(invite.id);
    setError(null);
    try {
      await invitationService.declineInvitation(invite.token);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not decline invitation.');
    } finally {
      setBusyId(null);
    }
  }

  async function openNotification(item: NotificationDto) {
    if (!item.readAt) {
      try {
        await notificationService.markRead(item.id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not update notification.');
        return;
      }
      setItems((current) => current.map((n) => n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    if (item.type === 'CHAT_MENTION' || !item.issueId) return;
    try {
      await onOpenIssue(item);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open issue.');
    }
  }

  async function markAllRead() {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark notifications read.');
    }
  }

  const badgeCount = invites.length + unreadCount;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button" title="Notifications" aria-label={`Notifications${badgeCount ? `, ${badgeCount} unread` : ''}`}
        aria-expanded={open} onClick={() => { if (!open) void load(); setOpen((value) => !value); }}
        className={`relative flex h-7 w-7 items-center justify-center border bg-[#161B22] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3] ${open ? 'border-[#22C55E] text-[#22C55E]' : 'border-[#30363D] text-[#8B949E]'}`}
      >
        <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
        {badgeCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center border border-[#0D1117] bg-[#22C55E] px-0.5 font-mono text-[9px] font-semibold text-[#0D1117]">{badgeCount > 99 ? '99+' : badgeCount}</span>}
      </button>

      {open && (
        <section aria-label="Notifications inbox" className="absolute right-0 z-50 mt-1.5 max-h-[min(75vh,34rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto border border-[#30363D] bg-[#0D1117] shadow-xl">
          <header className="flex items-center justify-between border-b border-[#30363D] px-3 py-2.5">
            <div>
              <h2 className="text-xs font-semibold text-[#E6EDF3]">Notifications</h2>
              <p className="mt-0.5 text-[10px] text-[#8B949E]">Invitations and issue updates</p>
            </div>
            {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 text-[10px] text-[#8B949E] hover:text-[#22C55E]"><CheckCheck className="h-3 w-3" />Mark all read</button>}
          </header>
          {error && <p role="alert" className="border-b border-[#EF4444]/40 px-3 py-2 text-[11px] text-[#EF4444]">{error}</p>}
          {loading ? <p className="px-3 py-5 text-center text-xs text-[#8B949E]">Loading notifications...</p> : (
            <>
              <div className="border-b border-[#30363D]">
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#8B949E]"><Users className="h-3 w-3" />Invitations <span className="font-mono text-[#22C55E]">{invites.length}</span></div>
                {invites.map((invite) => (
                  <article key={invite.id} className="border-t border-[#21262D] px-3 py-2.5">
                    <p className="text-xs font-medium text-[#E6EDF3]">{invite.projectName ? `Project: ${invite.projectName}` : `Workspace: ${invite.workspaceName}`}</p>
                    <p className="mt-1 text-[11px] text-[#8B949E]">Invited as {invite.roleName}{invite.projectName ? ` in ${invite.workspaceName}` : ''}</p>
                    <div className="mt-2 flex gap-1.5">
                      <button type="button" disabled={busyId === invite.id} onClick={() => void acceptInvite(invite)} className="flex h-6 items-center gap-1 border border-[#22C55E] bg-[#052E16] px-2 text-[10px] text-[#22C55E] disabled:opacity-50"><Check className="h-3 w-3" />Accept</button>
                      <button type="button" disabled={busyId === invite.id} onClick={() => void declineInvite(invite)} className="flex h-6 items-center gap-1 border border-[#30363D] px-2 text-[10px] text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-50"><X className="h-3 w-3" />Decline</button>
                    </div>
                  </article>
                ))}
                {invites.length === 0 && <p className="px-3 pb-3 text-[11px] text-[#8B949E]">No pending invitations.</p>}
              </div>
              <div>
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#8B949E]"><AtSign className="h-3 w-3" />Issue activity <span className="font-mono text-[#22C55E]">{unreadCount}</span></div>
                {items.map((item) => (
                  <button key={item.id} type="button" onClick={() => void openNotification(item)} className="flex w-full items-start gap-2 border-t border-[#21262D] px-3 py-2.5 text-left hover:bg-[#161B22]">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 ${item.readAt ? 'bg-[#30363D]' : 'bg-[#22C55E]'}`} />
                    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-xs font-medium text-[#E6EDF3]">{item.title}<ExternalLink className="h-3 w-3 shrink-0 text-[#8B949E]" /></span><span className="mt-1 block text-[11px] leading-4 text-[#8B949E]">{item.message}</span><span className="mt-1 block font-mono text-[9px] text-[#6E7681]">{item.issueKey}</span></span>
                  </button>
                ))}
                {items.length === 0 && <p className="px-3 pb-3 text-[11px] text-[#8B949E]">No issue activity notifications.</p>}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
