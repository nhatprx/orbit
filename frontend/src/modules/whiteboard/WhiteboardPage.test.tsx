import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WhiteboardErrorBoundary } from './WhiteboardErrorBoundary';
import { WhiteboardPage } from './WhiteboardPage';
import { resolveWhiteboardPermissions } from './whiteboardPermissions';
import { makeMockWhiteboardService, makeTestWorkspace } from './whiteboardTestFixtures';

vi.mock('@excalidraw/excalidraw', () => {
  const MainMenu = Object.assign(
    ({ children }: { children?: React.ReactNode }) => <div data-testid="excalidraw-menu">{children}</div>,
    {
      Item: ({ children, onSelect }: { children?: React.ReactNode; onSelect?: () => void }) => (
        <button type="button" onClick={onSelect}>{children}</button>
      ),
      Separator: () => <hr />,
      DefaultItems: {
        ClearCanvas: () => <span>Clear</span>,
        ChangeCanvasBackground: () => <span>Background</span>,
      },
    }
  );
  const WelcomeScreen = Object.assign(
    ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    {
      Center: Object.assign(
        ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
        { Heading: ({ children }: { children?: React.ReactNode }) => <span>{children}</span> }
      ),
    }
  );
  return {
    Excalidraw: ({
      theme,
      viewModeEnabled,
      initialData,
      excalidrawAPI,
      children,
    }: {
      theme?: string;
      viewModeEnabled?: boolean;
      initialData?: { appState?: { collaborators?: unknown } };
      excalidrawAPI?: (api: Record<string, unknown>) => void;
      children?: React.ReactNode;
    }) => {
      excalidrawAPI?.({
        getSceneElements: () => [],
        getAppState: () => ({}),
        getFiles: () => ({}),
        addFiles: vi.fn(),
        updateScene: vi.fn(),
      });
      return (
        <div
          data-testid="mock-excalidraw"
          data-theme={theme}
          data-readonly={String(Boolean(viewModeEnabled))}
          data-collab-map={String(initialData?.appState?.collaborators instanceof Map)}
        >
          {children}
        </div>
      );
    },
    MainMenu,
    WelcomeScreen,
    getSceneVersion: () => 1,
    serializeAsJSON: () => JSON.stringify({ type: 'excalidraw', version: 2, elements: [], appState: {} }),
    exportToBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
    exportToSvg: vi.fn().mockResolvedValue(document.createElementNS('http://www.w3.org/2000/svg', 'svg')),
    loadFromBlob: vi.fn().mockResolvedValue({ elements: [], appState: {}, files: {} }),
  };
});

describe('WhiteboardPage', () => {
  it('supports board CRUD, pagination, canvas theme toggle, and delete confirmation', async () => {
    const service = makeMockWhiteboardService();
    const ws = makeTestWorkspace(['whiteboard.read', 'whiteboard.write', 'whiteboard.delete']);
    render(<WhiteboardPage workspace={ws} project={null} service={service} />);

    expect(await screen.findByText('Architecture Map')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() =>
      expect(service.listBoards).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ page: 1 }))
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rename Architecture Map' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed Map' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(service.updateBoard).toHaveBeenCalledWith(expect.anything(), 'b-1', {
        title: 'Renamed Map',
        description: 'Core services',
      })
    );

    fireEvent.click(screen.getByText('Renamed Map'));
    const canvas = await screen.findByTestId('mock-excalidraw');
    expect(canvas.getAttribute('data-theme')).toBe('dark');
    expect(canvas.getAttribute('data-readonly')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle canvas theme' }));
    expect(canvas.getAttribute('data-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: /Boards/i }));
    expect(await screen.findByText('Architecture Map')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Architecture Map' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Board' }));
    await waitFor(() => expect(service.deleteBoard).toHaveBeenCalledWith(expect.anything(), 'b-1'));
  });

  it('enforces read-only UI and no-access empty state', async () => {
    const service = makeMockWhiteboardService();
    const roWs = makeTestWorkspace(['whiteboard.read']);
    const { rerender } = render(<WhiteboardPage workspace={roWs} project={null} service={service} />);

    expect(await screen.findByText('Architecture Map')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /New Board/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rename Architecture Map' })).toBeNull();

    fireEvent.click(screen.getByText('Architecture Map'));
    const canvas = await screen.findByTestId('mock-excalidraw');
    expect(canvas.getAttribute('data-readonly')).toBe('true');
    expect(canvas.getAttribute('data-collab-map')).toBe('true');
    expect(screen.getByText('Read-only')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Save$/i })).toBeNull();
    expect(screen.queryByText('Background')).toBeNull();

    expect(
      resolveWhiteboardPermissions({ type: 'WORKSPACE', workspaceId: 'ws-1', permissions: ['whiteboard.manage'] })
    ).toEqual({ canRead: false, canWrite: false, canDelete: false, canManage: true });

    rerender(<WhiteboardPage workspace={makeTestWorkspace([])} project={null} service={service} />);
    expect(screen.getByText('No access to Whiteboard')).toBeTruthy();
  });

  it('renders fallback UI in WhiteboardErrorBoundary when canvas throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Crash = () => {
      throw new Error('WebGL init failed');
    };
    render(
      <WhiteboardErrorBoundary onBack={vi.fn()}>
        <Crash />
      </WhiteboardErrorBoundary>
    );
    expect(screen.getByText('Whiteboard Canvas Failed to Load')).toBeTruthy();
    expect(screen.getByText('WebGL init failed')).toBeTruthy();
    consoleSpy.mockRestore();
  });
});
