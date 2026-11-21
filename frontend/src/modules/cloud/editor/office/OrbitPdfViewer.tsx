import { useEffect, useState } from 'react';
import { AlertCircle, Download, FileText } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../../types/cloud.types';

interface OrbitPdfViewerProps {
  node: CloudNodeDto;
  api: CloudFilesApi;
  onDownload?: (node: CloudNodeDto) => void;
}

export function OrbitPdfViewer({ node, api, onDownload }: OrbitPdfViewerProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDownloadUrl(null);

    api
      .getDownloadUrl(node.id)
      .then((res) => {
        if (!active) return;
        setDownloadUrl(res.url);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load PDF preview stream.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [node.id, api]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0D1117] font-mono text-xs text-[#8B949E]">
        Loading PDF viewer...
      </div>
    );
  }

  if (error || !downloadUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0D1117] p-6">
        <div className="w-full max-w-md border border-[#30363D] bg-[#161B22] p-6">
          <div className="flex items-center gap-2.5 text-[#EF4444]">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-[#E6EDF3]">PDF Preview Unavailable</h3>
          </div>
          <p className="mt-2 text-xs text-[#8B949E]">{error ?? 'Could not resolve inline PDF URL.'}</p>
          {onDownload && (
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="primary" onClick={() => onDownload(node)}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                Download PDF
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4 py-1.5 font-mono text-[11px] text-[#8B949E]">
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          Orbit Inline PDF Reader
        </span>
        <span>Read-Only</span>
      </div>
      <div className="min-h-0 flex-1 bg-[#0D1117]">
        <iframe
          title={node.name}
          src={downloadUrl}
          className="h-full w-full border-0 bg-[#0D1117]"
        />
      </div>
    </div>
  );
}
