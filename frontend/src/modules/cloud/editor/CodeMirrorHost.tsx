import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { getCodeMirrorLanguage, orbitEditorTheme } from './fileEditorRegistry';

interface CodeMirrorHostProps {
  docKey: string;
  fileName: string;
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}

export function CodeMirrorHost({
  docKey,
  fileName,
  initialValue,
  readOnly,
  onChange,
}: CodeMirrorHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        oneDark,
        orbitEditorTheme,
        ...getCodeMirrorLanguage(fileName),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent });
    return () => {
      view.destroy();
    };
    // Intentionally keyed on docKey/fileName/readOnly so typing does not recreate EditorView
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, fileName, readOnly]);

  return <div ref={containerRef} data-testid="codemirror-host" className="h-full w-full overflow-hidden" />;
}
