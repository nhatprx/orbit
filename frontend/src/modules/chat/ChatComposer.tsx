import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { errorMessage } from '../../services/workspace/httpClient';
import { MAX_MESSAGE_LENGTH, checkDraft } from './chatMessages';

interface ChatComposerProps {
  placeholder: string;
  disabled?: boolean;
  onSend: (content: string) => Promise<void>;
}

export function ChatComposer({ placeholder, disabled = false, onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const check = checkDraft(draft);
    if (!check.ok) return setError(check.error);
    setError(null);
    setPending(true);
    try {
      await onSend(check.content);
      setDraft('');
    } catch (err) {
      // The draft stays in the box, so a failed send never loses what the user typed.
      setError(errorMessage(err, 'Message could not be sent.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="border-t border-[#30363D] bg-[#161B22] p-4">
      {error && (
        <p role="alert" className="mb-2 text-xs text-[#EF4444]">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Message"
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH + 100}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-10 flex-1 border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none disabled:opacity-50"
        />
        <Button type="submit" variant="primary" disabled={disabled || pending || !draft.trim()}>
          <Send className="h-4 w-4" strokeWidth={1.5} />
          Send
        </Button>
      </div>
    </form>
  );
}
