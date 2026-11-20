import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, FileCode2, FileSpreadsheet, FileText, Presentation } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import type { CloudNodeDto, DocumentTemplateType } from '../../../types/cloud.types';

interface NewDocumentModalProps {
  open: boolean;
  parentId: string | null;
  api: CloudFilesApi;
  onClose: () => void;
  onCreated: (node: CloudNodeDto) => void;
}

interface TemplateOption {
  type: DocumentTemplateType;
  label: string;
  ext: string;
  desc: string;
}

const TEMPLATES: TemplateOption[] = [
  { type: 'MD', label: 'Markdown', ext: '.md', desc: 'Notes, specs & live preview' },
  { type: 'TXT', label: 'Plain Text', ext: '.txt', desc: 'Unformatted text document' },
  { type: 'DOCX', label: 'Word Document', ext: '.docx', desc: 'ONLYOFFICE rich document' },
  { type: 'XLSX', label: 'Spreadsheet', ext: '.xlsx', desc: 'ONLYOFFICE workbook' },
  { type: 'PPTX', label: 'Presentation', ext: '.pptx', desc: 'ONLYOFFICE slide deck' },
];

function TemplateIcon({ type }: { type: DocumentTemplateType }) {
  if (type === 'MD') return <FileCode2 className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
  if (type === 'XLSX') return <FileSpreadsheet className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
  if (type === 'PPTX') return <Presentation className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
  return <FileText className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
}

export function NewDocumentModal({
  open,
  parentId,
  api,
  onClose,
  onCreated,
}: NewDocumentModalProps) {
  const [templateType, setTemplateType] = useState<DocumentTemplateType>('MD');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTemplateType('MD');
    setName('');
    setError(null);
  }, [open]);

  const activeTemplate =
    TEMPLATES.find((t) => t.type === templateType) ??
    ({ type: 'MD', label: 'Markdown', ext: '.md', desc: '' } as const);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createDocument({ parentId, name: trimmed, templateType });
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create document.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="New Document" subtitle="Choose a document format and filename" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div role="radiogroup" aria-label="Document type" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TEMPLATES.map((tpl) => {
            const selected = tpl.type === templateType;
            return (
              <button
                key={tpl.type}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTemplateType(tpl.type)}
                className={`flex items-start gap-2.5 border p-2.5 text-left transition-colors ${
                  selected
                    ? 'border-[#22C55E] bg-[#052E16] text-[#E6EDF3]'
                    : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#3B434B] hover:text-[#E6EDF3]'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  <TemplateIcon type={tpl.type} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E6EDF3]">
                    {tpl.label}
                    <span className="font-mono text-[10px] text-[#22C55E]">{tpl.ext}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[#8B949E]">{tpl.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="cloud-new-doc-name" className="block font-mono text-[11px] uppercase text-[#8B949E]">
            Filename
          </label>
          <input
            id="cloud-new-doc-name"
            type="text"
            autoFocus
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`untitled${activeTemplate.ext}`}
            className="mt-1.5 h-9 w-full border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
          />
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !name.trim()}>
            {submitting ? 'Creating...' : 'Create & Open'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
