export type DocumentTemplateType = 'TXT' | 'MD' | 'DOCX' | 'XLSX' | 'PPTX';

export interface CreateDocumentRequest {
  parentId: string | null;
  name: string;
  templateType: DocumentTemplateType;
}

export interface TextContentResponse {
  nodeId: string;
  name: string;
  mimeType: string | null;
  content: string;
  sizeBytes: number;
  updatedAt: string;
  etag: string | null;
}

export interface SaveTextContentRequest {
  content: string;
  expectedUpdatedAt?: string;
}

export type {
  OfficeDocumentResponse,
  SaveOfficeDocumentPayload,
  SheetCellStyleDto,
  SheetNumberFormat,
  SheetTabDto,
} from '../modules/cloud/editor/office/officeTypes';
