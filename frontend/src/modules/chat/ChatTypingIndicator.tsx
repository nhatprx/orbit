interface ChatTypingIndicatorProps {
  names: string[];
}

export function ChatTypingIndicator({ names }: ChatTypingIndicatorProps) {
  if (names.length === 0) return null;
  const label = names.length === 1 ? `${names[0]} is typing` : names.length === 2
    ? `${names[0]} and ${names[1]} are typing` : `${names[0]} and ${names.length - 1} others are typing`;
  return <p role="status" aria-live="polite" className="border-t border-[#21262D] bg-[#0D1117] px-5 py-1.5 text-[11px] text-[#8A8A8A]">
    <span className="mr-2 inline-flex gap-0.5 align-middle">{[0, 1, 2].map((dot) => <span key={dot} className="h-1 w-1 animate-pulse bg-[#22C55E]" />)}</span>
    {label}
  </p>;
}
