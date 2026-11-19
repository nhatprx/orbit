export type AiModelId = 'orbit-pro' | 'orbit-fast' | 'orbit-coder';

export interface AiThread {
  id: string;
  title: string;
  model: AiModelId;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
