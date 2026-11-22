import { useState, type FormEvent } from 'react';
import { Check, Flag, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { ChatChannelDto } from '../../types/workspace.types';

const REPORT_REASONS = [
  'Spam or unwanted content',
  'Harassment or abusive behavior',
  'Inappropriate media or links',
  'Security or privacy concern',
  'Other',
] as const;

interface ChatInfoDangerActionsProps {
  channel: ChatChannelDto;
  canManageChannels: boolean;
  onDeleteChannel?: (channel: ChatChannelDto) => void;
}

export function ChatInfoDangerActions({
  channel,
  canManageChannels,
  onDeleteChannel,
}: ChatInfoDangerActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canDelete = canManageChannels && Boolean(onDeleteChannel);
  const deleteTitle = !canManageChannels
    ? 'Requires channel management permission'
    : `Delete #${channel.name}`;

  function handleOpenReport() {
    setReason(REPORT_REASONS[0]);
    setDetails('');
    setSubmitted(false);
    setReportOpen(true);
  }

  function handleSubmitReport(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <div className="shrink-0 space-y-1.5 border-t border-[#21262D] bg-[#0D1117] px-4 py-3">
        <button
          type="button"
          disabled={!canDelete}
          title={deleteTitle}
          onClick={() => onDeleteChannel?.(channel)}
          className="flex w-full items-center gap-2 border border-[#30363D] bg-[#161B22] px-3 py-2 text-left text-xs font-medium text-[#EF4444] transition-colors hover:border-[#EF4444] hover:bg-[#EF4444]/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>Delete conversation</span>
        </button>

        <button
          type="button"
          onClick={handleOpenReport}
          className="flex w-full items-center gap-2 border border-[#30363D] bg-[#161B22] px-3 py-2 text-left text-xs font-medium text-[#BDBDBD] transition-colors hover:border-[#EF4444] hover:text-[#EF4444]"
        >
          <Flag className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>Report</span>
        </button>
      </div>

      <Modal
        open={reportOpen}
        title="Report Conversation"
        subtitle={`#${channel.name}`}
        onClose={() => setReportOpen(false)}
      >
        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 border border-[#22C55E] bg-[#052E16] p-3 text-xs text-[#4ADE80]">
              <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Report submitted for #{channel.name}. Thank you for helping keep Orbit safe.</span>
            </div>
            <div className="flex justify-end border-t border-[#30363D] pt-3">
              <Button type="button" variant="primary" onClick={() => setReportOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitReport} className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs text-[#BDBDBD]">Reason</p>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 border px-2.5 py-2 text-xs transition-colors ${
                      reason === option
                        ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                        : 'border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#3B434B]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={option}
                      checked={reason === option}
                      onChange={() => setReason(option)}
                      className="accent-[#22C55E]"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="chat-report-details" className="mb-1.5 block text-xs text-[#BDBDBD]">
                Additional details (optional)
              </label>
              <textarea
                id="chat-report-details"
                rows={3}
                maxLength={500}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what happened..."
                className="w-full border border-[#30363D] bg-[#0D1117] p-2.5 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#30363D] pt-3">
              <Button type="button" variant="secondary" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
