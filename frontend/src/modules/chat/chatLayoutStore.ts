import { useSyncExternalStore } from 'react';

export type ActiveChannelMode = 'text' | 'voice' | 'none';

interface ChatLayoutState {
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  showVoiceChat: boolean;
  activeChannelMode: ActiveChannelMode;
}

let state: ChatLayoutState = {
  showLeftSidebar: true,
  showRightSidebar: true,
  showVoiceChat: false,
  activeChannelMode: 'text',
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const chatLayoutStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): ChatLayoutState {
    return state;
  },
  toggleLeftSidebar() {
    state = { ...state, showLeftSidebar: !state.showLeftSidebar };
    emit();
  },
  toggleRightSidebar() {
    state = { ...state, showRightSidebar: !state.showRightSidebar };
    emit();
  },
  setRightSidebar(open: boolean) {
    if (state.showRightSidebar === open) return;
    state = { ...state, showRightSidebar: open };
    emit();
  },
  toggleVoiceChat() {
    state = { ...state, showVoiceChat: !state.showVoiceChat };
    emit();
  },
  setVoiceChat(open: boolean) {
    if (state.showVoiceChat === open) return;
    state = { ...state, showVoiceChat: open };
    emit();
  },
  setActiveChannelMode(mode: ActiveChannelMode) {
    if (state.activeChannelMode === mode) return;
    state = { ...state, activeChannelMode: mode };
    emit();
  },
  toggleActiveRightPanel() {
    if (state.activeChannelMode === 'voice') {
      chatLayoutStore.toggleVoiceChat();
    } else if (state.activeChannelMode === 'text') {
      chatLayoutStore.toggleRightSidebar();
    }
  },
};

export function useChatLayout() {
  const snapshot = useSyncExternalStore(
    chatLayoutStore.subscribe,
    chatLayoutStore.getSnapshot,
    chatLayoutStore.getSnapshot
  );
  const isRightPanelOpen =
    snapshot.activeChannelMode === 'voice'
      ? snapshot.showVoiceChat
      : snapshot.activeChannelMode === 'text'
        ? snapshot.showRightSidebar
        : false;
  const rightPanelLabel = snapshot.activeChannelMode === 'voice' ? 'voice chat' : 'channel info';

  return {
    ...snapshot,
    isRightPanelOpen,
    rightPanelLabel,
    toggleLeftSidebar: chatLayoutStore.toggleLeftSidebar,
    toggleRightSidebar: chatLayoutStore.toggleRightSidebar,
    setRightSidebar: chatLayoutStore.setRightSidebar,
    toggleVoiceChat: chatLayoutStore.toggleVoiceChat,
    setVoiceChat: chatLayoutStore.setVoiceChat,
    setActiveChannelMode: chatLayoutStore.setActiveChannelMode,
    toggleActiveRightPanel: chatLayoutStore.toggleActiveRightPanel,
  };
}
