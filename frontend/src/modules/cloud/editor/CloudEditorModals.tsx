import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../types/cloud.types';
import { CloudOnlyOfficeModal } from './CloudOnlyOfficeModal';
import { CloudTextEditorModal } from './CloudTextEditorModal';
import { NewDocumentModal } from './NewDocumentModal';

interface CloudEditorModalsProps {
  api: CloudFilesApi;
  activeParentId: string | null;
  canWrite: boolean;
  newDocOpen: boolean;
  textNode: CloudNodeDto | null;
  officeNode: CloudNodeDto | null;
  onCloseNewDoc: () => void;
  onDocumentCreated: (node: CloudNodeDto) => void;
  onCloseText: () => void;
  onTextSaved: (node: CloudNodeDto) => void;
  onCloseOffice: () => void;
  onDownload: (node: CloudNodeDto) => void;
  onRefresh: () => void;
}

export function CloudEditorModals({
  api,
  activeParentId,
  canWrite,
  newDocOpen,
  textNode,
  officeNode,
  onCloseNewDoc,
  onDocumentCreated,
  onCloseText,
  onTextSaved,
  onCloseOffice,
  onDownload,
  onRefresh,
}: CloudEditorModalsProps) {
  return (
    <>
      <NewDocumentModal
        open={newDocOpen}
        parentId={activeParentId}
        api={api}
        onClose={onCloseNewDoc}
        onCreated={onDocumentCreated}
      />
      <CloudTextEditorModal
        node={textNode}
        api={api}
        canWrite={canWrite}
        onClose={onCloseText}
        onSaved={onTextSaved}
      />
      <CloudOnlyOfficeModal
        node={officeNode}
        api={api}
        onClose={onCloseOffice}
        onDownload={onDownload}
        onRefresh={onRefresh}
      />
    </>
  );
}
