import { Hash, MessageSquareText, Volume2 } from 'lucide-react';
import type { ChatChannelType } from '../../types/workspace.types';

interface ChatChannelTypeOptionsProps {
  value: ChatChannelType;
  onChange: (type: ChatChannelType) => void;
}

const OPTIONS: { type: ChatChannelType; label: string; detail: string }[] = [
  { type: 'TEXT', label: 'Text', detail: 'Messages, links, and replies' },
  { type: 'VOICE', label: 'Voice', detail: 'Audio, video, and screen share' },
  { type: 'FORUM', label: 'Forum', detail: 'Organized topics and discussion' },
];

function TypeIcon({ type }: { type: ChatChannelType }) {
  if (type === 'VOICE') return <Volume2 className="h-4 w-4" strokeWidth={1.5} />;
  if (type === 'FORUM') return <MessageSquareText className="h-4 w-4" strokeWidth={1.5} />;
  return <Hash className="h-4 w-4" strokeWidth={1.5} />;
}

export function ChatChannelTypeOptions({ value, onChange }: ChatChannelTypeOptionsProps) {
  return <div className="grid grid-cols-3 gap-2">
    {OPTIONS.map(({ type, label, detail }) => (
      <button key={type} type="button" aria-pressed={value === type} onClick={() => onChange(type)}
        className={`flex min-h-20 items-start gap-2 border px-2.5 py-2 text-left transition-colors ${value === type ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#3B434B]'}`}>
        <TypeIcon type={type} />
        <span><span className="block text-xs font-semibold">{label}</span><span className="mt-1 block text-[10px] text-[#8A8A8A]">{detail}</span></span>
      </button>
    ))}
  </div>;
}
