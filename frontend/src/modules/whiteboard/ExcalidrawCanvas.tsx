import { useEffect, useMemo, useRef } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types';
import type {
  WhiteboardAsset,
  WhiteboardCanvasTheme,
  WhiteboardScenePayload,
} from '../../types/whiteboard.types';
import './excalidrawOrbitTheme.css';
import {
  buildSceneSnapshot,
  exportBoardAsExcalidraw,
  exportBoardAsPng,
  exportBoardAsSvg,
  importExcalidrawFile,
  toExcalidrawBinaryFiles,
} from './whiteboardExport';
import type { WhiteboardSceneSnapshot } from './whiteboardSceneSync';

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}

if (typeof window !== 'undefined' && !window.EXCALIDRAW_ASSET_PATH) {
  window.EXCALIDRAW_ASSET_PATH = '/';
}

export interface WhiteboardCanvasActions {
  exportPng: () => Promise<void>;
  exportSvg: () => Promise<void>;
  exportExcalidraw: () => void;
  importFile: (file: File) => Promise<void>;
}

export interface ExcalidrawCanvasProps {
  boardId: string;
  resetTick: number;
  title: string;
  sceneJson: WhiteboardScenePayload;
  assets: readonly WhiteboardAsset[];
  canWrite: boolean;
  canvasTheme: WhiteboardCanvasTheme;
  onToggleTheme: () => void;
  onSceneChange: (snapshot: WhiteboardSceneSnapshot) => void;
  onRequestImport: () => void;
  onActionsReady: (actions: WhiteboardCanvasActions | null) => void;
}

export default function ExcalidrawCanvas({
  boardId,
  resetTick,
  title,
  sceneJson,
  assets,
  canWrite,
  canvasTheme,
  onToggleTheme,
  onSceneChange,
  onRequestImport,
  onActionsReady,
}: ExcalidrawCanvasProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;
  const themeRef = useRef(canvasTheme);
  themeRef.current = canvasTheme;

  const initialData = useMemo<ExcalidrawInitialDataState>(
    () => ({
      elements: (sceneJson.elements ?? []) as unknown as readonly ExcalidrawElement[],
      appState: {
        ...(sceneJson.appState as Partial<AppState> | undefined),
        theme: canvasTheme,
        collaborators: new Map(),
      },
      scrollToContent: (sceneJson.elements?.length ?? 0) > 0,
    }),
    // Only recompute initial data when board or explicit server reload tick changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardId, resetTick]
  );

  useEffect(() => {
    const api = apiRef.current;
    if (!api || assets.length === 0) return;
    api.addFiles(toExcalidrawBinaryFiles(assets));
  }, [assets, boardId, resetTick]);

  useEffect(() => {
    onActionsReady({
      exportPng: async () => {
        if (apiRef.current) {
          await exportBoardAsPng(apiRef.current, titleRef.current, themeRef.current === 'dark');
        }
      },
      exportSvg: async () => {
        if (apiRef.current) {
          await exportBoardAsSvg(apiRef.current, titleRef.current, themeRef.current === 'dark');
        }
      },
      exportExcalidraw: () => {
        if (apiRef.current) exportBoardAsExcalidraw(apiRef.current, titleRef.current);
      },
      importFile: async (file: File) => {
        if (!apiRef.current) return;
        await importExcalidrawFile(file, apiRef.current);
      },
    });
    return () => onActionsReady(null);
  }, [onActionsReady]);

  const handleApi = (api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
    if (assets.length > 0) api.addFiles(toExcalidrawBinaryFiles(assets));
  };

  return (
    <div className="orbit-whiteboard-host h-full w-full min-h-0 flex-1">
      <Excalidraw
        key={`${boardId}:${resetTick}`}
        excalidrawAPI={handleApi}
        initialData={initialData}
        theme={canvasTheme}
        name={title}
        viewModeEnabled={!canWrite}
        aiEnabled={false}
        validateEmbeddable={false}
        handleKeyboardGlobally={false}
        onChange={(elements, appState: AppState, files: BinaryFiles) => {
          onSceneChange(buildSceneSnapshot(elements, appState, files));
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: true,
            clearCanvas: canWrite,
            changeViewBackgroundColor: canWrite,
            toggleTheme: false,
          },
          tools: { image: canWrite },
        }}
      >
        <MainMenu>
          <MainMenu.Item onSelect={() => apiRef.current && void exportBoardAsPng(apiRef.current, title, canvasTheme === 'dark')}>
            Export PNG
          </MainMenu.Item>
          <MainMenu.Item onSelect={() => apiRef.current && void exportBoardAsSvg(apiRef.current, title, canvasTheme === 'dark')}>
            Export SVG
          </MainMenu.Item>
          <MainMenu.Item onSelect={() => apiRef.current && exportBoardAsExcalidraw(apiRef.current, title)}>
            Export .excalidraw
          </MainMenu.Item>
          {canWrite && (
            <MainMenu.Item onSelect={onRequestImport}>Import .excalidraw</MainMenu.Item>
          )}
          <MainMenu.Separator />
          <MainMenu.Item onSelect={onToggleTheme}>
            {canvasTheme === 'dark' ? 'Switch to Light Canvas' : 'Switch to Dark Canvas'}
          </MainMenu.Item>
          {canWrite && (
            <>
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </>
          )}
        </MainMenu>
        <WelcomeScreen>
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Heading>
              Orbit Whiteboard - Start sketching shapes, arrows, and diagrams.
            </WelcomeScreen.Center.Heading>
          </WelcomeScreen.Center>
        </WelcomeScreen>
      </Excalidraw>
    </div>
  );
}
