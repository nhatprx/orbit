import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { MemberDto } from '../../types/workspace.types';

interface MemberSubRoleCellProps {
  member: MemberDto;
  canEdit: boolean;
  onSave?: (member: MemberDto, subRole: string) => Promise<void>;
}

export function MemberSubRoleCell({ member, canEdit, onSave }: MemberSubRoleCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.subRole ?? '');
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      await onSave(member, draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing && canEdit && onSave) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          aria-label={`Sub-role of ${member.displayName}`}
          value={draft}
          maxLength={64}
          autoFocus
          placeholder="e.g. Backend Engineer"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); void commit(); }
            if (e.key === 'Escape') { setDraft(member.subRole ?? ''); setEditing(false); }
          }}
          className="h-7 w-40 border border-[#22C55E] bg-[#0D1117] px-2 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none"
        />
        <button
          type="button"
          aria-label="Save sub-role"
          disabled={saving}
          onClick={() => void commit()}
          className="flex h-7 w-7 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#4ADE80] hover:bg-[#14532D] disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Cancel sub-role edit"
          onClick={() => { setDraft(member.subRole ?? ''); setEditing(false); }}
          className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {member.subRole ? (
        <span className="border border-[#1E5631] bg-[#052E16]/60 px-2 py-0.5 font-mono text-[11px] text-[#4ADE80]">
          {member.subRole}
        </span>
      ) : (
        <span className="text-xs text-[#6E7681]">Not set</span>
      )}
      {canEdit && onSave && (
        <button
          type="button"
          aria-label={`Edit sub-role for ${member.displayName}`}
          title="Edit sub-role"
          onClick={() => { setDraft(member.subRole ?? ''); setEditing(true); }}
          className="flex h-6 w-6 items-center justify-center text-[#7D8590] transition-colors hover:text-[#22C55E]"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
