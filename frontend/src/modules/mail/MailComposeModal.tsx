import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { isValidEmail } from '../workspace/wizard/wizardValidation';
import type { ComposeDraft, ComposeMode } from './mailCompose';

interface MailComposeModalProps {
  mode: ComposeMode;
  fromEmail: string;
  initial: ComposeDraft;
  onSend: (draft: ComposeDraft) => Promise<void>;
  onClose: () => void;
}

const TITLES: Record<ComposeMode, string> = { new: 'New message', reply: 'Reply', forward: 'Forward' };

/** Mount it only while open so each compose session starts from a fresh draft. */
export function MailComposeModal({ mode, fromEmail, initial, onSend, onClose }: MailComposeModalProps) {
  const [toEmail, setToEmail] = useState(initial.toEmail);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [toError, setToError] = useState<string | null>(null);
  const send = useAsyncAction(async () => {
    await onSend({ toEmail: toEmail.trim(), subject: subject.trim(), body, inReplyToId: initial.inReplyToId });
    onClose();
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(toEmail.trim())) return setToError('Enter a valid recipient address.');
    setToError(null);
    void send.run();
  }

  return (
    <Modal open title={TITLES[mode]} subtitle={`From: ${fromEmail}`} size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField label="To" type="email" autoFocus={mode !== 'reply'} value={toEmail} error={toError} onChange={(e) => setToEmail(e.target.value)} />
        <TextField label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <TextAreaField label="Message" rows={10} autoFocus={mode === 'reply'} value={body} onChange={(e) => setBody(e.target.value)} />
        {send.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {send.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Discard
          </Button>
          <Button type="submit" variant="primary" disabled={send.pending || !subject.trim()}>
            <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
            {send.pending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
