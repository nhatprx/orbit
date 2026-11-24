import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from '@codemirror/view';
import { getCodeMirrorLanguage } from '../cloud/editor/fileEditorRegistry';
import { draculaCodeTheme } from './gitCodeThemes';

interface GitCodeViewerCanvasProps {
  fileName: string;
  content: string;
  editable?: boolean;
  onChange?: (nextContent: string) => void;
}

export function GitCodeViewerCanvas({
  fileName,
  content,
  editable = false,
  onChange,
}: GitCodeViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompRef = useRef(new Compartment());
  const editCompRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const syncingRef = useRef(false);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        langCompRef.current.of(getCodeMirrorLanguage(fileName)),
        editCompRef.current.of([
          EditorState.readOnly.of(!editable),
          EditorView.editable.of(editable),
        ]),
        EditorView.updateListener.of((update) => {
          if (!syncingRef.current && update.docChanged && onChangeRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        ...draculaCodeTheme,
      ],
    });

    const view = new EditorView({ state, parent });
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // Initialized once; content, language, and editability reconfigure in-place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    syncingRef.current = true;
    try {
      if (current !== content) {
        view.dispatch({
          changes: { from: 0, to: current.length, insert: content },
          effects: langCompRef.current.reconfigure(getCodeMirrorLanguage(fileName)),
        });
      } else {
        view.dispatch({
          effects: langCompRef.current.reconfigure(getCodeMirrorLanguage(fileName)),
        });
      }
    } finally {
      syncingRef.current = false;
    }
  }, [content, fileName]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editCompRef.current.reconfigure([
        EditorState.readOnly.of(!editable),
        EditorView.editable.of(editable),
      ]),
    });
    if (editable) view.focus();
  }, [editable]);

  return <div ref={containerRef} data-testid="git-code-canvas" className="min-h-0 flex-1 overflow-hidden" />;
}
