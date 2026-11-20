import { AlertCircle, Check, Upload, X } from 'lucide-react';
import type { UploadTaskItem } from '../../types/cloud.types';
import { formatBytes } from './cloudFormat';

interface CloudUploadQueueProps {
  tasks: UploadTaskItem[];
  onCancel: (localId: string) => void;
  onDismiss: (localId: string) => void;
  onClearFinished: () => void;
}

export function CloudUploadQueue({
  tasks,
  onCancel,
  onDismiss,
  onClearFinished,
}: CloudUploadQueueProps) {
  if (tasks.length === 0) return null;

  const activeCount = tasks.filter(
    (t) => t.status === 'queued' || t.status === 'uploading' || t.status === 'completing'
  ).length;
  const hasFinished = tasks.length > activeCount;

  return (
    <section
      aria-label="Upload queue"
      className="border-t border-[#30363D] bg-[#161B22]"
    >
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#E6EDF3]">
          <Upload className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span>Uploads ({activeCount > 0 ? `${activeCount} active` : `${tasks.length} finished`})</span>
        </div>
        {hasFinished && (
          <button
            type="button"
            onClick={onClearFinished}
            className="font-mono text-[11px] text-[#8B949E] hover:text-[#22C55E]"
          >
            Clear finished
          </button>
        )}
      </div>

      <div className="max-h-40 divide-y divide-[#21262D] overflow-y-auto">
        {tasks.map((task) => {
          const isActive =
            task.status === 'queued' || task.status === 'uploading' || task.status === 'completing';
          return (
            <div key={task.localId} className="flex items-center gap-3 px-4 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-[#E6EDF3]">{task.fileName}</span>
                  <span className="shrink-0 font-mono text-[11px] text-[#8B949E]">
                    {task.status === 'done' && (
                      <span className="inline-flex items-center gap-1 text-[#22C55E]">
                        <Check className="h-3 w-3" strokeWidth={1.5} />
                        Done
                      </span>
                    )}
                    {task.status === 'cancelled' && 'Cancelled'}
                    {task.status === 'completing' && 'Finalizing...'}
                    {task.status === 'uploading' &&
                      `${formatBytes(task.uploadedBytes)} / ${formatBytes(task.sizeBytes)} (${task.progress}%)`}
                    {task.status === 'queued' && 'Queued'}
                    {task.status === 'error' && (
                      <span className="inline-flex items-center gap-1 text-[#EF4444]">
                        <AlertCircle className="h-3 w-3" strokeWidth={1.5} />
                        Failed
                      </span>
                    )}
                  </span>
                </div>

                {isActive && (
                  <div className="mt-1.5 h-1.5 w-full border border-[#30363D] bg-[#0D1117]">
                    <div className="h-full bg-[#22C55E] transition-all" style={{ width: `${task.progress}%` }} />
                  </div>
                )}

                {task.error && <p className="mt-1 text-[11px] text-[#EF4444]">{task.error}</p>}
              </div>

              {isActive ? (
                <button
                  type="button"
                  onClick={() => onCancel(task.localId)}
                  className="border border-[#30363D] bg-[#0D1117] px-2 py-1 font-mono text-[10px] uppercase text-[#8B949E] hover:border-[#EF4444] hover:text-[#EF4444]"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Dismiss ${task.fileName}`}
                  onClick={() => onDismiss(task.localId)}
                  className="text-[#7D8590] hover:text-[#E6EDF3]"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
