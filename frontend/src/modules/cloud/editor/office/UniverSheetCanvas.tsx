import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createUniver, ICommandService, LocaleType, mergeLocales, type FUniver } from '@univerjs/presets';
import { UniverSheetsCorePreset, type FWorkbook } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import type { OfficeSheetContentDto, SheetTabDto } from './officeTypes';
import { columnLabel } from './sheetFormulas';
import { ensureUniverDomEnv, isWorkbookContentMutation, orbitUniverTheme } from './univerDomEnv';
import { fromUniverWorkbookData, toUniverWorkbookData } from './univerWorkbookAdapter';
import type { SheetCursorPayload, SheetMutationPayload } from './useOfficeCollab';
import './univerOrbitTheme.css';

export interface UniverSheetCanvasHandle {
  flushNow: () => OfficeSheetContentDto | null;
  getActiveSheetTab: () => SheetTabDto | null;
  getWorkbookApi: () => FWorkbook | null;
  getUniverApi: () => FUniver | null;
  applyRemoteMutation: (mutation: SheetMutationPayload) => void;
}

export interface UniverSheetCanvasProps {
  initialValue: OfficeSheetContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeSheetContentDto) => void;
  onLocalMutation?: (mutation: SheetMutationPayload) => void;
  onSelectionCursorChange?: (cursor: SheetCursorPayload) => void;
  onReady?: (handle: UniverSheetCanvasHandle) => void;
}

const DEBOUNCE_MS = 60;

