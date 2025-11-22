-- ============================================
-- ADICIONAR CAMPOS DE CUSTO À TABELA conversation_messages
-- ============================================

-- Adicionar campos de custo e tokens
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_input DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_output DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_total DECIMAL(10, 6) DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN conversation_messages.input_tokens IS 'Número de tokens de entrada para esta mensagem';
COMMENT ON COLUMN conversation_messages.output_tokens IS 'Número de tokens de saída para esta mensagem';
COMMENT ON COLUMN conversation_messages.total_tokens IS 'Total de tokens para esta mensagem';
COMMENT ON COLUMN conversation_messages.cost_input IS 'Custo dos tokens de entrada (em USD)';
COMMENT ON COLUMN conversation_messages.cost_output IS 'Custo dos tokens de saída (em USD)';
COMMENT ON COLUMN conversation_messages.cost_total IS 'Custo total desta mensagem (em USD)';

