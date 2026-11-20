import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { errorMessage } from '../../services/workspace/httpClient';
import { PasswordInput } from '../auth/PasswordInput';
import { evaluatePasswordRules, validateStrongPassword } from '../auth/passwordPolicy';
import { PasswordRulesList } from '../auth/PasswordRulesList';

interface PasswordSettingsPanelProps {
  hasPassword: boolean;
  onUpdated: () => void;
}

export function PasswordSettingsPanel({ hasPassword, onUpdated }: PasswordSettingsPanelProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const rules = evaluatePasswordRules(newPassword);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (hasPassword && !currentPassword) {
      setError('Current password is required.');
      return;
    }
    const policyError = validateStrongPassword(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await accountSecurityService.changePassword(
        hasPassword ? currentPassword : null,
        newPassword
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(res.message);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err, 'Failed to update password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CollapsibleCard
      title={hasPassword ? 'Change password' : 'Set account password'}
      description={
        hasPassword
          ? 'Update the password used to sign in with username or email.'
          : 'Your account signs in via OAuth. Set a password to enable password sign-in.'
      }
      icon={<KeyRound className="h-4 w-4" strokeWidth={1.5} />}
      badge={
        <Badge tone={hasPassword ? 'green' : 'neutral'} withDot>
          {hasPassword ? 'Configured' : 'Not set'}
        </Badge>
      }
      defaultOpen={false}
    >
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {hasPassword && (
          <div>
            <label htmlFor="acc-current-pw" className="mb-1 block text-xs text-[#A3A3A3]">
              Current password
            </label>
            <PasswordInput
              id="acc-current-pw"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
            />
          </div>
        )}

        <div>
          <label htmlFor="acc-new-pw" className="mb-1 block text-xs text-[#A3A3A3]">
            New password
          </label>
          <PasswordInput
            id="acc-new-pw"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Enter a strong password"
          />
          {newPassword && <PasswordRulesList rules={rules} />}
        </div>

        <div>
          <label htmlFor="acc-confirm-pw" className="mb-1 block text-xs text-[#A3A3A3]">
            Confirm new password
          </label>
          <PasswordInput
            id="acc-confirm-pw"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter new password"
          />
        </div>

        {error && (
          <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="border border-[#22C55E] bg-[#052E16] px-3 py-2 text-xs text-[#22C55E]">
            {success}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={submitting}>
          <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
          {submitting ? 'Saving...' : hasPassword ? 'Update password' : 'Set password'}
        </Button>
      </form>
    </CollapsibleCard>
  );
}
