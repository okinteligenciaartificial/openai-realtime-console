import { useState, useEffect } from 'react';
import { useLimits } from '../hooks/useMetrics.js';
import { formatNumber, calculatePercentage } from '../utils/formatters.js';

export default function LimitAlerts({ onLimitExceeded }) {
  const { limits, loading } = useLimits();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (loading || !limits?.subscription) return;

    const subscription = limits.subscription;
    const usage = limits.usage;
    const plan = subscription.plan_name;
    const tokenLimit = subscription.monthly_token_limit;
    const sessionLimit = subscription.monthly_session_limit;
    const newAlerts = [];

    // Verificar limite de tokens
    if (tokenLimit !== null) {
      const tokenUsage = usage.tokens || 0;
      const tokenPercentage = calculatePercentage(tokenUsage, tokenLimit);

      if (tokenPercentage >= 100) {
        newAlerts.push({
          type: 'error',
          message: 'Limite de tokens excedido! Você não pode iniciar novas sessões.',
          action: 'upgrade',
        });
        if (onLimitExceeded) onLimitExceeded('tokens');
      } else if (tokenPercentage >= 90) {
        newAlerts.push({
          type: 'warning',
          message: `Atenção: Você usou ${tokenPercentage}% do seu limite de tokens (${formatNumber(tokenUsage)}/${formatNumber(tokenLimit)})`,
        });
      } else if (tokenPercentage >= 80) {
        newAlerts.push({
          type: 'info',
          message: `Você usou ${tokenPercentage}% do seu limite de tokens`,
        });
      }
    }

    // Verificar limite de sessões
    if (sessionLimit !== null) {
      const sessionUsage = usage.sessions || 0;
      const sessionPercentage = calculatePercentage(sessionUsage, sessionLimit);

      if (sessionPercentage >= 100) {
        newAlerts.push({
          type: 'error',
          message: 'Limite de sessões excedido! Você não pode iniciar novas sessões.',
          action: 'upgrade',
        });
        if (onLimitExceeded) onLimitExceeded('sessions');
      } else if (sessionPercentage >= 90) {
        newAlerts.push({
          type: 'warning',
          message: `Atenção: Você usou ${sessionPercentage}% do seu limite de sessões (${sessionUsage}/${sessionLimit})`,
        });
      }
    }

    setAlerts(newAlerts);
  }, [limits, loading, onLimitExceeded]);

  if (loading || alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-3 rounded-md ${
            alert.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : alert.type === 'warning'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{alert.message}</p>
            {alert.action === 'upgrade' && (
              <button className="ml-4 text-sm font-semibold underline">
                Fazer upgrade
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

