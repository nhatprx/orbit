import { useState, type FormEvent } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { ComposeMailPayload } from '../../types/mail.types';

interface MailComposeModalProps {
  open: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (payload: ComposeMailPayload) => Promise<void>;
}

const INPUT_CLASS =
  'w-full border border-[#3B434B] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none';

export function MailComposeModal({
  open,
  sending,
  onClose,
  onSend,
}: MailComposeModalProps) {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!toEmail.trim() || !subject.trim() || !body.trim()) return;
    await onSend({ toEmail, subject, body });
    setToEmail('');
    setSubject('');
    setBody('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg border border-[#3B434B] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#E6EDF3]">
            New Message
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A8A8A] hover:text-[#E6EDF3]"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs text-[#BDBDBD]">To</label>
            <input
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="recipient@orbit.dev"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#BDBDBD]">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#BDBDBD]">Message</label>
            <textarea
              rows={6}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className={INPUT_CLASS}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={sending}>
              <Send className="h-4 w-4" strokeWidth={1.5} />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
