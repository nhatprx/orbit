import { CheckCheck } from 'lucide-react';

interface ChatMessageReadReceiptProps {
  seenByNames: string[];
}

export function ChatMessageReadReceipt({ seenByNames }: ChatMessageReadReceiptProps) {
  const label = seenByNames.length > 0 ? `Seen by: ${seenByNames.join(', ')}` : 'Sent';

  return (
    <span className="group/seen relative inline-flex cursor-default items-center" title={label}>
      <CheckCheck className="h-3 w-3 text-[#22C55E]" strokeWidth={1.75} />
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-1.5 w-max max-w-56 border border-[#30363D] bg-[#161B22] px-2 py-1 font-sans text-[10px] text-[#E6EDF3] opacity-0 shadow-lg transition-opacity group-hover/seen:visible group-hover/seen:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
