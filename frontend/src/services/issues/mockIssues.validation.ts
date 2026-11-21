import { MOCK_ISSUE_USERS } from '../../mocks/issues.mock';
import { ApiError } from '../workspace/httpClient';

const MAX_TITLE_LENGTH = 255;
const MAX_SPRINT_NAME_LENGTH = 120;
const MAX_COMMENT_LENGTH = 4000;

export function validationError(message: string): ApiError {
  return new ApiError(400, 'VALIDATION_ERROR', message);
}

export function notFoundError(code: string, message: string): ApiError {
  return new ApiError(404, code, message);
}

export function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw validationError('Issue title is required.');
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw validationError(`Issue title cannot exceed ${MAX_TITLE_LENGTH} characters.`);
  }
  return trimmed;
}

export function assertValidSprintName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw validationError('Sprint name is required.');
  if (trimmed.length > MAX_SPRINT_NAME_LENGTH) {
    throw validationError(`Sprint name cannot exceed ${MAX_SPRINT_NAME_LENGTH} characters.`);
  }
  return trimmed;
}

export function assertValidCommentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) throw validationError('Comment body is required.');
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw validationError(`Comment body cannot exceed ${MAX_COMMENT_LENGTH} characters.`);
  }
  return trimmed;
}

export function assertValidStoryPoints(points: number | null | undefined): number | null {
  if (points === undefined || points === null) return null;
  if (!Number.isInteger(points) || points < 0 || points > 100) {
    throw validationError('Story points must be an integer between 0 and 100.');
  }
  return points;
}

export function assertValidDateRange(startDate?: string | null, endDate?: string | null): void {
  if (startDate && endDate && endDate < startDate) {
    throw validationError('Sprint end date must be on or after the start date.');
  }
}

export function normalizeLabels(labels?: string[]): string[] {
  if (!labels) return [];
  const unique = new Set<string>();
  for (const item of labels) {
    const clean = item.trim();
    if (clean) unique.add(clean);
  }
  return Array.from(unique).slice(0, 12);
}

export function resolveMockUserName(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return MOCK_ISSUE_USERS.find((u) => u.id === userId)?.name ?? userId;
}
