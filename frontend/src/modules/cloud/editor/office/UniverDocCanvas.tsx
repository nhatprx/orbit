import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createUniver, LocaleType, mergeLocales, type FUniver } from '@univerjs/presets';
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core';
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US';
import type { OfficeDocContentDto } from './officeTypes';
import { fromUniverDocData, toUniverDocData } from './univerDocAdapter';
import { ensureUniverDomEnv, isDocContentMutation, orbitUniverTheme } from './univerDomEnv';
import './univerOrbitTheme.css';

export type FDocument = ReturnType<FUniver['createDocument']>;

export interface UniverDocCanvasHandle {
  flushNow: () => OfficeDocContentDto | null;
  getDocumentApi: () => FDocument | null;
  getUniverApi: () => FUniver | null;
}

export interface UniverDocCanvasProps {
  initialValue: OfficeDocContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeDocContentDto) => void;
  onReady?: (handle: UniverDocCanvasHandle) => void;
}

const DEBOUNCE_MS = 60;

export const UniverDocCanvas = forwardRef<UniverDocCanvasHandle, UniverDocCanvasProps>(
  function UniverDocCanvas({ initialValue, readOnly = false, onChange, onReady }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const initialValueRef = useRef<OfficeDocContentDto>(initialValue);
    const readOnlyRef = useRef<boolean>(readOnly);
    const onChangeRef = useRef(onChange);
    const onReadyRef = useRef(onReady);
    const docRef = useRef<FDocument | null>(null);
    const univerApiRef = useRef<FUniver | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTrailingRef = useRef<boolean>(false);

    readOnlyRef.current = readOnly;
    onChangeRef.current = onChange;
    onReadyRef.current = onReady;

    const emitSnapshot = (): OfficeDocContentDto | null => {
      const doc = docRef.current;
      if (!doc) return null;
      const dto = fromUniverDocData(doc.save(), initialValueRef.current.tables);
      initialValueRef.current = dto;
      onChangeRef.current(dto);
      return dto;
    };

    const flushNow = (): OfficeDocContentDto | null => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingTrailingRef.current = false;
      return emitSnapshot();
    };

    useImperativeHandle(ref, () => ({
      flushNow,
      getDocumentApi: () => docRef.current,
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
          [LocaleType.EN_US]: mergeLocales(UniverPresetDocsCoreEnUS),
        },
        darkMode: true,
        theme: orbitUniverTheme,
        presets: [UniverDocsCorePreset({ container })],
      });

      const fDoc = univerAPI.createDocument(toUniverDocData(initialValueRef.current));
      univerApiRef.current = univerAPI;
      docRef.current = fDoc;

      if (readOnlyRef.current) {
        void fDoc.getPermission?.()?.setReadOnly?.();
      }

      let disposed = false;
      const cmdSub = univerAPI.addEvent(univerAPI.Event.CommandExecuted, (cmd) => {
        if (disposed || readOnlyRef.current || !isDocContentMutation(cmd)) return;
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
        getDocumentApi: () => docRef.current,
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
        docRef.current = null;
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
      const doc = docRef.current;
      if (!doc) return;
      if (readOnly) void doc.getPermission?.()?.setReadOnly?.();
      else void doc.getPermission?.()?.setEditable?.();
    }, [readOnly]);

    return (
      <div
        ref={hostRef}
        aria-label="Univer document canvas"
        data-testid="orbit-univer-doc-host"
        data-readonly={readOnly ? 'true' : 'false'}
        className="orbit-univer-host orbit-univer-doc-host relative h-full w-full flex-1 overflow-hidden rounded-none bg-[#0D1117]"
      />
    );
  }
);
