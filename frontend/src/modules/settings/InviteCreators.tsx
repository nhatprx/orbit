import { useState, type FormEvent } from 'react';
import { Link2, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { invitationService } from '../../services/workspace/services';
import type { RoleDto } from '../../types/workspace.types';
import { isValidEmail } from '../workspace/wizard/wizardValidation';

interface InviteCreatorsProps {
  workspaceId: string;
  /** Roles that may be granted by invitation (the immutable Owner role is excluded). */
  roles: RoleDto[];
  onCreated: () => void;
}

/** Email invite and reusable link forms (D-14). Links last 7 days and default to Member (BR-10). */
export function InviteCreators({ workspaceId, roles, onCreated }: InviteCreatorsProps) {
  const grantable = roles.filter((r) => !r.immutable);
  const defaultRole = grantable.find((r) => r.name === 'Member')?.id ?? grantable[0]?.id ?? '';
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [roleId, setRoleId] = useState('');
  const chosenRole = roleId || defaultRole;

  const sendEmail = useAsyncAction(async () => {
    await invitationService.createEmailInvitation(workspaceId, {
      email: email.trim().toLowerCase(),
      ...(chosenRole ? { roleId: chosenRole } : {}),
    });
    setEmail('');
    onCreated();
  });
  const createLink = useAsyncAction(async () => {
    await invitationService.createLinkInvitation(workspaceId, chosenRole ? { roleId: chosenRole } : {});
    onCreated();
  });

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email.trim().toLowerCase())) return setEmailError('Enter a valid email address.');
    setEmailError(null);
    await sendEmail.run();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={(e) => void handleEmail(e)} className="space-y-3 border border-[#30363D] p-4">
        <h3 className="text-[13px] font-semibold text-[#E6EDF3]">Invite by email</h3>
        <TextField
          label="Email address"
          type="email"
          value={email}
          error={emailError ?? sendEmail.error}
          placeholder="teammate@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
        <SelectField label="Role" value={chosenRole} onChange={(e) => setRoleId(e.target.value)}>
          {grantable.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </SelectField>
        <Button type="submit" variant="primary" disabled={sendEmail.pending || !email.trim()}>
          <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
          {sendEmail.pending ? 'Sending...' : 'Send invitation'}
        </Button>
      </form>

      <div className="space-y-3 border border-[#30363D] p-4">
        <h3 className="text-[13px] font-semibold text-[#E6EDF3]">Invite link</h3>
        <p className="text-xs text-[#8B949E]">
          Anyone with the link can join with the selected role until it expires after 7 days or you revoke it.
        </p>
        <SelectField label="Role" value={chosenRole} onChange={(e) => setRoleId(e.target.value)}>
          {grantable.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </SelectField>
        {createLink.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {createLink.error}
          </p>
        )}
        <Button type="button" variant="secondary" disabled={createLink.pending} onClick={() => void createLink.run()}>
          <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          {createLink.pending ? 'Creating...' : 'Create link'}
        </Button>
      </div>
    </div>
  );
}
