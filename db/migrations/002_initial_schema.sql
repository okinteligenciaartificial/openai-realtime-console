-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Tabela de usuários (alunos e professores)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    is_active BOOLEAN DEFAULT true,
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de professores
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_code VARCHAR(100) UNIQUE NOT NULL,
    image_url VARCHAR(500),
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de planos de uso
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    monthly_token_limit INTEGER, -- NULL = ilimitado
    monthly_session_limit INTEGER, -- NULL = ilimitado
    cost_per_token DECIMAL(10, 8) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES user_plans(id) ON DELETE RESTRICT,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini-realtime-preview',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de métricas de sessão
CREATE TABLE IF NOT EXISTS session_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_input DECIMAL(10, 6) DEFAULT 0,
    cost_output DECIMAL(10, 6) DEFAULT 0,
    cost_total DECIMAL(10, 6) DEFAULT 0,
    pricing_model JSONB,
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id)
);

-- Tabela de eventos de uso
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    event_data JSONB,
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configuração de preços
CREATE TABLE IF NOT EXISTS pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(100) UNIQUE NOT NULL,
    input_price_per_million DECIMAL(10, 2) NOT NULL,
    output_price_per_million DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de rastreamento de limites mensais
CREATE TABLE IF NOT EXISTS usage_limits_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- formato 'YYYY-MM'
    tokens_used INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    additional_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year_month)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_metrics_session_id ON session_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_session_id ON usage_events(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_teacher_id ON user_subscriptions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active ON user_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_limits_tracking_user_id ON usage_limits_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_limits_tracking_year_month ON usage_limits_tracking(year_month);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_teacher_code ON teachers(teacher_code);

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View para resumo de uso por usuário
CREATE OR REPLACE VIEW user_usage_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    COUNT(DISTINCT s.id) as total_sessions,
    COALESCE(SUM(s.duration_seconds), 0) as total_duration_seconds,
    COALESCE(SUM(sm.input_tokens), 0) as total_input_tokens,
    COALESCE(SUM(sm.output_tokens), 0) as total_output_tokens,
    COALESCE(SUM(sm.total_tokens), 0) as total_tokens,
    COALESCE(SUM(sm.cost_total), 0) as total_cost,
    MIN(s.start_time) as first_session,
    MAX(s.end_time) as last_session
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.status = 'completed'
LEFT JOIN session_metrics sm ON s.id = sm.session_id
GROUP BY u.id, u.email, u.name;

-- View para detalhes de sessões
CREATE OR REPLACE VIEW session_details AS
SELECT 
    s.id,
    s.session_id,
    s.user_id,
    u.email,
    u.name,
    s.model,
    s.start_time,
    s.end_time,
    s.duration_seconds,
    s.status,
    COALESCE(sm.input_tokens, 0) as input_tokens,
    COALESCE(sm.output_tokens, 0) as output_tokens,
    COALESCE(sm.total_tokens, 0) as total_tokens,
    COALESCE(sm.cost_input, 0) as cost_input,
    COALESCE(sm.cost_output, 0) as cost_output,
    COALESCE(sm.cost_total, 0) as cost_total
FROM sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN session_metrics sm ON s.id = sm.session_id;

-- View para resumo de alunos por professor
CREATE OR REPLACE VIEW teacher_students_summary AS
SELECT 
    t.id as teacher_id,
    t.teacher_code,
    u.name as teacher_name,
    COUNT(DISTINCT us.user_id) as total_students,
    COUNT(DISTINCT CASE WHEN us.is_active THEN us.user_id END) as active_students
FROM teachers t
JOIN users u ON t.user_id = u.id
LEFT JOIN user_subscriptions us ON t.id = us.teacher_id
GROUP BY t.id, t.teacher_code, u.name;

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON user_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_metrics_updated_at BEFORE UPDATE ON session_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_limits_tracking_updated_at BEFORE UPDATE ON usage_limits_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

