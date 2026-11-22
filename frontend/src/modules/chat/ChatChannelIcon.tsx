import { Hash, MessageSquareText, Volume2 } from 'lucide-react';
import type { ChatChannelType } from '../../types/workspace.types';

export function ChatChannelIcon({ type, className = 'h-3.5 w-3.5' }: { type: ChatChannelType; className?: string }) {
  const Icon = type === 'VOICE' ? Volume2 : type === 'FORUM' ? MessageSquareText : Hash;
  return <Icon className={className} strokeWidth={1.5} aria-hidden="true" />;
}
