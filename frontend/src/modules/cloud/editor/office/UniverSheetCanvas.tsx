import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createUniver, LocaleType, mergeLocales, type FUniver } from '@univerjs/presets';
import { UniverSheetsCorePreset, type FWorkbook } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import type { OfficeSheetContentDto, SheetTabDto } from './officeTypes';
import { ensureUniverDomEnv, isWorkbookContentMutation, orbitUniverTheme } from './univerDomEnv';
import { fromUniverWorkbookData, toUniverWorkbookData } from './univerWorkbookAdapter';
import './univerOrbitTheme.css';

export interface UniverSheetCanvasHandle {
  flushNow: () => OfficeSheetContentDto | null;
  getActiveSheetTab: () => SheetTabDto | null;
  getWorkbookApi: () => FWorkbook | null;
  getUniverApi: () => FUniver | null;
}

export interface UniverSheetCanvasProps {
  initialValue: OfficeSheetContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeSheetContentDto) => void;
  onReady?: (handle: UniverSheetCanvasHandle) => void;
}

const DEBOUNCE_MS = 60;

export const UniverSheetCanvas = forwardRef<UniverSheetCanvasHandle, UniverSheetCanvasProps>(
  function UniverSheetCanvas({ initialValue, readOnly = false, onChange, onReady }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const initialValueRef = useRef<OfficeSheetContentDto>(initialValue);
    const readOnlyRef = useRef<boolean>(readOnly);
    const onChangeRef = useRef(onChange);
    const onReadyRef = useRef(onReady);
    const workbookRef = useRef<FWorkbook | null>(null);
    const univerApiRef = useRef<FUniver | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTrailingRef = useRef<boolean>(false);

    readOnlyRef.current = readOnly;
    onChangeRef.current = onChange;
    onReadyRef.current = onReady;

    const emitSnapshot = (): OfficeSheetContentDto | null => {
      const wb = workbookRef.current;
      if (!wb) return null;
      const dto = fromUniverWorkbookData(wb.save());
      onChangeRef.current(dto);
      return dto;
    };

    const flushNow = (): OfficeSheetContentDto | null => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingTrailingRef.current = false;
      return emitSnapshot();
    };

    const getActiveSheetTab = (): SheetTabDto | null => {
      const wb = workbookRef.current;
      if (!wb) return null;
      const dto = fromUniverWorkbookData(wb.save());
      const activeName = wb.getActiveSheet()?.getSheetName?.();
      if (activeName) {
        const match = dto.sheets.find((s) => s.name === activeName);
        if (match) return match;
      }
      return dto.sheets[0] ?? null;
    };

    useImperativeHandle(ref, () => ({
      flushNow,
      getActiveSheetTab,
      getWorkbookApi: () => workbookRef.current,
      getUniverApi: () => univerApiRef.current,
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
        locales: {
          [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
        },
        darkMode: true,
        theme: orbitUniverTheme,
        presets: [UniverSheetsCorePreset({ container })],
      });

      const fWorkbook = univerAPI.createWorkbook(toUniverWorkbookData(initialValueRef.current));
      univerApiRef.current = univerAPI;
      workbookRef.current = fWorkbook;

      if (readOnlyRef.current) {
        fWorkbook.setEditable(false);
        void fWorkbook.getWorkbookPermission?.()?.setReadOnly?.();
      }

      let disposed = false;
      const cmdSub = fWorkbook.onCommandExecuted((cmd) => {
        if (disposed || readOnlyRef.current || !isWorkbookContentMutation(cmd)) return;
        if (timerRef.current === null) {
          emitSnapshot();
          pendingTrailingRef.current = false;
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (!disposed && pendingTrailingRef.current) {
              pendingTrailingRef.current = false;
              emitSnapshot();
            }
          }, DEBOUNCE_MS);
        } else {
          pendingTrailingRef.current = true;
        }
      });

      onReadyRef.current?.({
        flushNow,
        getActiveSheetTab,
        getWorkbookApi: () => workbookRef.current,
        getUniverApi: () => univerApiRef.current,
      });

      return () => {
        disposed = true;
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        pendingTrailingRef.current = false;
        cmdSub.dispose();
        workbookRef.current = null;
        univerApiRef.current = null;
        queueMicrotask(() => {
          setTimeout(() => {
            try { univer.dispose(); } catch { /* ignore post-unmount teardown errors */ }
            container.remove();
          }, 0);
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
        ref={hostRef}
        aria-label="Univer spreadsheet canvas"
        data-testid="orbit-univer-host"
        data-readonly={readOnly ? 'true' : 'false'}
        className="orbit-univer-host relative h-full w-full flex-1 overflow-hidden rounded-none bg-[#0D1117]"
      />
    );
  }
);
