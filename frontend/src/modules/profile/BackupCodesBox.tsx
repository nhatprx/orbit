import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface BackupCodesBoxProps {
  codes: string[];
  onDismiss: () => void;
}

export function BackupCodesBox({ codes, onDismiss }: BackupCodesBoxProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3 border border-[#22C55E] bg-[#052E16] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#22C55E]">Save your recovery backup codes</p>
          <p className="text-xs text-[#A3A3A3]">
            Each code can be used once if you lose access to your authenticator app. These are shown only once.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            {copied ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy all'}
          </Button>
          <Button type="button" variant="ghost" onClick={onDismiss}>
            Done
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {codes.map((code) => (
          <code
            key={code}
            className="border border-[#30363D] bg-[#0D1117] px-2.5 py-1.5 text-center font-mono text-xs text-[#E6EDF3]"
          >
            {code}
          </code>
        ))}
      </div>
    </div>
  );
}
