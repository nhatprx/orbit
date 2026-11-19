interface ContributionGridProps {
  weeks: number[][];
}

const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-[#21262D] border-[#30363D]',
  1: 'bg-[#052E16] border-[#14532D]',
  2: 'bg-[#15803D] border-[#16A34A]',
  3: 'bg-[#22C55E] border-[#22C55E]',
  4: 'bg-[#4ADE80] border-[#4ADE80]',
};

export function ContributionGrid({ weeks }: ContributionGridProps) {
  const total = weeks.flat().reduce((sum, level) => sum + level * 3, 0);

  return (
    <section className="border border-[#30363D] bg-[#161B22] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Activity Overview
        </h2>
        <span className="font-mono text-xs text-[#22C55E]">
          {total} contributions in recent weeks
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((level, dIdx) => (
                <div
                  key={`${wIdx}-${dIdx}`}
                  title={`Level ${level}`}
                  className={`h-3.5 w-3.5 border ${LEVEL_CLASSES[level] ?? LEVEL_CLASSES[0]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-[#666666]">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`inline-block h-2.5 w-2.5 border ${LEVEL_CLASSES[level]}`}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
