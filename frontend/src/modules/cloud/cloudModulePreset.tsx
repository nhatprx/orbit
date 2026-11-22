import type { CloudView, DocumentTemplateType } from '../../types/cloud.types';

export type OfficeModuleKey = 'docs' | 'sheets' | 'slides';
export type CloudModulePreset = 'cloud' | OfficeModuleKey;

export interface OfficeModuleConfig {
  id: OfficeModuleKey;
  view: CloudView;
  title: string;
  newLabel: string;
  defaultTemplate: DocumentTemplateType;
  emptyTitle: string;
  emptyHint: string;
}

const OFFICE_MODULES: Record<OfficeModuleKey, OfficeModuleConfig> = {
  docs: {
    id: 'docs',
    view: 'DOCS',
    title: 'Documents',
    newLabel: 'New Doc',
    defaultTemplate: 'DOCX',
    emptyTitle: 'No documents in this scope',
    emptyHint: 'Create a new .docx, .md, or .txt document or upload files to get started.',
  },
  sheets: {
    id: 'sheets',
    view: 'SHEETS',
    title: 'Spreadsheets',
    newLabel: 'New Sheet',
    defaultTemplate: 'XLSX',
    emptyTitle: 'No spreadsheets in this scope',
    emptyHint: 'Create a new .xlsx workbook or upload .xlsx / .csv files to get started.',
  },
  slides: {
    id: 'slides',
    view: 'SLIDES',
    title: 'Presentations',
    newLabel: 'New Slide',
    defaultTemplate: 'PPTX',
    emptyTitle: 'No presentations in this scope',
    emptyHint: 'Create a new .pptx presentation deck or upload slide files to get started.',
  },
};

export function getOfficeModuleConfig(module: OfficeModuleKey): OfficeModuleConfig {
  return OFFICE_MODULES[module];
}
