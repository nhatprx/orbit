import { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { fetchLinkPreview, type LinkPreviewDto } from './chatLinkUtils';

interface ChatLinkPreviewCardProps {
  url: string;
  mine: boolean;
}

function fallbackHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ChatLinkPreviewCard({ url, mine }: ChatLinkPreviewCardProps) {
  const [meta, setMeta] = useState<LinkPreviewDto | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setImgFailed(false);
    void fetchLinkPreview(url).then((result) => {
      if (active) setMeta(result);
    });
    return () => { active = false; };
  }, [url]);

  const host = meta?.host || fallbackHost(url);
  const title = meta?.title || host;
  const description = meta?.description;
  const imageUrl = !imgFailed ? meta?.imageUrl : null;
  const siteName = meta?.siteName || host;

  const surfaceClass = mine
    ? 'border-[#1E5631] bg-[#051C0F] hover:border-[#22C55E]'
    : 'border-[#30363D] bg-[#0D1117] hover:border-[#22C55E]';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 block w-full min-w-[260px] overflow-hidden border transition-colors ${surfaceClass}`}
    >
      {imageUrl && (
        <div className="max-h-52 w-full overflow-hidden border-b border-[#21262D] bg-[#161B22]">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="block max-h-52 w-full object-cover"
          />
        </div>
      )}
      <div className="space-y-1 p-2.5">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-[#E6EDF3]">{title}</p>
        {description && (
          <p className="line-clamp-2 text-[11px] leading-snug text-[#8B949E]">{description}</p>
        )}
        <div className="flex items-center justify-between gap-2 pt-0.5 font-mono text-[10px] text-[#4ADE80]">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <Globe className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{siteName}</span>
          </span>
          <ExternalLink className="h-3 w-3 shrink-0 text-[#7D8590]" strokeWidth={1.5} />
        </div>
      </div>
    </a>
  );
}
