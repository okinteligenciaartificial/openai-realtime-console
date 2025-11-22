// Preços padrão da OpenAI Realtime API (por 1 milhão de tokens)
export const DEFAULT_PRICING = {
  'gpt-4o-mini-realtime-preview': {
    input: 0.15,  // $0.15 por 1M tokens input
    output: 0.60, // $0.60 por 1M tokens output
  },
};

// Planos padrão
export const DEFAULT_PLANS = [
  {
    name: 'Free',
    monthly_token_limit: 10000,
    monthly_session_limit: 10,
    cost_per_token: 0,
  },
  {
    name: 'Basic',
    monthly_token_limit: 100000,
    monthly_session_limit: 100,
    cost_per_token: 0.000001,
  },
  {
    name: 'Premium',
    monthly_token_limit: null, // ilimitado
    monthly_session_limit: null, // ilimitado
    cost_per_token: 0.0000008,
  },
];

