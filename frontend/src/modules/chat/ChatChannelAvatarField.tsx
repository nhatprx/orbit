import { useRef, type ChangeEvent } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface ChatChannelAvatarFieldProps {
  previewUrl: string;
  channelName: string;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}

export function ChatChannelAvatarField({
  previewUrl,
  channelName,
  onSelectFile,
  onRemove,
}: ChatChannelAvatarFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onSelectFile(file);
  }

  return (
    <div>
      <p className="mb-1.5 text-xs text-[#BDBDBD]">Group Avatar</p>
      <div className="flex items-center gap-3 border border-[#30363D] bg-[#0D1117] p-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={channelName || 'Group avatar'}
            className="h-14 w-14 shrink-0 border border-[#30363D] object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#7D8590]">
            <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="Upload group avatar"
            onChange={handleChange}
            className="hidden"
          />
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            {previewUrl ? 'Change Avatar' : 'Upload Avatar'}
          </Button>
          {previewUrl && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-8 items-center gap-1 border border-[#30363D] bg-[#161B22] px-2.5 text-xs text-[#8B949E] hover:border-[#EF4444] hover:text-[#EF4444]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
