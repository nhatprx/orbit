import { useEffect, useState, type FormEvent } from 'react';
import { Hash, Volume2 } from 'lucide-react';
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

interface ChatChannelModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialChannel?: ChatChannelDto | null;
  onClose: () => void;
  onCreate: (request: CreateChatChannelRequest) => Promise<void>;
  onUpdate: (channelId: string, request: UpdateChatChannelRequest) => Promise<void>;
}

const DEFAULT_CATEGORY: Record<ChatChannelType, string> = {
  TEXT: 'TEXT CHANNELS',
  VOICE: 'VOICE CHANNELS',
};

export function ChatChannelModal({
  open,
  mode,
  initialChannel = null,
  onClose,
  onCreate,
  onUpdate,
}: ChatChannelModalProps) {
  const [channelType, setChannelType] = useState<ChatChannelType>('TEXT');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY.TEXT);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initialChannel) {
      setChannelType(initialChannel.channelType);
      setName(initialChannel.name);
      setCategory(initialChannel.category || DEFAULT_CATEGORY[initialChannel.channelType]);
      setDescription(initialChannel.description || '');
    } else {
      setChannelType('TEXT');
      setName('');
      setCategory(DEFAULT_CATEGORY.TEXT);
      setDescription('');
    }
  }, [open, mode, initialChannel]);

  function handleTypeSelect(nextType: ChatChannelType) {
    setChannelType(nextType);
    const trimmedCat = category.trim().toUpperCase();
    if (!trimmedCat || trimmedCat === DEFAULT_CATEGORY.TEXT || trimmedCat === DEFAULT_CATEGORY.VOICE) {
      setCategory(DEFAULT_CATEGORY[nextType]);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return setError('Channel name is required.');
    if (trimmedName.length > 80) return setError('Channel name must be 80 characters or fewer.');

    setError(null);
    setPending(true);
    try {
      const trimmedCategory = category.trim() || DEFAULT_CATEGORY[channelType];
      const trimmedDesc = description.trim();
      if (mode === 'edit' && initialChannel) {
        await onUpdate(initialChannel.id, { name: trimmedName, category: trimmedCategory, description: trimmedDesc });
      } else {
        await onCreate({ name: trimmedName, channelType, category: trimmedCategory, description: trimmedDesc });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save channel.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'Edit Channel' : 'Create Channel'}
      subtitle={mode === 'edit' ? initialChannel?.name : 'Add a text or voice channel'}
      onClose={onClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === 'create' && (
          <div>
            <p className="mb-1.5 text-xs text-[#BDBDBD]">Channel Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(['TEXT', 'VOICE'] as const).map((type) => {
                const active = channelType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleTypeSelect(type)}
                    className={`flex items-center gap-2 border px-3 py-2.5 text-left text-xs transition-colors ${
                      active
                        ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                        : 'border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#3B434B]'
                    }`}
                  >
                    {type === 'TEXT' ? (
                      <Hash className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    ) : (
                      <Volume2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    )}
                    <div>
                      <p className="font-semibold">{type === 'TEXT' ? 'Text Channel' : 'Voice Channel'}</p>
                      <p className="font-mono text-[10px] text-[#8A8A8A]">
                        {type === 'TEXT' ? 'Messages, replies, links' : 'Audio, video, screen share'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <TextField
          label="Channel Name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder={channelType === 'VOICE' ? 'e.g. standup-room' : 'e.g. announcements'}
          autoFocus
        />
        <TextField
          label="Category"
          value={category}
          maxLength={64}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={DEFAULT_CATEGORY[channelType]}
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
