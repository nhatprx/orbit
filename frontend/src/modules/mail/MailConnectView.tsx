import { useState, type FormEvent } from 'react';
import { Mail, Server } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { SquareCheckbox } from '../../components/ui/SquareCheckbox';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { mailService } from '../../services/workspace/services';
import type { MailAccountDto, MailProvider } from '../../types/workspace.types';
import { isValidEmail } from '../workspace/wizard/wizardValidation';

const PROVIDERS: { id: MailProvider; label: string; summary: string }[] = [
  { id: 'gmail', label: 'Gmail', summary: 'Sign in with Google (OAuth)' },
  { id: 'outlook', label: 'Outlook', summary: 'Sign in with Microsoft (OAuth)' },
  { id: 'imap', label: 'IMAP', summary: 'Any provider with IMAP and SMTP' },
];

interface MailConnectViewProps {
  /** Shown above the form when this is the first account. */
  intro?: boolean;
  onConnected: (account: MailAccountDto) => void;
  onCancel?: () => void;
}

/** Connects a personal mailbox. Orbit never hosts mail; credentials are validated, not kept (D-06). */
export function MailConnectView({ intro = false, onConnected, onCancel }: MailConnectViewProps) {
  const [provider, setProvider] = useState<MailProvider>('gmail');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('993');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useTls, setUseTls] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

  const connect = useAsyncAction(async () => {
    const name = displayName.trim() || undefined;
    const account =
      provider === 'imap'
        ? await mailService.connectImapAccount({
            email: email.trim(), displayName: name, host: host.trim(), port: Number(port),
            username: username.trim(), password, useTls,
          })
        : await mailService.connectOAuthAccount({ provider, email: email.trim(), displayName: name });
    setPassword('');
    onConnected(account);
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email.trim())) return setEmailError('Enter a valid email address.');
    setEmailError(null);
    void connect.run();
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col justify-center p-6">
      <div className="border border-[#30363D] bg-[#161B22] p-6">
        {intro && (
          <div className="mb-5">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-[#E6EDF3]">
              <Mail className="h-5 w-5 text-[#22C55E]" strokeWidth={1.5} />
              Connect your mailbox
            </h1>
            <p className="mt-1 text-[13px] text-[#8B949E]">
              Use your own email inside Orbit. Messages stay with your provider; Orbit only caches list details
              such as sender and subject. This preview uses a simulated mail provider.
            </p>
          </div>
        )}

        <div role="radiogroup" aria-label="Mail provider" className="mb-5 grid gap-2 sm:grid-cols-3">
          {PROVIDERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={provider === item.id}
              onClick={() => setProvider(item.id)}
              className={`border p-3 text-left transition-colors ${
                provider === item.id ? 'border-[#22C55E] bg-[#052E16]' : 'border-[#30363D] bg-[#0D1117] hover:border-[#3B434B]'
              }`}
            >
              <span className="block text-[13px] font-semibold text-[#E6EDF3]">{item.label}</span>
              <span className="block text-xs text-[#8B949E]">{item.summary}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Email address" type="email" required value={email} error={emailError} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          {provider === 'imap' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="IMAP host" required value={host} placeholder="imap.example.com" onChange={(e) => setHost(e.target.value)} />
              <TextField label="Port" type="number" required min={1} max={65535} value={port} onChange={(e) => setPort(e.target.value)} />
              <TextField label="Username" required autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
              <TextField label="Password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <label className="flex items-center gap-2 text-xs text-[#BDBDBD]">
                <SquareCheckbox checked={useTls} label="Use TLS" onChange={setUseTls} />
                Use TLS
              </label>
            </div>
          )}

          {connect.error && (
            <p role="alert" className="text-xs text-[#EF4444]">
              {connect.error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={connect.pending}>
              <Server className="h-3.5 w-3.5" strokeWidth={1.5} />
              {connect.pending ? 'Connecting...' : `Connect ${PROVIDERS.find((p) => p.id === provider)?.label ?? ''}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
