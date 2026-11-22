import type { PageResponse } from '../types/workspace.types';
import { apiRequest } from './workspace/httpClient';

export interface NotificationDto {
  id: string;
  type: 'ISSUE_ASSIGNED' | 'ISSUE_MENTION';
  title: string;
  message: string;
  actorId: string | null;
  actorName: string | null;
  workspaceId: string;
  projectId: string;
  issueId: string;
  issueKey: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationInboxResponse {
  page: PageResponse<NotificationDto>;
  unreadCount: number;
}

export interface NotificationService {
  list(page?: number, size?: number): Promise<NotificationInboxResponse>;
  markRead(notificationId: string): Promise<void>;
  markAllRead(): Promise<number>;
}

export const notificationService: NotificationService = {
  list(page = 0, size = 20) {
    return apiRequest<NotificationInboxResponse>('GET', '/api/v1/notifications', { query: { page, size } });
  },
  markRead(notificationId) {
    return apiRequest<void>('PUT', `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`);
  },
  markAllRead() {
    return apiRequest<number>('PUT', '/api/v1/notifications/read-all');
  },
};
