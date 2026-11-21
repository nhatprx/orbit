import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createUniver, Disposable, LocaleType, mergeLocales, UniverInstanceType, type FUniver } from '@univerjs/presets';
import { IRenderManagerService, UniverDocsCorePreset } from '@univerjs/preset-docs-core';
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US';
import { SlideDataModel, UniverSlidesPlugin, type ISlideData } from '@univerjs/slides';
import { ActivateSlidePageOperation, CanvasView, UniverSlidesUIPlugin } from '@univerjs/slides-ui';
import SlidesUIEnUS from '@univerjs/slides-ui/locale/en-US';
import type { OfficeSlideContentDto } from './officeTypes';
import { ensureUniverDomEnv, isSlideContentMutation, orbitUniverTheme } from './univerDomEnv';
import { fromUniverSlideData, toUniverSlideData } from './univerSlideAdapter';
import './univerOrbitTheme.css';

(UniverSlidesPlugin as unknown as { version: string }).version = '1.6.0';
(UniverSlidesUIPlugin as unknown as { version: string }).version = '1.6.0';

class OrbitSafeCanvasView extends Disposable {
  createThumbs(): void {}
  activePage(): void {}
  getRenderUnitByPageId(): { scene: null; engine: null; unit: null } { return { scene: null, engine: null, unit: null }; }
  createObjectToPage(): null { return null; }
  setObjectActiveByPage(): void {}
  removeObjectById(): void {}
  appendPage(): void {}
}

export interface UniverSlideCanvasHandle {
  flushNow: () => OfficeSlideContentDto | null;
  syncSlides: (dto: OfficeSlideContentDto, activeIndex?: number) => void;
  activateSlide: (index: number) => void;
  getSlideModel: () => SlideDataModel | null;
  getUniverApi: () => FUniver | null;
}

export interface UniverSlideCanvasProps {
  initialValue: OfficeSlideContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeSlideContentDto) => void;
  onActiveSlideChange?: (index: number) => void;
  onReady?: (handle: UniverSlideCanvasHandle) => void;
}

const DEBOUNCE_MS = 60;

export const UniverSlideCanvas = forwardRef<UniverSlideCanvasHandle, UniverSlideCanvasProps>(
  function UniverSlideCanvas({ initialValue, readOnly = false, onChange, onActiveSlideChange, onReady }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const initialValueRef = useRef<OfficeSlideContentDto>(initialValue);
    const readOnlyRef = useRef<boolean>(readOnly);
    const onChangeRef = useRef(onChange);
    const onActiveSlideChangeRef = useRef(onActiveSlideChange);
    const onReadyRef = useRef(onReady);
    const slideModelRef = useRef<SlideDataModel | null>(null);
    const univerApiRef = useRef<FUniver | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTrailingRef = useRef<boolean>(false);

    readOnlyRef.current = readOnly;
    onChangeRef.current = onChange;
    onActiveSlideChangeRef.current = onActiveSlideChange;
    onReadyRef.current = onReady;

    const emitSnapshot = (): OfficeSlideContentDto | null => {
      const model = slideModelRef.current;
      if (!model) return null;
      const dto = fromUniverSlideData(model.getSnapshot());
      onChangeRef.current(dto);
      return dto;
    };

    const flushNow = (): OfficeSlideContentDto | null => {
      if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
      pendingTrailingRef.current = false;
      return emitSnapshot();
    };

    const syncSlides = (dto: OfficeSlideContentDto, activeIndex = 0): void => {
      const model = slideModelRef.current;
      if (!model) return;
      const nextData = toUniverSlideData(dto);
      model.getSnapshot().body = nextData.body;
      const order = nextData.body?.pageOrder ?? [];
      const activeId = order[Math.min(Math.max(0, activeIndex), Math.max(0, order.length - 1))];
      const activePage = activeId ? nextData.body?.pages[activeId] : null;
      if (activePage) model.setActivePage(activePage);
    };

    const activateSlide = (index: number): void => {
      const model = slideModelRef.current;
      const api = univerApiRef.current;
      if (!model || !api) return;
      const pageId = (model.getPageOrder() ?? [])[index];
      if (!pageId) return;
      const page = model.getPage(pageId);
      if (page) model.setActivePage(page);
      try { api.syncExecuteCommand(ActivateSlidePageOperation.id, { id: pageId, unitId: model.getUnitId() }); } catch { /* ignore */ }
    };

    useImperativeHandle(ref, () => ({
      flushNow, syncSlides, activateSlide,
      getSlideModel: () => slideModelRef.current,
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
        locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetDocsCoreEnUS, SlidesUIEnUS) },
        darkMode: true,
        theme: orbitUniverTheme,
        presets: [UniverDocsCorePreset({ container })],
        plugins: [
          UniverSlidesPlugin,
          [UniverSlidesUIPlugin, { override: [[CanvasView, { useClass: OrbitSafeCanvasView as unknown as typeof CanvasView }]] }],
        ],
      });

      const renderMgr = univer.__getInjector().get(IRenderManagerService);
      const origRegister = renderMgr.registerRenderModule.bind(renderMgr);
      renderMgr.registerRenderModule = (type: UniverInstanceType, dep: Parameters<typeof origRegister>[1]) =>
        type === UniverInstanceType.UNIVER_SLIDE ? { dispose: () => {} } : origRegister(type, dep);

      const slideModel = univer.createUnit<ISlideData, SlideDataModel>(
        UniverInstanceType.UNIVER_SLIDE,
        toUniverSlideData(initialValueRef.current)
      );
      univerApiRef.current = univerAPI;
      slideModelRef.current = slideModel;

      let disposed = false;
      const cmdSub = univerAPI.addEvent(univerAPI.Event.CommandExecuted, (cmd) => {
        if (disposed) return;
        if (cmd.id === ActivateSlidePageOperation.id) {
          const targetId = (cmd.params as { id?: string } | undefined)?.id;
          const idx = targetId ? (slideModel.getPageOrder() ?? []).indexOf(targetId) : -1;
          if (idx >= 0) onActiveSlideChangeRef.current?.(idx);
          return;
        }
        if (readOnlyRef.current || !isSlideContentMutation(cmd)) return;
        if (timerRef.current === null) {
          emitSnapshot();
          pendingTrailingRef.current = false;
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (!disposed && pendingTrailingRef.current) { pendingTrailingRef.current = false; emitSnapshot(); }
          }, DEBOUNCE_MS);
        } else pendingTrailingRef.current = true;
      });

      onReadyRef.current?.({
        flushNow, syncSlides, activateSlide,
        getSlideModel: () => slideModelRef.current,
        getUniverApi: () => univerApiRef.current,
      });

      return () => {
        disposed = true;
        if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
        pendingTrailingRef.current = false;
        cmdSub.dispose();
        slideModelRef.current = null;
        univerApiRef.current = null;
        queueMicrotask(() => {
          setTimeout(() => { try { univer.dispose(); } catch { /* ignore */ } container.remove(); }, 0);
        });
      };
    }, []);

    return (
      <div ref={hostRef} aria-label="Univer presentation canvas" data-testid="orbit-univer-slide-host" data-readonly={readOnly ? 'true' : 'false'} className="orbit-univer-host relative h-full w-full flex-1 overflow-hidden rounded-none bg-[#0D1117]" />
    );
  }
);
