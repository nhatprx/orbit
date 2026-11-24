import { Fragment } from 'react';
import { tokenizeTextLinks } from './chatLinkUtils';

const MENTION_SPLIT = /(@[A-Za-z0-9_.-]{1,64})/g;
const URL_BREAK_SPLIT = /([/?&#_-])/g;

function renderMentions(text: string, keyPrefix: string) {
  return text.split(MENTION_SPLIT).map((part, idx) => {
    if (!part.startsWith('@') || part.length <= 1) return part;
    const lower = part.toLowerCase();
    const isSpecial = lower === '@all' || lower === '@ai';
    return (
      <span
        key={`${keyPrefix}-${idx}`}
        className={isSpecial ? 'border border-[#1E5631] bg-[#052E16] px-1 font-semibold text-[#4ADE80]' : 'font-medium text-[#4ADE80]'}
      >
        {part}
      </span>
    );
  });
}

function renderBreakableUrl(label: string) {
  const segments = label.split(URL_BREAK_SPLIT);
  return segments.map((seg, i) => (
    <Fragment key={i}>
      {seg}
      {i % 2 === 1 && <wbr />}
    </Fragment>
  ));
}

export function ChatMessageText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13.5px] leading-[1.45] text-[#E6EDF3]">
      {tokenizeTextLinks(text).map((token, idx) =>
        token.type === 'link' ? (
          <a
            key={`u-${idx}`}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="break-words [overflow-wrap:anywhere] text-[#4ADE80] underline decoration-[#22C55E]/60 underline-offset-2 hover:text-[#86EFAC]"
          >
            {renderBreakableUrl(token.label)}
          </a>
        ) : (
          <span key={`t-${idx}`}>{renderMentions(token.value, `m-${idx}`)}</span>
        )
      )}
    </p>
  );
}
