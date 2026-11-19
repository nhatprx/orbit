export type CloudCategory =
  | 'all'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'markdown'
  | 'starred'
  | 'trash';

export type CloudFileKind = 'folder' | 'doc' | 'sheet' | 'slide' | 'markdown';

export interface CloudFileItem {
  id: string;
  name: string;
  kind: CloudFileKind;
  size: string;
  owner: string;
  updatedAt: string;
  starred: boolean;
  trashed: boolean;
  preview: string;
}

export interface CreateCloudFilePayload {
  name: string;
  kind: CloudFileKind;
}
