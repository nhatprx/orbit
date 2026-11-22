import { useState } from 'react';
import { X } from 'lucide-react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useResource } from '../../hooks/useResource';
import type { AdminUserService } from '../../services/admin/adminUser.service';
import type { AdminUserDetail } from '../../types/admin.types';
import { AdminUserActions } from './AdminUserActions';
import { AdminUserProfile } from './AdminUserProfile';

interface AdminUserDialogProps {
  /** The user on screen; null keeps the side panel closed. */
  userId: string | null;
  currentUserId: string;
  service: AdminUserService;
  onClose: () => void;
  onChanged: (detail: AdminUserDetail) => void;
}

export function AdminUserDialog({ userId, ...rest }: AdminUserDialogProps) {
  if (userId === null) return null;
  // Keyed by user so notices and form state never leak from one account to the next.
  return <DialogBody key={userId} userId={userId} {...rest} />;
}

function DialogBody({ userId, currentUserId, service, onClose, onChanged }: AdminUserDialogProps & { userId: string }) {
  const detail = useResource(() => service.get(userId), [userId, service]);
  const [notice, setNotice] = useState<string | null>(null);
  const { data } = detail;

  function handleUpdated(updated: AdminUserDetail) {
    detail.setData(updated);
    onChanged(updated);
  }

  return (
    <aside
      role="dialog"
      aria-label="User details"
      className="flex h-full w-full shrink-0 flex-col border-l border-[#30363D] bg-[#161B22] lg:w-96 xl:w-[440px]"
    >
      <div className="flex items-start justify-between border-b border-[#30363D] px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#E6EDF3]">User details</h2>
          {data && <p className="mt-0.5 truncate font-mono text-xs text-[#8A8A8A]">@{data.username}</p>}
        </div>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="text-[#8A8A8A] hover:text-[#E6EDF3]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!data && detail.loading && <LoadingView label="Loading user..." />}
        {detail.error && <ErrorView message={detail.error} onRetry={detail.reload} />}
        {data && (
          <div className="space-y-5">
            <AdminUserProfile detail={data} self={data.id === currentUserId} />
            {notice && (
              <p role="status" className="border border-[#22C55E] bg-[#052E16] px-3 py-2 text-xs text-[#4ADE80]">
                {notice}
              </p>
            )}
            <AdminUserActions
              detail={data}
              self={data.id === currentUserId}
              service={service}
              onUpdated={handleUpdated}
              onNotice={setNotice}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