export const UniverSheetCanvas = forwardRef<UniverSheetCanvasHandle, UniverSheetCanvasProps>(
  function UniverSheetCanvas(
    { initialValue, readOnly = false, onChange, onLocalMutation, onSelectionCursorChange, onReady },
    ref
  ) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const initialValueRef = useRef<OfficeSheetContentDto>(initialValue);
    const readOnlyRef = useRef<boolean>(readOnly);
    const onChangeRef = useRef(onChange);
    const onLocalMutationRef = useRef(onLocalMutation);
    const onSelectionCursorRef = useRef(onSelectionCursorChange);
    const onReadyRef = useRef(onReady);
    const workbookRef = useRef<FWorkbook | null>(null);
    const univerApiRef = useRef<FUniver | null>(null);
    const cmdServiceRef = useRef<ICommandService | null>(null);
    const applyingRemoteRef = useRef<boolean>(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTrailingRef = useRef<boolean>(false);

    readOnlyRef.current = readOnly;
    onChangeRef.current = onChange;
    onLocalMutationRef.current = onLocalMutation;
    onSelectionCursorRef.current = onSelectionCursorChange;
    onReadyRef.current = onReady;

    const emitSnapshot = (): OfficeSheetContentDto | null => {
      const wb = workbookRef.current;
      if (!wb) return null;
      const dto = fromUniverWorkbookData(wb.save());
      onChangeRef.current(dto);
      return dto;
    };

    const flushNow = (): OfficeSheetContentDto | null => {
      if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
      pendingTrailingRef.current = false;
      return emitSnapshot();
    };

    const getActiveSheetTab = (): SheetTabDto | null => {
      const wb = workbookRef.current;
      if (!wb) return null;
      const dto = fromUniverWorkbookData(wb.save());
      const activeName = wb.getActiveSheet()?.getSheetName?.();
      return (activeName && dto.sheets.find((s) => s.name === activeName)) || dto.sheets[0] || null;
    };

    const applyRemoteMutation = (mutation: SheetMutationPayload): void => {
      const cmdSvc = cmdServiceRef.current;
      const api = univerApiRef.current;
      if (!cmdSvc && !api) return;
      applyingRemoteRef.current = true;
      try {
        const opts = { onlyLocal: true, fromCollab: true };
        if (cmdSvc) cmdSvc.syncExecuteCommand(mutation.id, mutation.params as object, opts);
        else if (api) api.syncExecuteCommand(mutation.id, mutation.params as object, opts);
      } catch { /* ignore incompatible remote params */ } finally {
        applyingRemoteRef.current = false;
      }
    };

    useImperativeHandle(ref, () => ({
      flushNow, getActiveSheetTab,
      getWorkbookApi: () => workbookRef.current,
      getUniverApi: () => univerApiRef.current,
      applyRemoteMutation,
    }));

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      ensureUniverDomEnv();

      const container = document.createElement('div');
      container.className = 'h-full w-full rounded-none';
      host.appendChild(container);

      const { univer, univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
        darkMode: true,
        theme: orbitUniverTheme,
        presets: [UniverSheetsCorePreset({ container })],
      });

      const fWorkbook = univerAPI.createWorkbook(toUniverWorkbookData(initialValueRef.current));
      univerApiRef.current = univerAPI;
      workbookRef.current = fWorkbook;
      try { cmdServiceRef.current = univer.__getInjector().get(ICommandService); } catch { cmdServiceRef.current = null; }

      if (readOnlyRef.current) {
        fWorkbook.setEditable(false);
        void fWorkbook.getWorkbookPermission?.()?.setReadOnly?.();
      }

      let disposed = false;
      const onCmd = (cmd: { id: string; type?: number; params?: unknown }, options?: { onlyLocal?: boolean; fromCollab?: boolean }) => {
        if (disposed || readOnlyRef.current || applyingRemoteRef.current || options?.fromCollab || options?.onlyLocal) return;
        if (!isWorkbookContentMutation(cmd)) return;
        onLocalMutationRef.current?.({ id: cmd.id, params: cmd.params });
        if (timerRef.current === null) {
          emitSnapshot();
          pendingTrailingRef.current = false;
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (!disposed && pendingTrailingRef.current) { pendingTrailingRef.current = false; emitSnapshot(); }
          }, DEBOUNCE_MS);
        } else pendingTrailingRef.current = true;
      };

      const cmdSub = cmdServiceRef.current
        ? cmdServiceRef.current.onCommandExecuted(onCmd)
        : fWorkbook.onCommandExecuted((cmd) => onCmd(cmd));

      let selSub: { dispose: () => void } | null = null;
      try {
        selSub = fWorkbook.onSelectionChange?.((selections) => {
          const first = selections?.[0];
          if (!first || disposed) return;
          const row = first.startRow ?? 0;
          const col = first.startColumn ?? 0;
          const sheetName = fWorkbook.getActiveSheet()?.getSheetName?.() ?? 'Sheet1';
          onSelectionCursorRef.current?.({ sheetName, row, col, cellLabel: `${columnLabel(col)}${row + 1}` });
        }) ?? null;
      } catch { selSub = null; }

      onReadyRef.current?.({
        flushNow, getActiveSheetTab,
        getWorkbookApi: () => workbookRef.current,
        getUniverApi: () => univerApiRef.current,
        applyRemoteMutation,
      });

      return () => {
        disposed = true;
        if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
        pendingTrailingRef.current = false;
        cmdSub.dispose();
        selSub?.dispose();
        cmdServiceRef.current = null;
        workbookRef.current = null;
        univerApiRef.current = null;
        queueMicrotask(() => {
          setTimeout(() => { try { univer.dispose(); } catch { /* ignore */ } container.remove(); }, 0);
        });
      };
    }, []);

    useEffect(() => {
      const wb = workbookRef.current;
      if (!wb) return;
      wb.setEditable(!readOnly);
      if (readOnly) void wb.getWorkbookPermission?.()?.setReadOnly?.();
      else void wb.getWorkbookPermission?.()?.setEditable?.();
    }, [readOnly]);

    return (
      <div
        ref={hostRef} aria-label="Univer spreadsheet canvas" data-testid="orbit-univer-host"
        data-readonly={readOnly ? 'true' : 'false'}
        className="orbit-univer-host relative h-full w-full flex-1 overflow-hidden rounded-none bg-[#0D1117]"
      />
    );
  }
);
