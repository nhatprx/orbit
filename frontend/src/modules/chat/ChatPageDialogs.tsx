import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type {
  ChatChannelDto,
  CreateChatChannelRequest,
  UpdateChatChannelRequest,
} from '../../types/workspace.types';
import { ChatChannelModal } from './ChatChannelModal';
import { ChatCreateGroupModal } from './ChatCreateGroupModal';

interface ChatPageDialogsProps {
  createGroupOpen: boolean;
  onCloseCreateGroup: () => void;
  onCreateGroup: (groupName: string) => void;
  modalMode: 'create' | 'edit' | null;
  editingChannel: ChatChannelDto | null;
  targetCategory: string | null;
  onCloseChannelModal: () => void;
  onCreateChannel: (request: CreateChatChannelRequest) => Promise<void>;
  onUpdateChannel: (channelId: string, request: UpdateChatChannelRequest) => Promise<void>;
  deletingChannel: ChatChannelDto | null;
  onConfirmDeleteChannel: () => Promise<void>;
  onCloseDeleteChannel: () => void;
  deletingCategory: string | null;
  onConfirmDeleteCategory: () => Promise<void>;
  onCloseDeleteCategory: () => void;
}

export function ChatPageDialogs({
  createGroupOpen,
  onCloseCreateGroup,
  onCreateGroup,
  modalMode,
  editingChannel,
  targetCategory,
  onCloseChannelModal,
  onCreateChannel,
  onUpdateChannel,
  deletingChannel,
  onConfirmDeleteChannel,
  onCloseDeleteChannel,
  deletingCategory,
  onConfirmDeleteCategory,
  onCloseDeleteCategory,
}: ChatPageDialogsProps) {
  return (
    <>
      <ChatCreateGroupModal
        open={createGroupOpen}
        onClose={onCloseCreateGroup}
        onCreate={onCreateGroup}
      />

      <ChatChannelModal
        open={modalMode !== null}
        mode={modalMode ?? 'create'}
        initialChannel={editingChannel}
        targetCategory={targetCategory}
        onClose={onCloseChannelModal}
        onCreate={onCreateChannel}
        onUpdate={onUpdateChannel}
      />

      <ConfirmDialog
        open={deletingChannel !== null}
        title="Delete Channel"
        message={deletingChannel ? `Delete "${deletingChannel.name}"? All channel messages will be permanently removed.` : ''}
        confirmLabel="Delete Channel"
        danger
        onConfirm={onConfirmDeleteChannel}
        onClose={onCloseDeleteChannel}
      />

      <ConfirmDialog
        open={deletingCategory !== null}
        title="Delete Channel Group"
        message={deletingCategory ? `Delete "${deletingCategory}" and all sub-channels inside it?` : ''}
        confirmLabel="Delete Channel"
        danger
        onConfirm={onConfirmDeleteCategory}
        onClose={onCloseDeleteCategory}
      />
    </>
  );
}
