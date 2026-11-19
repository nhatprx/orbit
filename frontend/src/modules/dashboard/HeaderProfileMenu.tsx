import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, LogOut, Shield, Smile } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import {
  PRIMARY_PROFILE_ITEMS,
  SETTINGS_PROFILE_ITEMS,
  type ProfileMenuItem,
} from './profileMenuItems';

interface HeaderProfileMenuProps {
  user: AuthUser;
  onSelectArea: (area: WorkspaceAreaId) => void;
  onNavigateHome: () => void;
  onLogout: () => void;
}

const ITEM_CLASS =
  'flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-[#E6EDF3] transition-colors hover:bg-[#21262D] hover:text-[#22C55E]';

export function HeaderProfileMenu({
  user,
  onSelectArea,
  onNavigateHome,
  onLogout,
}: HeaderProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('Set status');
  const [editingStatus, setEditingStatus] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setEditingStatus(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const handle = user.username ?? user.email.split('@')[0] ?? user.name;

  function renderItems(items: ProfileMenuItem[]) {
    return items.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            if (item.area) onSelectArea(item.area);
            setOpen(false);
          }}
          className={ITEM_CLASS}
        >
          <span className="flex items-center gap-2.5">
            <Icon className="h-3.5 w-3.5 text-[#A3A3A3]" strokeWidth={1.5} />
            {item.label}
          </span>
          {item.badge && <Badge tone={item.badge.tone}>{item.badge.text}</Badge>}
        </button>
      );
    });
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        title={user.email}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-xs font-semibold text-[#22C55E]"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 border border-[#30363D] bg-[#161B22] py-1">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-xs font-semibold text-[#22C55E]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#E6EDF3]">{handle}</p>
                <p className="truncate text-xs text-[#8B949E]">{user.name}</p>
              </div>
            </div>
            <button
              type="button"
              title="Back to Home"
              onClick={() => {
                setOpen(false);
                onNavigateHome();
              }}
              className="flex h-7 w-7 items-center justify-center border border-transparent text-[#A3A3A3] hover:border-[#3B434B] hover:text-[#22C55E]"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="border-b border-[#30363D] px-3 pb-2.5">
            {editingStatus ? (
              <input
                type="text"
                autoFocus
                value={status === 'Set status' ? '' : status}
                onChange={(e) => setStatus(e.target.value || 'Set status')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingStatus(false);
                }}
                onBlur={() => setEditingStatus(false)}
                placeholder="What is your status?"
                className="w-full border border-[#22C55E] bg-[#0D1117] px-2 py-1 text-xs text-[#E6EDF3] focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingStatus(true)}
                className="flex w-full items-center gap-2 border border-transparent px-1 py-1 text-xs text-[#A3A3A3] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]"
              >
                <Smile className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{status}</span>
              </button>
            )}
          </div>

          <div className="border-b border-[#30363D] py-1">
            {renderItems(PRIMARY_PROFILE_ITEMS)}
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  onSelectArea('admin');
                  setOpen(false);
                }}
                className={ITEM_CLASS}
              >
                <span className="flex items-center gap-2.5 text-[#22C55E]">
                  <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Admin Console
                </span>
              </button>
            )}
          </div>

          <div className="border-b border-[#30363D] py-1">
            {renderItems(SETTINGS_PROFILE_ITEMS)}
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[#EF4444] hover:bg-[#21262D]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
