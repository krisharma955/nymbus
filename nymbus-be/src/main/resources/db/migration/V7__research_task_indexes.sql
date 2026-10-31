-- V7: Indexes for research task and conversation message lookup
CREATE INDEX IF NOT EXISTS ix_conversation_messages_task ON conversation_messages (research_task_id) WHERE research_task_id IS NOT NULL;
