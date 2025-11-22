-- ============================================
-- TABELA DE MENSAGENS DE CONVERSA
-- ============================================

-- Tabela para armazenar todas as mensagens das conversas
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'transcription')),
    event_type VARCHAR(100), -- Tipo do evento da API Realtime (ex: conversation.item.input_audio_transcription.completed)
    event_data JSONB, -- Dados completos do evento para referência
    sequence_number INTEGER, -- Ordem da mensagem na conversa
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_attributes JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_sequence ON conversation_messages(session_id, sequence_number);

-- Comentários para documentação
COMMENT ON TABLE conversation_messages IS 'Armazena todas as mensagens das conversas em tempo real';
COMMENT ON COLUMN conversation_messages.role IS 'Papel do remetente: user (aluno), assistant (Samantha), system';
COMMENT ON COLUMN conversation_messages.content IS 'Conteúdo da mensagem (texto transcrito)';
COMMENT ON COLUMN conversation_messages.message_type IS 'Tipo da mensagem: text, audio, transcription';
COMMENT ON COLUMN conversation_messages.event_type IS 'Tipo do evento da API Realtime que gerou esta mensagem';
COMMENT ON COLUMN conversation_messages.event_data IS 'Dados completos do evento para referência e debug';
COMMENT ON COLUMN conversation_messages.sequence_number IS 'Número sequencial da mensagem na conversa (para ordenação)';

