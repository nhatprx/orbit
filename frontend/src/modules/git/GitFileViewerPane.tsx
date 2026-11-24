import { useEffect, useMemo, useState } from 'react';
import { Check, Code2, Copy, Eye, Pencil, Save, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { GitFileContentDto } from '../../types/git.types';
import { GitCodeViewerCanvas } from './GitCodeViewerCanvas';
import { GitEnvPreview } from './GitEnvPreview';
import { GitMarkdownPreview } from './GitMarkdownPreview';
import { GitMaterialIcon } from './GitMaterialIcon';

interface GitFileViewerPaneProps {
  selectedFile: GitFileContentDto | null;
  openTabs?: GitFileContentDto[];
  fileLoading: boolean;
  canWrite: boolean;
  canDelete: boolean;
  onSelectTab?: (file: GitFileContentDto) => void;
  onCloseTab?: (path: string) => void;
  onSaveInlineFile: (file: GitFileContentDto, content: string, commitMessage: string) => Promise<void>;
  onDeleteFile: (file: GitFileContentDto, commitMessage: string) => Promise<void>;
}

const isMarkdown = (name: string) => /\.(md|mdx|markdown)$/i.test(name);
const isEnvFile = (name: string) => /^(\.env(\..+)?|.+\.env)$/i.test(name);

export function GitFileViewerPane({
  selectedFile, openTabs = [], fileLoading, canWrite, canDelete,
  onSelectTab, onCloseTab, onSaveInlineFile, onDeleteFile,
}: GitFileViewerPaneProps) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('code');
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const previewKind = selectedFile
    ? (isMarkdown(selectedFile.name) ? 'markdown' : isEnvFile(selectedFile.name) ? 'env' : null)
    : null;

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setViewMode(previewKind ? 'preview' : 'code');
    setDraftContent(selectedFile?.content ?? '');
    setCommitMessage(selectedFile ? `Update ${selectedFile.path}` : '');
  }, [selectedFile?.path, selectedFile?.sha, previewKind]);

  const lineCount = useMemo(
    () => (selectedFile ? (editing ? draftContent : selectedFile.content).split('\n').length : 0),
    [draftContent, editing, selectedFile],
  );

  async function handleCopy() {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(editing ? draftContent : selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startInlineEdit() {
    if (!selectedFile) return;
    setDraftContent(selectedFile.content);
    setCommitMessage(`Update ${selectedFile.path}`);
    setConfirmDelete(false);
    setViewMode('code');
    setEditing(true);
  }

  async function handleCommitEdit() {
    if (!selectedFile || !commitMessage.trim()) return;
    setSaving(true);
    try { await onSaveInlineFile(selectedFile, draftContent, commitMessage.trim()); setEditing(false); }
    finally { setSaving(false); }
  }

  async function handleConfirmDelete() {
    if (!selectedFile || !deleteMessage.trim()) return;
    setDeleting(true);
    try { await onDeleteFile(selectedFile, deleteMessage.trim()); setConfirmDelete(false); }
    finally { setDeleting(false); }
  }

  if (!selectedFile && fileLoading) {
    return <div className="flex h-full items-center justify-center border border-[#30363D] bg-[#161B22] p-6 text-xs text-[#8A8A8A] lg:col-span-8 xl:col-span-9">Loading file content...</div>;
  }

  if (!selectedFile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 border border-[#30363D] bg-[#161B22] p-6 text-sm text-[#8A8A8A] lg:col-span-8 xl:col-span-9">
        <span>Select a file from the explorer to inspect.</span>
        <span className="font-mono text-[11px] text-[#6E7681]">Hover any file to prefetch for instant viewing.</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border border-[#30363D] bg-[#161B22] lg:col-span-8 xl:col-span-9">
      {openTabs.length > 0 && (
        <div className="no-scrollbar flex items-center overflow-x-auto border-b border-[#30363D] bg-[#0D1117]">
          {openTabs.map((tab) => {
            const active = tab.path === selectedFile.path;
            return (
              <div key={tab.path} className={`flex shrink-0 items-center gap-1.5 border-r border-[#30363D] px-3 py-1.5 font-mono text-xs ${active ? 'border-t-2 border-t-[#22C55E] bg-[#161B22] text-[#E6EDF3]' : 'text-[#8A8A8A] hover:bg-[#161B22]/60 hover:text-[#E6EDF3]'}`}>
                <button type="button" onClick={() => onSelectTab?.(tab)} className="flex items-center gap-1.5">
                  <GitMaterialIcon name={tab.name} type="file" className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.name}</span>
                </button>
                {onCloseTab && (
                  <button type="button" aria-label={`Close ${tab.name}`} onClick={() => onCloseTab(tab.path)} className="ml-1 text-[#6E7681] hover:text-[#E6EDF3]">
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-4 py-2">
        {fileLoading && <div className="absolute left-0 top-0 h-0.5 w-full animate-pulse bg-[#22C55E]" />}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <GitMaterialIcon name={selectedFile.name} type="file" className="h-4 w-4 shrink-0" />
          <span className="truncate font-mono text-xs font-semibold text-[#E6EDF3]">{selectedFile.path}</span>
          {editing && <span className="border border-[#22C55E] bg-[#052E16] px-1.5 py-0.5 font-mono text-[10px] text-[#4ADE80]">EDITING</span>}
          <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] text-[#22C55E]">{selectedFile.sha.slice(0, 7)}</span>
          <span className="font-mono text-[10px] text-[#6E7681]">{lineCount} lines</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {previewKind && !editing && (
            <div className="inline-flex border border-[#30363D] bg-[#0D1117] font-mono text-[11px]">
              <button type="button" onClick={() => setViewMode('preview')} className={`inline-flex items-center gap-1 px-2 py-1 ${viewMode === 'preview' ? 'bg-[#21262D] text-[#4ADE80]' : 'text-[#8A8A8A] hover:text-[#E6EDF3]'}`}>
                <Eye className="h-3 w-3" strokeWidth={1.5} />Preview
              </button>
              <button type="button" onClick={() => setViewMode('code')} className={`inline-flex items-center gap-1 border-l border-[#30363D] px-2 py-1 ${viewMode === 'code' ? 'bg-[#21262D] text-[#4ADE80]' : 'text-[#8A8A8A] hover:text-[#E6EDF3]'}`}>
                <Code2 className="h-3 w-3" strokeWidth={1.5} />Code
              </button>
            </div>
          )}
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            {copied ? <><Check className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />Copied</> : <><Copy className="h-3.5 w-3.5" strokeWidth={1.5} />Copy</>}
          </Button>
          {canWrite && !editing && (
            <Button type="button" variant="secondary" onClick={startInlineEdit}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />Edit File
            </Button>
          )}
          {canDelete && !editing && (
            <button type="button" onClick={() => { setDeleteMessage(`Delete ${selectedFile.path}`); setConfirmDelete(true); }} className="inline-flex items-center gap-1.5 border border-[#3B434B] bg-[#21262D] px-3 py-1.5 text-[13px] font-medium text-[#EF4444] hover:border-[#EF4444]">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />Delete File
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#22C55E]/60 bg-[#0D1117] px-4 py-2">
          <input aria-label="Inline commit message" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} placeholder="Commit message..." className="flex-1 border border-[#30363D] bg-[#161B22] px-2.5 py-1 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none" />
          <Button type="button" variant="secondary" onClick={() => { setEditing(false); setDraftContent(selectedFile.content); }}>Cancel</Button>
          <Button type="button" variant="primary" disabled={saving || !commitMessage.trim()} onClick={() => void handleCommitEdit()}>
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />{saving ? 'Committing...' : 'Commit to GitHub'}
          </Button>
        </div>
      )}

      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EF4444] bg-[#0D1117] px-4 py-2">
          <input aria-label="Delete commit message" value={deleteMessage} onChange={(e) => setDeleteMessage(e.target.value)} className="flex-1 border border-[#30363D] bg-[#161B22] px-2.5 py-1 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none" />
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <button type="button" disabled={deleting || !deleteMessage.trim()} onClick={() => void handleConfirmDelete()} className="border border-[#EF4444] bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#0D1117] disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      )}

      {!editing && viewMode === 'preview' && previewKind === 'markdown' ? (
        <GitMarkdownPreview content={selectedFile.content} />
      ) : !editing && viewMode === 'preview' && previewKind === 'env' ? (
        <GitEnvPreview content={selectedFile.content} />
      ) : (
        <GitCodeViewerCanvas fileName={selectedFile.name} content={editing ? draftContent : selectedFile.content} editable={editing} onChange={setDraftContent} />
      )}
    </div>
  );
}
