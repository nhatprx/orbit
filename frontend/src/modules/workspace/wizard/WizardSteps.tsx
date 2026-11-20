import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { TextAreaField, TextField } from '../../../components/ui/Field';
import { SocialAccountsPanel } from '../../integrations/SocialAccountsPanel';
import { MODULE_META, MODULE_ORDER } from '../moduleMeta';
import { MAX_INVITES, type InfoErrors, type WizardValues } from './wizardValidation';
import type { ModuleKey } from '../../../types/workspace.types';

export function StepInfo(props: {
  values: WizardValues;
  errors: InfoErrors;
  onChange: (patch: Partial<WizardValues>) => void;
}) {
  const { values, errors, onChange } = props;
  return (
    <div className="space-y-4">
      <TextField
        label="Workspace name"
        required
        autoFocus
        maxLength={100}
        value={values.name}
        error={errors.name}
        placeholder="Acme Engineering"
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <TextAreaField
        label="Description (optional)"
        rows={3}
        maxLength={500}
        value={values.description}
        error={errors.description}
        placeholder="What does this workspace hold?"
        onChange={(e) => onChange({ description: e.target.value })}
      />
      <TextField
        label="Avatar URL (optional)"
        type="url"
        value={values.avatarUrl}
        error={errors.avatarUrl}
        placeholder="https://example.com/logo.png"
        onChange={(e) => onChange({ avatarUrl: e.target.value })}
      />
    </div>
  );
}

export function StepModules(props: {
  selected: ModuleKey[];
  error: string | null;
  onToggle: (key: ModuleKey) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#BDBDBD]">
        Choose the modules this workspace starts with. Projects can only use modules enabled here.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODULE_ORDER.map((key) => {
          const meta = MODULE_META[key];
          const Icon = meta.icon;
          const on = props.selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => props.onToggle(key)}
              className={`flex items-start gap-3 border p-3 text-left transition-colors ${
                on ? 'border-[#22C55E] bg-[#052E16]' : 'border-[#30363D] bg-[#0D1117] hover:border-[#3B434B]'
              }`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${on ? 'text-[#22C55E]' : 'text-[#8B949E]'}`} strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#E6EDF3]">{meta.label}</span>
                <span className="block text-xs text-[#8B949E]">{meta.summary}</span>
              </span>
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 ${on ? 'bg-[#22C55E]' : 'bg-[#3B434B]'}`} />
            </button>
          );
        })}
      </div>
      {props.error && (
        <p role="alert" className="text-xs text-[#EF4444]">
          {props.error}
        </p>
      )}
    </div>
  );
}

export function StepIntegrations() {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#BDBDBD]">
        Optional. Link a social account for sign-in. You can do this later from Settings.
      </p>
      <SocialAccountsPanel />
    </div>
  );
}

export function StepInvites(props: {
  emails: string[];
  error: string | null;
  onAdd: (email: string) => boolean;
  onRemove: (email: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (props.onAdd(draft)) setDraft('');
  };
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#BDBDBD]">
        Optional. Invite teammates by email now, or create invite links later under Settings, Invites.
      </p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label="Email address"
            type="email"
            value={draft}
            error={props.error}
            placeholder="teammate@example.com"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" onClick={add}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add
        </Button>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Invited emails">
        {props.emails.map((email) => (
          <li key={email} className="flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-1 text-xs text-[#E6EDF3]">
            {email}
            <button type="button" aria-label={`Remove ${email}`} onClick={() => props.onRemove(email)} className="text-[#8B949E] hover:text-[#EF4444]">
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-[11px] text-[#7D8590]">
        {props.emails.length} / {MAX_INVITES}
      </p>
    </div>
  );
}

export function StepReview({ values }: { values: WizardValues }) {
  const rows: [string, string][] = [
    ['Name', values.name.trim()],
    ['Description', values.description.trim() || 'None'],
    ['Modules', values.modules.map((m) => MODULE_META[m].label).join(', ')],
    ['Invitations', values.emails.length === 0 ? 'None' : `${values.emails.length} email invitation(s)`],
  ];
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#BDBDBD]">
        Review and create. You become the Owner, default roles are seeded, and the selected modules are enabled.
      </p>
      <dl className="divide-y divide-[#30363D] border border-[#30363D]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4 px-4 py-2.5 text-[13px]">
            <dt className="w-28 shrink-0 text-[#8B949E]">{label}</dt>
            <dd className="min-w-0 break-words text-[#E6EDF3]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
