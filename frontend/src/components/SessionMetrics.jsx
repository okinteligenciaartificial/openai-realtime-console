import { useState, useEffect } from 'react';
import { formatNumber, formatCurrency, formatDuration, formatTokens } from '../utils/formatters.js';
import { sessionsAPI } from '../services/api/index.js';

export default function SessionMetrics({ sessionId, startTime }) {
  const [metrics, setMetrics] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cost: 0,
    duration: 0,
  });

  // Atualizar duração a cada segundo
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now - startTime) / 1000);
      setMetrics((prev) => ({ ...prev, duration }));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Buscar métricas do backend periodicamente
  useEffect(() => {
    if (!sessionId) {
      console.log('[SessionMetrics] No sessionId provided');
      return;
    }

    const fetchMetrics = async () => {
      try {
        console.log('[SessionMetrics] Fetching metrics for sessionId:', sessionId);
        const session = await sessionsAPI.get(sessionId);
        console.log('[SessionMetrics] Session data received:', {
          sessionId: session?.session_id,
          inputTokens: session?.input_tokens,
          outputTokens: session?.output_tokens,
          totalTokens: session?.total_tokens,
          costTotal: session?.cost_total,
          fullSession: session,
        });
        
        if (session) {
          // A view session_details retorna as métricas diretamente na sessão
          const newMetrics = {
            inputTokens: session.input_tokens || 0,
            outputTokens: session.output_tokens || 0,
            totalTokens: session.total_tokens || 0,
            cost: parseFloat(session.cost_total || 0),
          };
          
          console.log('[SessionMetrics] Updating metrics:', newMetrics);
          setMetrics((prev) => ({
            ...prev,
            ...newMetrics,
          }));
        } else {
          console.warn('[SessionMetrics] No session data received');
        }
      } catch (err) {
        console.error('[SessionMetrics] Error fetching session metrics:', {
          sessionId,
          error: err.message,
          errorDetails: err,
        });
      }
    };

    // Buscar imediatamente
    fetchMetrics();

    // Buscar a cada 2 segundos para atualizar em tempo real
    const interval = setInterval(fetchMetrics, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

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

