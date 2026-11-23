import type { ChatMessageDto } from '../../types/workspace.types';
import { formatDate, formatTime } from '../../utils/format';

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const TIME_BREAK_WINDOW_MS = 60 * 60 * 1000;

export interface GroupedChatItem {
  message: ChatMessageDto;
  dateLabel: string | null;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

function dayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatDayDivider(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const targetKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (targetKey === todayKey) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  if (targetKey === yesterdayKey) return 'Yesterday';
  return formatDate(iso);
}

function isSameGroup(prev: ChatMessageDto, curr: ChatMessageDto): boolean {
  if (prev.senderId !== curr.senderId) return false;
  if (dayKey(prev.createdAt) !== dayKey(curr.createdAt)) return false;
  const prevMs = new Date(prev.createdAt).getTime();
  const currMs = new Date(curr.createdAt).getTime();
  if (Number.isNaN(prevMs) || Number.isNaN(currMs)) return false;
  return currMs - prevMs >= 0 && currMs - prevMs <= GROUP_WINDOW_MS;
}

export function groupChatMessages(messages: ChatMessageDto[], now: Date = new Date()): GroupedChatItem[] {
  return messages.map((message, index) => {
    const prev = index > 0 ? messages[index - 1] : undefined;
    const next = index < messages.length - 1 ? messages[index + 1] : undefined;
    const dayChanged = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt);
    const prevMs = prev ? new Date(prev.createdAt).getTime() : Number.NaN;
    const currMs = new Date(message.createdAt).getTime();
    const longGap = !dayChanged && !Number.isNaN(prevMs) && !Number.isNaN(currMs) && currMs - prevMs >= TIME_BREAK_WINDOW_MS;
    const sameAsPrev = prev ? isSameGroup(prev, message) : false;
    const sameAsNext = next ? isSameGroup(message, next) : false;
    const dateLabel = dayChanged
      ? formatDayDivider(message.createdAt, now)
      : longGap
        ? `${formatDayDivider(message.createdAt, now)}, ${formatTime(message.createdAt)}`
        : null;
    return {
      message,
      dateLabel,
      isFirstInGroup: !sameAsPrev,
      isLastInGroup: !sameAsNext,
    };
  });
}
