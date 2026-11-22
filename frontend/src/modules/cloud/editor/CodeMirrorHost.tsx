import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { getCodeMirrorLanguage, orbitEditorTheme } from './fileEditorRegistry';

export interface CodeMirrorCursor {
  line: number;
  col: number;
  offset: number;
}

interface CodeMirrorHostProps {
  docKey: string;
  fileName: string;
  initialValue: string;
  value?: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onCursorChange?: (cursor: CodeMirrorCursor) => void;
}

export function CodeMirrorHost({
  docKey,
  fileName,
  initialValue,
  value,
  readOnly,
  onChange,
  onCursorChange,
}: CodeMirrorHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartmentRef = useRef(new Compartment());
  const applyingRemoteRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const roComp = readOnlyCompartmentRef.current;
    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        oneDark,
        orbitEditorTheme,
        ...getCodeMirrorLanguage(fileName),
        roComp.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        EditorView.updateListener.of((update) => {
          if (applyingRemoteRef.current) return;
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.selectionSet && onCursorChangeRef.current) {
            const head = update.state.selection.main.head;
            const lineObj = update.state.doc.lineAt(head);
            onCursorChangeRef.current({
              line: lineObj.number,
              col: head - lineObj.from + 1,
              offset: head,
            });
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent });
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // Intentionally keyed on docKey/fileName; readOnly and external value updates run in-place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, fileName]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartmentRef.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === undefined) return;
    const currentText = view.state.doc.toString();
    if (value === currentText) return;

    const main = view.state.selection.main;
    const anchor = Math.min(main.anchor, value.length);
    const head = Math.min(main.head, value.length);

    applyingRemoteRef.current = true;
    try {
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: value },
        selection: { anchor, head },
      });
    } finally {
      applyingRemoteRef.current = false;
    }
  }, [value]);

  return <div ref={containerRef} data-testid="codemirror-host" className="h-full w-full overflow-hidden" />;
}
