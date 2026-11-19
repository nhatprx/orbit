export interface PinnedWorkspaceItem {
  id: string;
  name: string;
  area: string;
  description: string;
  tag: string;
  updatedAt: string;
}

export interface ProfileData {
  name: string;
  username: string;
  bio: string;
  organization: string;
  location: string;
  website: string;
  joinedDate: string;
  followers: number;
  following: number;
  pinned: PinnedWorkspaceItem[];
  contributions: number[][];
}

export interface ProfileUpdatePayload {
  name: string;
  bio: string;
  organization: string;
  location: string;
  website: string;
}
