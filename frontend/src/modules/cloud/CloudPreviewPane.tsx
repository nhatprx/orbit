import { X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { CloudFileItem } from '../../types/cloud.types';

interface CloudPreviewPaneProps {
  file: CloudFileItem | null;
  onClose: () => void;
}

export function CloudPreviewPane({ file, onClose }: CloudPreviewPaneProps) {
  if (!file) return null;

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22] xl:flex">
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Inspector
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#8A8A8A] hover:text-[#E6EDF3]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <h3 className="break-words text-base font-semibold text-[#E6EDF3]">
            {file.name}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="green">{file.kind}</Badge>
            <Badge tone="neutral">{file.size}</Badge>
          </div>
        </div>

        <div className="space-y-2 border-y border-[#30363D] py-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[#8A8A8A]">Owner</span>
            <span className="font-mono text-[#E6EDF3]">{file.owner}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8A8A]">Modified</span>
            <span className="font-mono text-[#E6EDF3]">{file.updatedAt}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8A8A]">
            Preview
          </p>
          <div className="whitespace-pre-wrap border border-[#30363D] bg-[#0D1117] p-3.5 font-mono text-xs leading-relaxed text-[#E6EDF3]">
            {file.preview}
          </div>
        </div>
      </div>
    </aside>
  );
}
