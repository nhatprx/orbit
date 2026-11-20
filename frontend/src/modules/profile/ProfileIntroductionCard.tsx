import { useState, type FormEvent } from 'react';
import { FileText, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { errorMessage } from '../../services/workspace/httpClient';

interface ProfileIntroductionCardProps {
  introduction: string | null | undefined;
  onSave: (introduction: string) => Promise<void>;
}

export function ProfileIntroductionCard({ introduction, onSave }: ProfileIntroductionCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(introduction ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(introduction ?? '');
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save introduction.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-[#30363D] bg-[#161B22]">
      <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
            Introduction
          </h2>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[#8B949E] transition-colors hover:text-[#22C55E]"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.5} />
            {introduction ? 'Edit' : 'Add introduction'}
          </button>
        )}
      </div>

      <div className="p-5">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              rows={4}
              maxLength={2000}
              aria-label="Introduction"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a short introduction about yourself, your role, and what you are building on Orbit..."
              className="w-full border border-[#30363D] bg-[#0D1117] p-3 text-sm leading-relaxed text-[#E6EDF3] placeholder:text-[#666666] focus:border-[#22C55E] focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-[#666666]">
                {draft.length} / 2000
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            {error && (
              <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </p>
            )}
          </form>
        ) : introduction ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#E6EDF3]">
            {introduction}
          </p>
        ) : (
          <p className="text-sm text-[#8B949E]">
            No introduction added yet. Share a brief overview of your background or current focus.
          </p>
        )}
      </div>
    </section>
  );
}
