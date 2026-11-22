import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { errorMessage } from '../../services/workspace/httpClient';
import type {
  ChatChannelDto,
  ChatChannelType,
  CreateChatChannelRequest,
  UpdateChatChannelRequest,
} from '../../types/workspace.types';
import { ChatChannelTypeOptions } from './ChatChannelTypeOptions';

interface ChatChannelModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialChannel?: ChatChannelDto | null;
  parentChannel?: ChatChannelDto | null;
  targetCategory?: string | null;
  onClose: () => void;
  onCreate: (request: CreateChatChannelRequest) => Promise<void>;
  onUpdate: (channelId: string, request: UpdateChatChannelRequest) => Promise<void>;
}

const DEFAULT_CATEGORY: Record<ChatChannelType, string> = {
  TEXT: 'TEXT CHANNELS',
  VOICE: 'VOICE CHANNELS',
  FORUM: 'FORUMS',
};

export function ChatChannelModal({
  open,
  mode,
  initialChannel = null,
  parentChannel = null,
  targetCategory = null,
  onClose,
  onCreate,
  onUpdate,
}: ChatChannelModalProps) {
  const [channelType, setChannelType] = useState<ChatChannelType>('TEXT');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initialChannel) {
      setChannelType(initialChannel.channelType);
      setName(initialChannel.name);
      setDescription(initialChannel.description || '');
    } else {
      setChannelType('TEXT');
      setName('');
      setDescription('');
    }
  }, [open, mode, initialChannel]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return setError('Channel name is required.');
    if (trimmedName.length > 80) return setError('Channel name must be 80 characters or fewer.');

    setError(null);
    setPending(true);
    try {
      const trimmedDesc = description.trim();
      if (mode === 'edit' && initialChannel) {
        await onUpdate(initialChannel.id, {
          name: trimmedName,
          description: trimmedDesc,
        });
      } else {
        const resolvedCategory =
          targetCategory?.trim() ||
          parentChannel?.category ||
          trimmedName.toUpperCase().slice(0, 64) ||
          DEFAULT_CATEGORY[channelType];
        await onCreate({
          name: trimmedName,
          channelType,
          category: resolvedCategory,
          description: trimmedDesc,
          parentChannelId: parentChannel?.id ?? null,
        });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save channel.'));
    } finally {
      setPending(false);
    }
  }

  const isSubChannel = Boolean(parentChannel || targetCategory);

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'Channel Settings' : isSubChannel ? 'Create Sub-channel' : 'Create Channel'}
      subtitle={
        mode === 'edit'
          ? initialChannel?.name
          : targetCategory
            ? `Inside ${targetCategory}`
            : parentChannel
              ? `Inside #${parentChannel.name}`
              : 'Create a new channel group'
      }
      onClose={onClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === 'create' && (
          <div>
            <p className="mb-1.5 text-xs text-[#BDBDBD]">Channel Type</p>
            <ChatChannelTypeOptions value={channelType} onChange={setChannelType} />
          </div>
        )}

        <TextField
          label="Channel Name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder={channelType === 'VOICE' ? 'e.g. standup-room' : channelType === 'FORUM' ? 'e.g. product-feedback' : 'e.g. announcements'}
          autoFocus
        />
        <TextField
          label="Description"
          value={description}
          maxLength={255}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional channel topic"
        />

        {error && <p role="alert" className="text-xs text-[#EF4444]">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-[#30363D] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
            {pending ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Channel'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
