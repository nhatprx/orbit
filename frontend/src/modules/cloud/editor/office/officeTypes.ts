export type OfficeFormat = 'DOCX' | 'XLSX' | 'PPTX';
export type DocBlockType = 'h1' | 'h2' | 'h3' | 'p' | 'quote' | 'code' | 'ul' | 'ol' | 'hr';
export type DocAlign = 'left' | 'center' | 'right' | 'justify';
export type SheetAlign = 'left' | 'center' | 'right';
export type SheetNumberFormat = 'currency' | 'percent' | 'number';

export interface DocBlockDto {
  type: DocBlockType;
  text: string;
  align?: DocAlign;
}

export interface DocTableDto {
  rows: string[][];
}

export interface OfficeDocContentDto {
  blocks: DocBlockDto[];
  tables: DocTableDto[];
}

export interface SheetCellStyleDto {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
  align?: SheetAlign;
  numFmt?: SheetNumberFormat;
}

export interface SheetTabDto {
  name: string;
  rows: string[][];
  cellStyles?: Record<string, SheetCellStyleDto>;
}

export interface OfficeSheetContentDto {
  sheets: SheetTabDto[];
}

export interface SlideItemDto {
  title: string;
  subtitle: string;
  bullets: string[];
  notes: string;
}

export interface OfficeSlideContentDto {
  slides: SlideItemDto[];
}

export interface OfficeDocumentResponse {
  nodeId: string;
  name: string;
  mimeType: string;
  format: OfficeFormat;
  sizeBytes: number;
  updatedAt: string;
  etag: string | null;
  doc: OfficeDocContentDto | null;
  sheet: OfficeSheetContentDto | null;
  slide: OfficeSlideContentDto | null;
}

export interface SaveOfficeDocumentPayload {
  format: OfficeFormat;
  expectedUpdatedAt: string | null;
  doc?: OfficeDocContentDto | null;
  sheet?: OfficeSheetContentDto | null;
  slide?: OfficeSlideContentDto | null;
}
