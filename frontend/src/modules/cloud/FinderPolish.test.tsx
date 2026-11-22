import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudQuotaDto } from '../../types/cloud.types';
import { CloudFilesPage } from './CloudFilesPage';
import { humanFileKind } from './cloudFormat';
import { OfficeModulePage } from './OfficeModulePage';

const QUOTA: CloudQuotaDto = {
  scopeType: 'USER', scopeId: 'u-1', usedBytes: 1024, quotaBytes: 1024 * 1024,
  reservedBytes: 0, maxFileSizeBytes: 500 * 1024 * 1024, multipartThresholdBytes: 50 * 1024 * 1024,
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function makeNode(overrides: Partial<CloudNodeDto> = {}): CloudNodeDto {
  return {
    id: 'n-1', scopeType: 'USER', scopeId: 'u-1', parentId: null, folderPath: '/Specs',
    nodeType: 'FILE', name: 'roadmap.docx', mimeType: DOCX_MIME, sizeBytes: 4096,
    starred: false, depth: 0, createdBy: 'u-1', createdByName: 'Alice',
    deletedAt: null, purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

function makeApi(overrides: Partial<CloudFilesApi> = {}): CloudFilesApi {
  return {
    listNodes: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false, limit: 50 }),
    getBreadcrumbs: vi.fn().mockResolvedValue({ items: [] }),
    getQuota: vi.fn().mockResolvedValue(QUOTA),
    createFolder: vi.fn(), updateNode: vi.fn().mockResolvedValue(makeNode()),
    moveCloudNodes: vi.fn().mockResolvedValue({ moved: [] }),
    softDeleteNode: vi.fn(), restoreNode: vi.fn(), permanentDeleteNode: vi.fn(), emptyTrash: vi.fn(),
    initUpload: vi.fn(), signUploadParts: vi.fn(), completeUpload: vi.fn(), abortUpload: vi.fn(),
    getDownloadUrl: vi.fn().mockResolvedValue({
      url: 'https://cdn.orbit.local/preview.png', expiresAt: '2026-11-20T01:00:00Z',
      provider: 'S3', filename: 'diagram.png', mimeType: 'image/png', sizeBytes: 2048,
    }),
    createDocument: vi.fn(),
    getTextContent: vi.fn().mockResolvedValue({
      nodeId: 'md-1', name: 'guide.md', mimeType: 'text/markdown',
      content: '# Orbit Guide\n\n<script>alert(1)</script>Hello **Finder**',
      sizeBytes: 58, updatedAt: '2026-11-20T00:00:00Z', etag: 'etag-1',
    }),
    saveTextContent: vi.fn(),
    getOfficeContent: vi.fn().mockResolvedValue({
      nodeId: 'n-1', name: 'roadmap.docx', mimeType: DOCX_MIME, format: 'DOCX',
      sizeBytes: 4096, updatedAt: '2026-11-20T00:00:00Z', etag: 'etag-2',
      doc: { blocks: [{ type: 'p', text: 'Roadmap Body', align: 'left' }], tables: [] },
      sheet: null, slide: null,
    }),
    saveOfficeContent: vi.fn(),
    ...overrides,
  };
}

describe('Finder Polish: Inspector, Quick Look & Office Grid', () => {
  it('maps MIME types and extensions to clean human-readable labels with zero raw VND strings', () => {
    expect(humanFileKind(makeNode({ name: 'a.docx', mimeType: DOCX_MIME }))).toBe('Word Document');
    expect(humanFileKind(makeNode({ name: 'b.xlsx', mimeType: 'application/octet-stream' }))).toBe('Excel Spreadsheet');
    expect(humanFileKind(makeNode({ name: 'c.pptx', mimeType: null }))).toBe('PowerPoint Deck');
    expect(humanFileKind(makeNode({ name: 'd.ts', mimeType: 'text/plain' }))).toBe('TypeScript');
    expect(humanFileKind(makeNode({ name: 'e.svg', mimeType: 'image/svg+xml' }))).toBe('SVG Image');
    expect(humanFileKind(makeNode({ name: 'f.bin', mimeType: 'application/vnd.openxmlformats-custom' }))).toBe('BIN File');
    expect(humanFileKind(makeNode({ name: 'noext', mimeType: DOCX_MIME }))).toBe('Word Document');
    expect(humanFileKind(makeNode({ name: 'rawblob', mimeType: 'application/vnd.custom-xyz' }))).toBe('Binary File');
  });

  it('hides Inspector by default, toggles via button and Ctrl+I, and shows human kind with compact action strip', async () => {
    const docNode = makeNode({ id: 'doc-1', name: 'quarterly-architecture-roadmap.docx', mimeType: DOCX_MIME });
    const api = makeApi({
      listNodes: vi.fn().mockResolvedValue({ items: [docNode], nextCursor: null, hasMore: false, limit: 50 }),
    });

    render(<CloudFilesPage scope={{ type: 'USER' }} apiOverride={api} />);
    const row = await screen.findByText('quarterly-architecture-roadmap.docx');
    fireEvent.click(row);

    const toggleBtn = screen.getByRole('button', { name: 'Toggle inspector' });
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByTestId('cloud-inspector-pane')).toBeNull();

    fireEvent.click(toggleBtn);
    const pane = screen.getByTestId('cloud-inspector-pane');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
    expect(within(pane).getAllByText('Word Document').length).toBeGreaterThan(0);
    expect(pane.textContent?.toUpperCase()).not.toContain('VND.OPENXMLFORMATS');

    const strip = within(pane).getByRole('toolbar', { name: 'Inspector actions' });
    for (const label of ['Quick Look', 'Download', 'Star', 'Rename', 'Move', 'Trash']) {
      expect(within(strip).getByRole('button', { name: label })).toBeTruthy();
    }

    const searchInput = screen.getByLabelText('Search files');
    fireEvent.keyDown(searchInput, { key: 'i', ctrlKey: true });
    expect(screen.getByTestId('cloud-inspector-pane')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    expect(screen.queryByTestId('cloud-inspector-pane')).toBeNull();
  });

  it('opens Quick Look via Space or context menu, renders Markdown/text/image/Office previews, and closes on Escape/Space', async () => {
    const mdNode = makeNode({ id: 'md-1', name: 'guide.md', mimeType: 'text/markdown' });
    const tsNode = makeNode({ id: 'ts-1', name: 'index.ts', mimeType: 'application/typescript' });
    const imgNode = makeNode({ id: 'img-1', name: 'diagram.png', mimeType: 'image/png' });
    const api = makeApi({
      listNodes: vi.fn().mockResolvedValue({ items: [mdNode, tsNode, imgNode], nextCursor: null, hasMore: false, limit: 50 }),
      getTextContent: vi.fn().mockImplementation(async (id: string) => ({
        nodeId: id, name: id === 'md-1' ? 'guide.md' : 'index.ts', mimeType: 'text/plain',
        content: id === 'md-1' ? '# Orbit Guide\n\n<script>alert(1)</script>Hello **Finder**' : 'export const answer = 42;',
        sizeBytes: 42, updatedAt: '2026-11-20T00:00:00Z', etag: 'e1',
      })),
    });

    render(<CloudFilesPage scope={{ type: 'USER' }} apiOverride={api} />);
    const mdRow = await screen.findByText('guide.md');
    fireEvent.click(mdRow);

    // Space inside search input must not trigger Quick Look
    fireEvent.keyDown(screen.getByLabelText('Search files'), { key: ' ', code: 'Space' });
    expect(screen.queryByTestId('finder-quick-look')).toBeNull();

    // Space on selected Markdown file opens Quick Look with sanitized HTML
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    const mdPreview = await screen.findByTestId('quick-look-markdown');
    expect(mdPreview.textContent).toContain('Orbit Guide');
    expect(mdPreview.innerHTML).not.toContain('<script>');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('finder-quick-look')).toBeNull();

    // Right-click context menu Quick Look on TypeScript file, close with Space
    fireEvent.contextMenu(screen.getByText('index.ts'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Quick Look' }));
    const textPreview = await screen.findByTestId('quick-look-text');
    expect(textPreview.textContent).toContain('export const answer = 42;');

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(screen.queryByTestId('finder-quick-look')).toBeNull();

    // Image preview calls getDownloadUrl and renders <img>
    fireEvent.click(screen.getByText('diagram.png'));
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    const imgContainer = await screen.findByTestId('quick-look-image');
    expect(within(imgContainer).getByRole('img', { name: 'diagram.png' }).getAttribute('src')).toBe(
      'https://cdn.orbit.local/preview.png'
    );
  });

  it('toggles Icons Grid and List view in OfficeModulePage and supports Space Quick Look', async () => {
    const sheet = makeNode({
      id: 'sh-1', scopeType: 'WORKSPACE', name: 'budget.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const api = makeApi({
      listNodes: vi.fn().mockResolvedValue({ items: [sheet], nextCursor: null, hasMore: false, limit: 50 }),
    });
    const scope = { type: 'WORKSPACE' as const, workspaceId: 'ws-1', permissions: ['files.read', 'files.write'] };

    render(<OfficeModulePage scope={scope} scopeLabel="Acme" officeModule="sheets" apiOverride={api} />);
    expect(await screen.findByText('budget.xlsx')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Icons view' }));
    const grid = screen.getByTestId('finder-grid-view');
    expect(within(grid).getByText(/Excel Spreadsheet/)).toBeTruthy();

    fireEvent.click(within(grid).getByText('budget.xlsx'));
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    await waitFor(() => expect(screen.getByTestId('quick-look-binary')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Open in Univer' })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.queryByTestId('finder-grid-view')).toBeNull();
  });
});
