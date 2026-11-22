import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FileText, Globe } from 'lucide-react';
import { formatDate } from '../../utils/format';
import type { PreviewImageItem } from './ChatImageLightbox';
import type { SharedLinkItem, SharedMediaItem } from './chatInfoExtractors';

interface ChatInfoMediaSectionsProps {
  images: SharedMediaItem[];
  files: SharedMediaItem[];
  links: SharedLinkItem[];
  onPreviewImage?: (image: PreviewImageItem) => void;
}

export function ChatInfoMediaSections({
  images,
  files,
  links,
  onPreviewImage,
}: ChatInfoMediaSectionsProps) {
  const [photosOpen, setPhotosOpen] = useState(true);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [filesOpen, setFilesOpen] = useState(true);
  const [linksOpen, setLinksOpen] = useState(true);

  const visibleImages = showAllPhotos ? images : images.slice(0, 8);

  return (
    <>
      <section className="border-b border-[#21262D] px-4 py-3">
        <button
          type="button"
          onClick={() => setPhotosOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#E6EDF3]"
        >
          <span>Photos &amp; Media ({images.length})</span>
          {photosOpen ? <ChevronDown className="h-3.5 w-3.5 text-[#8B949E]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#8B949E]" />}
        </button>
        {photosOpen && (
          <div className="mt-2.5">
            {images.length === 0 ? (
              <p className="py-2 text-center text-[11px] text-[#7D8590]">
                No photos shared in this channel yet.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-1.5">
                  {visibleImages.map((img) =>
                    onPreviewImage ? (
                      <button
                        key={img.id}
                        type="button"
                        title={img.name}
                        aria-label={`Preview image: ${img.name}`}
                        onClick={() => onPreviewImage({ url: img.url, name: img.name })}
                        className="block aspect-square cursor-zoom-in overflow-hidden border border-[#30363D] bg-[#0D1117] hover:border-[#22C55E]"
                      >
                        <img src={img.url} alt={img.name} loading="lazy" className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <a
                        key={img.id}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={img.name}
                        className="block aspect-square overflow-hidden border border-[#30363D] bg-[#0D1117] hover:border-[#22C55E]"
                      >
                        <img src={img.url} alt={img.name} loading="lazy" className="h-full w-full object-cover" />
                      </a>
                    )
                  )}
                </div>
                {images.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPhotos((v) => !v)}
                    className="mt-2 w-full border border-[#30363D] bg-[#161B22] py-1.5 text-center text-xs font-medium text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#4ADE80]"
                  >
                    {showAllPhotos ? 'Show less' : `View all (${images.length})`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="border-b border-[#21262D] px-4 py-3">
        <button
          type="button"
          onClick={() => setFilesOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#E6EDF3]"
        >
          <span>Files ({files.length})</span>
          {filesOpen ? <ChevronDown className="h-3.5 w-3.5 text-[#8B949E]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#8B949E]" />}
        </button>
        {filesOpen && (
          <div className="mt-2 space-y-1.5">
            {files.length === 0 ? (
              <p className="py-2 text-center text-[11px] text-[#7D8590]">
                No files shared in this conversation yet.
              </p>
            ) : (
              files.slice(0, 10).map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-[#21262D] bg-[#161B22] px-2.5 py-1.5 text-xs hover:border-[#22C55E]"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#E6EDF3]">
                    {file.name}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-[#7D8590]" strokeWidth={1.5} />
                </a>
              ))
            )}
          </div>
        )}
      </section>

      <section className="px-4 py-3">
        <button
          type="button"
          onClick={() => setLinksOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#E6EDF3]"
        >
          <span>Links ({links.length})</span>
          {linksOpen ? <ChevronDown className="h-3.5 w-3.5 text-[#8B949E]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#8B949E]" />}
        </button>
        {linksOpen && (
          <div className="mt-2 space-y-1.5">
            {links.length === 0 ? (
              <p className="py-2 text-center text-[11px] text-[#7D8590]">
                No links shared in this conversation yet.
              </p>
            ) : (
              links.slice(0, 10).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 border border-[#21262D] bg-[#161B22] px-2.5 py-2 text-xs hover:border-[#22C55E]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#1E5631] bg-[#052E16] text-[#22C55E]">
                    <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#E6EDF3]">{link.host}</span>
                    <span className="block truncate font-mono text-[10px] text-[#4ADE80]">{link.url}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[#7D8590]">
                    {formatDate(link.createdAt)}
                  </span>
                </a>
              ))
            )}
          </div>
        )}
      </section>
    </>
  );
}
