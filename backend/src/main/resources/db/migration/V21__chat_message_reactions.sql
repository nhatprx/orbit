CREATE TABLE chat_message_reactions (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_key VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_message_reaction UNIQUE (message_id, user_id, reaction_key)
);

CREATE INDEX idx_chat_message_reactions_message ON chat_message_reactions(message_id);
