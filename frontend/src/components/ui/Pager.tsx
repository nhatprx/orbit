import { useEffect, useState, type FormEvent } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

interface PagerProps {
  /** Zero-based current page. */
  page: number;
  totalPages: number;
  totalElements: number;
  /** Plural noun for the total, for example "users". */
  noun: string;
  onPage: (page: number) => void;
  size?: number;
  sizeOptions?: readonly number[];
  onSizeChange?: (size: number) => void;
}

function visiblePages(current: number, total: number): number[] {
  if (total <= 1) return [0];
  const windowSize = 5;
  const start = Math.max(0, Math.min(current - 2, total - windowSize));
  const end = Math.min(total, start + windowSize);
  const pages: number[] = [];
  for (let i = start; i < end; i += 1) pages.push(i);
  return pages;
}

export function Pager({
  page,
  totalPages,
  totalElements,
  noun,
  onPage,
  size,
  sizeOptions,
  onSizeChange,
}: PagerProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const pages = visiblePages(page, safeTotalPages);
  const [jumpInput, setJumpInput] = useState(String(page + 1));

  useEffect(() => {
    setJumpInput(String(page + 1));
  }, [page]);

  function handleJump(event: FormEvent) {
    event.preventDefault();
    const parsed = Number.parseInt(jumpInput.trim(), 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(1, Math.min(safeTotalPages, parsed));
    setJumpInput(String(clamped));
    if (clamped - 1 !== page) onPage(clamped - 1);
  }

  return (
    <div
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border border-[#30363D] bg-[#161B22] px-3 py-2 font-mono text-xs text-[#8B949E]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {totalElements} {noun}
        </span>
        <span className="text-[#7D8590]">
          Page {page + 1} of {safeTotalPages}
        </span>
        {size !== undefined && sizeOptions && onSizeChange && (
          <label className="flex items-center gap-1.5 text-[#8B949E]">
            <span>Rows:</span>
            <select
              aria-label="Rows per page"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
            >
              {sizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          aria-label="First page"
          title="First page"
          disabled={page <= 0}
          onClick={() => onPage(0)}
          className="px-2 py-1 text-xs"
        >
          <ChevronsLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
          className="px-2.5 py-1 text-xs"
        >
          Previous
        </Button>

        {pages.map((p) => {
          const active = p === page;
          return (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p + 1}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onPage(p)}
              className={`inline-flex h-7 min-w-[28px] items-center justify-center border px-2 font-mono text-xs transition-colors ${
                active
                  ? 'border-[#22C55E] bg-[#052E16] font-semibold text-[#22C55E]'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]'
              }`}
            >
              {p + 1}
            </button>
          );
        })}

        <Button
          type="button"
          variant="secondary"
          disabled={page + 1 >= safeTotalPages}
          onClick={() => onPage(page + 1)}
          className="px-2.5 py-1 text-xs"
        >
          Next
        </Button>

        <Button
          type="button"
          variant="secondary"
          aria-label="Last page"
          title="Last page"
          disabled={page + 1 >= safeTotalPages}
          onClick={() => onPage(safeTotalPages - 1)}
          className="px-2 py-1 text-xs"
        >
          <ChevronsRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>

        <form noValidate onSubmit={handleJump} className="ml-1.5 flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Go to page"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value.replace(/\D/g, ''))}
            className="h-7 w-12 border border-[#30363D] bg-[#0D1117] px-1.5 text-center font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
          />
          <Button type="submit" variant="secondary" className="h-7 px-2 py-0.5 text-xs">
            Go
          </Button>
        </form>
      </div>
    </div>
  );
}
