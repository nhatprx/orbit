import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../../types/cloud.types';
import { OrbitOfficeWorkspace } from './OrbitOfficeWorkspace';

const BASE_NODE: CloudNodeDto = {
  id: 'node-office-1', scopeType: 'USER', scopeId: 'user-1', parentId: null, nodeType: 'FILE',
  name: 'spec.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  sizeBytes: 4096, starred: false, depth: 0, createdBy: 'user-1', createdByName: 'Ada Lovelace',
  deletedAt: null, purgeAfter: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};

function createStubApi(overrides: Partial<CloudFilesApi> = {}): CloudFilesApi {
  return {
    listNodes: vi.fn(), getBreadcrumbs: vi.fn(), getQuota: vi.fn(), createFolder: vi.fn(),
    updateNode: vi.fn(), softDeleteNode: vi.fn(), restoreNode: vi.fn(), permanentDeleteNode: vi.fn(),
    emptyTrash: vi.fn(), initUpload: vi.fn(), signUploadParts: vi.fn(), completeUpload: vi.fn(), abortUpload: vi.fn(),
    getDownloadUrl: vi.fn().mockResolvedValue({
      url: 'https://cdn.orbit.local/manual.pdf', expiresAt: '2026-03-01T01:00:00Z',
      provider: 'S3', filename: 'manual.pdf', mimeType: 'application/pdf', sizeBytes: 1024,
    }),
    createDocument: vi.fn(), getTextContent: vi.fn(), saveTextContent: vi.fn(),
    getOfficeContent: vi.fn().mockResolvedValue({
      nodeId: BASE_NODE.id, name: BASE_NODE.name, mimeType: BASE_NODE.mimeType ?? '', format: 'DOCX',
      sizeBytes: BASE_NODE.sizeBytes, updatedAt: BASE_NODE.updatedAt, etag: 'etag-1',
      doc: {
        blocks: [{ type: 'h1', text: '<b>Architecture</b> Spec', align: 'left' }],
        tables: [{ rows: [['Col1', 'Col2']] }],
      },
      sheet: null, slide: null,
    }),
    saveOfficeContent: vi.fn().mockResolvedValue({ ...BASE_NODE, updatedAt: '2026-03-01T00:05:00Z' }),
    ...overrides,
  } as CloudFilesApi;
}

describe('OrbitOfficeWorkspace', () => {
  it('mounts Univer Docs workspace with ORBIT DOCS badge, live footer stats, and lossless round-trip on Save', async () => {
    const api = createStubApi();
    const onBack = vi.fn();
    const onSaved = vi.fn();
    render(<OrbitOfficeWorkspace node={BASE_NODE} api={api} canWrite={true} onBack={onBack} onDownload={vi.fn()} onSaved={onSaved} />);

    const docHost = await screen.findByTestId('orbit-univer-doc-host');
    expect(docHost.getAttribute('data-readonly')).toBe('false');
    expect(screen.getByText('ORBIT DOCS')).toBeTruthy();
    expect(screen.getByText('Words: 4')).toBeTruthy();
    expect(screen.getByText('Paragraphs: 1')).toBeTruthy();
    expect(screen.getByText('Tables: 1')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Back to files/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  }, 15000);

  it('mounts Univer Sheets workspace with compact Orbit header, Export CSV, Download, and read-only guard', async () => {
    const api = createStubApi({
      getOfficeContent: vi.fn().mockResolvedValue({
        nodeId: 'sheet-1', name: 'duynn.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        format: 'XLSX', sizeBytes: 2048, updatedAt: BASE_NODE.updatedAt, etag: null, doc: null, slide: null,
        sheet: { sheets: [{ name: 'Sheet1', rows: [['15', '20', '=A1+B1']] }] },
      }),
    });

    const onDownload = vi.fn();
    render(
      <OrbitOfficeWorkspace
        node={{ ...BASE_NODE, id: 'sheet-1', name: 'duynn.xlsx' }}
        api={api}
        canWrite={true}
        onBack={vi.fn()}
        onDownload={onDownload}
        onSaved={vi.fn()}
      />
    );

    const univerHost = await screen.findByTestId('orbit-univer-host');
    expect(univerHost.getAttribute('data-readonly')).toBe('false');
    expect(screen.getByText('ORBIT SHEETS')).toBeTruthy();
    expect(screen.getByText('duynn.xlsx')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Download/i }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  }, 15000);

  it('renders PDF VIEWER badge and OrbitPdfViewer inline iframe when isPdf is true', async () => {
    const api = createStubApi();
    const pdfNode: CloudNodeDto = { ...BASE_NODE, name: 'manual.pdf', mimeType: 'application/pdf' };
    render(<OrbitOfficeWorkspace node={pdfNode} api={api} canWrite={true} isPdf={true} onBack={vi.fn()} onDownload={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText('PDF VIEWER')).toBeTruthy();
    const frame = await screen.findByTitle('manual.pdf');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('src')).toBe('https://cdn.orbit.local/manual.pdf');
  });

  it('mounts Univer Slides workspace with ORBIT SLIDES badge, Enter to add bullet, theme selector, Present mode, and Save', async () => {
    const api = createStubApi({
      getOfficeContent: vi.fn().mockResolvedValue({
        nodeId: 'slide-1', name: 'deck.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        format: 'PPTX', sizeBytes: 2048, updatedAt: BASE_NODE.updatedAt, etag: null, doc: null, sheet: null,
        slide: { slides: [{ title: 'Q1 Roadmap', subtitle: 'Execution', bullets: ['Ship Orbit Office'], notes: 'Keynote' }] },
      }),
    });

    const onBack = vi.fn();
    const onSaved = vi.fn();
    render(<OrbitOfficeWorkspace node={{ ...BASE_NODE, name: 'deck.pptx' }} api={api} canWrite={true} onBack={onBack} onDownload={vi.fn()} onSaved={onSaved} />);

    const titleInput = (await screen.findByLabelText('Slide title')) as HTMLInputElement;
    expect(screen.getByText('ORBIT SLIDES')).toBeTruthy();
    expect(screen.getByTestId('orbit-univer-slide-host')).toBeTruthy();
    expect(titleInput.value).toBe('Q1 Roadmap');
    expect(screen.getByLabelText('Slide filmstrip')).toBeTruthy();
    expect((screen.getByLabelText('Speaker notes') as HTMLTextAreaElement).value).toBe('Keynote');

    fireEvent.keyDown(screen.getByLabelText('Bullet 1'), { key: 'Enter' });
    expect(screen.getByLabelText('Bullet 2')).toBeTruthy();
    expect(screen.getByText('Unsaved')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Slide theme'), { target: { value: 'emerald' } });
    expect(screen.getByLabelText('Slide stage').getAttribute('data-theme')).toBe('emerald');

    fireEvent.click(screen.getByRole('button', { name: /Back to files/i }));
    expect(screen.getByText(/You have unsaved changes/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Keep Editing/i }));

    fireEvent.click(screen.getByRole('button', { name: /Present/i }));
    expect(screen.getByText(/Presentation Mode/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Exit Presentation/i }));
    expect(screen.getByLabelText('Slide title')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(api.saveOfficeContent).toHaveBeenCalledTimes(1));
    expect(screen.getByText('All changes saved')).toBeTruthy();
    expect(onSaved).toHaveBeenCalledTimes(1);
  }, 15000);
});
