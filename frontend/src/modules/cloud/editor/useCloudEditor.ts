import { useCallback, useState } from 'react';
import type { CloudNodeDto } from '../../../types/cloud.types';
import { classifyFileEditor } from './fileEditorRegistry';

export function useCloudEditor(onRefresh: () => void) {
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [textNode, setTextNode] = useState<CloudNodeDto | null>(null);
  const [officeNode, setOfficeNode] = useState<CloudNodeDto | null>(null);

  const openNode = useCallback((node: CloudNodeDto) => {
    if (node.nodeType !== 'FILE') return;
    const kind = classifyFileEditor(node.name, node.mimeType);
    if (kind === 'TEXT') {
      setOfficeNode(null);
      setTextNode(node);
    } else if (kind === 'OFFICE' || kind === 'PDF') {
      setTextNode(null);
      setOfficeNode(node);
    }
  }, []);

  const handleDocumentCreated = useCallback(
    (created: CloudNodeDto) => {
      onRefresh();
      openNode(created);
    },
    [onRefresh, openNode]
  );

  const handleTextSaved = useCallback(
    (updated: CloudNodeDto) => {
      const kind = classifyFileEditor(updated.name, updated.mimeType);
      if (kind === 'OFFICE' || kind === 'PDF') {
        setOfficeNode(updated);
      } else {
        setTextNode(updated);
      }
      onRefresh();
    },
    [onRefresh]
  );

  return {
    newDocOpen,
    setNewDocOpen,
    textNode,
    closeTextEditor: () => setTextNode(null),
    officeNode,
    closeOfficeEditor: () => setOfficeNode(null),
    openNode,
    handleDocumentCreated,
    handleTextSaved,
  };
}
