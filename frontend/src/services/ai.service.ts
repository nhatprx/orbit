import type { AiMessage, AiModelId, AiThread } from '../types/ai.types';

export interface IAiChatService {
  listThreads(): Promise<AiThread[]>;
  createThread(model: AiModelId): Promise<AiThread>;
  listMessages(threadId: string): Promise<AiMessage[]>;
  sendPrompt(threadId: string, prompt: string, model: AiModelId): Promise<AiMessage>;
}

let threads: AiThread[] = [
  { id: 'ai_01', title: 'Orbit 10k CCU Checklist', model: 'orbit-pro', updatedAt: '10m ago' },
  { id: 'ai_02', title: 'Spring Boot Virtual Threads', model: 'orbit-coder', updatedAt: '2h ago' },
];

let messages: AiMessage[] = [
  {
    id: 'aim_01',
    threadId: 'ai_01',
    role: 'user',
    content: 'Summarize the core infrastructure stack for Orbit.',
    timestamp: '10:10 AM',
  },
  {
    id: 'aim_02',
    threadId: 'ai_01',
    role: 'assistant',
    content:
      'Orbit targets 10,000+ CCU using:\n- Frontend: React + TypeScript + Tailwind CSS (Outfit font, 0px square borders)\n- Backend: Spring Boot 3.4 (Java 21 Virtual Threads)\n- Database: AWS RDS PostgreSQL (Primary + Read Replicas)\n- Cache & Sessions: AWS ElastiCache Redis\n- Deployment: Immutable Docker containers on AWS',
    timestamp: '10:10 AM',
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildReply(prompt: string, model: AiModelId): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('ponytail') || lower.includes('loc')) {
    return `[${model}] Ponytail enforces < 200 LOC per source file, zero emojis, and strict 0px square borders across frontend/, backend/, and ponytail/.`;
  }
  if (lower.includes('project') || lower.includes('module')) {
    return `[${model}] Each Orbit Project can independently toggle Git, Mail, Cloud Files, Community Chat, Docs, Sheets, Slides, and Markdown under Project Settings.`;
  }
  return `[${model}] Received your request: "${prompt.trim()}". Workspace context is synced and ready for follow-up commands.`;
}

class MockAiChatService implements IAiChatService {
  async listThreads(): Promise<AiThread[]> {
    return [...threads];
  }

  async createThread(model: AiModelId): Promise<AiThread> {
    const created: AiThread = {
      id: `ai_${Date.now()}`,
      title: 'New AI Session',
      model,
      updatedAt: 'Just now',
    };
    threads = [created, ...threads];
    return created;
  }

  async listMessages(threadId: string): Promise<AiMessage[]> {
    return messages.filter((m) => m.threadId === threadId);
  }

  async sendPrompt(
    threadId: string,
    prompt: string,
    model: AiModelId
  ): Promise<AiMessage> {
    const userMsg: AiMessage = {
      id: `aim_u_${Date.now()}`,
      threadId,
      role: 'user',
      content: prompt.trim(),
      timestamp: 'Just now',
    };
    messages = [...messages, userMsg];
    threads = threads.map((t) =>
      t.id === threadId && t.title === 'New AI Session'
        ? { ...t, title: prompt.trim().slice(0, 32), updatedAt: 'Just now' }
        : t
    );

    await delay(260);
    const reply: AiMessage = {
      id: `aim_a_${Date.now() + 1}`,
      threadId,
      role: 'assistant',
      content: buildReply(prompt, model),
      timestamp: 'Just now',
    };
    messages = [...messages, reply];
    return reply;
  }
}

export const aiChatService: IAiChatService = new MockAiChatService();
