-- Inserir preços padrão da OpenAI
INSERT INTO pricing_config (model, input_price_per_million, output_price_per_million, is_active)
VALUES 
    ('gpt-4o-mini-realtime-preview', 0.15, 0.60, true)
ON CONFLICT (model) DO NOTHING;

-- Inserir planos padrão
INSERT INTO user_plans (name, monthly_token_limit, monthly_session_limit, cost_per_token, is_active)
VALUES 
    ('Free', 10000, 10, 0, true),
    ('Basic', 100000, 100, 0.000001, true),
    ('Premium', NULL, NULL, 0.0000008, true)
ON CONFLICT DO NOTHING;

