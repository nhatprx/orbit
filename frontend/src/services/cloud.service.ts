import { INITIAL_CLOUD_FILES } from '../mocks/cloud.mock';
import type {
  CloudCategory,
  CloudFileItem,
  CreateCloudFilePayload,
} from '../types/cloud.types';

export interface ICloudFilesService {
  listFiles(category: CloudCategory, query?: string, limit?: number): Promise<CloudFileItem[]>;
  toggleStar(id: string): Promise<void>;
  setTrashed(id: string, trashed: boolean): Promise<void>;
  createItem(payload: CreateCloudFilePayload, owner: string): Promise<CloudFileItem>;
}

let store: CloudFileItem[] = [...INITIAL_CLOUD_FILES];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockCloudFilesService implements ICloudFilesService {
  async listFiles(
    category: CloudCategory,
    query = '',
    limit = 50
  ): Promise<CloudFileItem[]> {
    await delay(80);
    const q = query.trim().toLowerCase();
    return store
      .filter((item) => {
        if (category === 'trash') return item.trashed;
        if (item.trashed) return false;
        if (category === 'all') return true;
        if (category === 'starred') return item.starred;
        return item.kind === category;
      })
      .filter((item) => !q || item.name.toLowerCase().includes(q))
      .slice(0, limit);
  }

  async toggleStar(id: string): Promise<void> {
    store = store.map((item) =>
      item.id === id ? { ...item, starred: !item.starred } : item
    );
  }

  async setTrashed(id: string, trashed: boolean): Promise<void> {
    store = store.map((item) =>
      item.id === id ? { ...item, trashed } : item
    );
  }

  async createItem(
    payload: CreateCloudFilePayload,
    owner: string
  ): Promise<CloudFileItem> {
    await delay(100);
    const created: CloudFileItem = {
      id: `cf_${Date.now()}`,
      name: payload.name.trim(),
      kind: payload.kind,
      size: payload.kind === 'folder' ? '0 items' : '4 KB',
      owner,
      updatedAt: 'Just now',
      starred: false,
      trashed: false,
      preview: `Created new ${payload.kind} item "${payload.name.trim()}" in Orbit Cloud Files.`,
    };
    store = [created, ...store];
    return created;
  }
}

export const cloudFilesService: ICloudFilesService = new MockCloudFilesService();
