import { useState, useEffect } from 'react';
import { formatNumber, formatCurrency, formatDuration, formatTokens } from '../utils/formatters.js';

export default function SessionMetrics({ sessionId, startTime }) {
  const [metrics, setMetrics] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cost: 0,
    duration: 0,
  });

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now - startTime) / 1000);
      setMetrics((prev) => ({ ...prev, duration }));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Esta função será chamada quando tokens forem atualizados
  const updateMetrics = (inputTokens, outputTokens, cost) => {
    setMetrics((prev) => ({
      ...prev,
      inputTokens: prev.inputTokens + inputTokens,
      outputTokens: prev.outputTokens + outputTokens,
      totalTokens: prev.totalTokens + inputTokens + outputTokens,
      cost: prev.cost + cost,
    }));
  };

  // Expor função para atualização externa
  useEffect(() => {
    if (window.updateSessionMetrics) {
      window.updateSessionMetrics = updateMetrics;
    } else {
      window.updateSessionMetrics = updateMetrics;
    }
  }, []);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Métricas da Sessão</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-gray-500">Input Tokens</p>
          <p className="text-lg font-bold text-gray-900">{formatTokens(metrics.inputTokens)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Output Tokens</p>
          <p className="text-lg font-bold text-gray-900">{formatTokens(metrics.outputTokens)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Tokens</p>
          <p className="text-lg font-bold text-indigo-600">{formatTokens(metrics.totalTokens)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Duração</p>
          <p className="text-lg font-bold text-gray-900">{formatDuration(metrics.duration)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Custo Estimado</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.cost)}</p>
        </div>
      </div>
    </div>
  );
}

