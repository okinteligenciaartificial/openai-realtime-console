import { query } from './database.js';
import { DEFAULT_PRICING } from '../utils/constants.js';

/**
 * Obtém preços para um modelo específico
 */
export async function getPricingForModel(model) {
  try {
    const result = await query(
      'SELECT * FROM pricing_config WHERE model = $1 AND is_active = true ORDER BY effective_from DESC LIMIT 1',
      [model]
    );

    if (result.rows.length > 0) {
      const pricing = result.rows[0];
      return {
        input: parseFloat(pricing.input_price_per_million),
        output: parseFloat(pricing.output_price_per_million),
      };
    }

    // Fallback para preços padrão
    return DEFAULT_PRICING[model] || DEFAULT_PRICING['gpt-4o-mini-realtime-preview'];
  } catch (error) {
    console.error('Error getting pricing for model:', error);
    return DEFAULT_PRICING[model] || DEFAULT_PRICING['gpt-4o-mini-realtime-preview'];
  }
}

/**
 * Calcula o custo baseado em tokens e preços
 */
export function calculateCost(inputTokens, outputTokens, pricing) {
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    input: parseFloat(inputCost.toFixed(6)),
    output: parseFloat(outputCost.toFixed(6)),
    total: parseFloat(totalCost.toFixed(6)),
  };
}

/**
 * Obtém preços padrão
 */
export function getDefaultPricing() {
  return DEFAULT_PRICING;
}

