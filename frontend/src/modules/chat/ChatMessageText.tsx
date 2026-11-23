import { tokenizeTextLinks } from './chatLinkUtils';

const MENTION_SPLIT = /(@[A-Za-z0-9_.-]{1,64})/g;

function renderMentions(text: string, keyPrefix: string) {
  return text.split(MENTION_SPLIT).map((part, idx) => {
    if (!part.startsWith('@') || part.length <= 1) return part;
    const isAll = part.toLowerCase() === '@all';
    return (
      <span
        key={`${keyPrefix}-${idx}`}
        className={isAll ? 'border border-[#1E5631] bg-[#052E16] px-1 font-semibold text-[#4ADE80]' : 'font-medium text-[#4ADE80]'}
      >
        {part}
      </span>
    );
  });
}

export function ChatMessageText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-[#E6EDF3]">
      {tokenizeTextLinks(text).map((token, idx) =>
        token.type === 'link' ? (
          <a
            key={`u-${idx}`}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="break-all text-[#4ADE80] underline decoration-[#22C55E]/60 underline-offset-2 hover:text-[#86EFAC]"
          >
            {token.label}
          </a>
        ) : (
          <span key={`t-${idx}`}>{renderMentions(token.value, `m-${idx}`)}</span>
        )
      )}
    </p>
  );
}
