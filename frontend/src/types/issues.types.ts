export type IssueType = 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK';

export type IssueStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface IssueDto {
  id: string;
  workspaceId: string;
  projectId: string;
  projectName: string;
  issueNumber: number;
  issueKey: string;
  type: IssueType;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints: number | null;
  sprintId: string | null;
  sprintName: string | null;
  parentId: string | null;
  parentKey: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  reporterId: string;
  reporterName: string;
  labels: string[];
  dueDate: string | null;
  subtaskCount: number;
  completedSubtaskCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCommentDto {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueActivityDto {
  id: string;
  issueId: string;
  actorId: string;
  actorName: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface IssueDetailDto {
  issue: IssueDto;
  subtasks: IssueDto[];
  comments: IssueCommentDto[];
  activities: IssueActivityDto[];
}

export interface SprintDto {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  totalIssues: number;
  completedIssues: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface IssueFilterParams {
  type?: IssueType | 'ALL';
  status?: IssueStatus | 'ALL';
  priority?: IssuePriority | 'ALL';
  sprintId?: string | 'ALL' | 'BACKLOG';
  parentId?: string;
  assigneeId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CreateIssueRequest {
  type: IssueType;
  title: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  storyPoints?: number | null;
  sprintId?: string | null;
  parentId?: string | null;
  assigneeId?: string | null;
  labels?: string[];
  dueDate?: string | null;
}

export interface UpdateIssueRequest {
  type?: IssueType;
  title?: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  storyPoints?: number | null;
  clearStoryPoints?: boolean;
  sprintId?: string | null;
  clearSprint?: boolean;
  parentId?: string | null;
  clearParent?: boolean;
  assigneeId?: string | null;
  clearAssignee?: boolean;
  labels?: string[];
  dueDate?: string | null;
  clearDueDate?: boolean;
}

export interface CreateIssueCommentRequest {
  body: string;
}

export interface CreateSprintRequest {
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateSprintRequest {
  name?: string;
  goal?: string | null;
  status?: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  moveIncompleteToBacklog?: boolean;
  clearStartDate?: boolean;
  clearEndDate?: boolean;
}

export interface ProjectIssueSummaryDto {
  projectId: string;
  projectName: string;
  projectSlug: string;
  totalIssues: number;
  backlogCount: number;
  todoCount: number;
  inProgressCount: number;
  inReviewCount: number;
  doneCount: number;
  criticalCount: number;
  activeSprintName: string | null;
  completionPercent: number;
}

export interface WorkspaceIssuePortfolioDto {
  workspaceId: string;
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  doneIssues: number;
  criticalIssues: number;
  activeSprintsCount: number;
  projects: ProjectIssueSummaryDto[];
  recentIssues: IssueDto[];
}
