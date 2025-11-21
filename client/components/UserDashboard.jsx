import { useUserMetrics, useSessions } from '../hooks/useMetrics.js';
import { formatNumber, formatCurrency, formatDuration, formatDate } from '../utils/formatters.js';

export default function UserDashboard() {
  const { metrics, loading: metricsLoading } = useUserMetrics();
  const { sessions, loading: sessionsLoading } = useSessions(null, 10, 0);

  if (metricsLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando métricas...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total de Sessões</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatNumber(metrics?.total_sessions || 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Tempo Total</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatDuration(parseInt(metrics?.total_duration_seconds || 0))}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total de Tokens</p>
          <p className="text-3xl font-bold text-indigo-600">
            {formatNumber(metrics?.total_tokens || 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Custo Total</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(parseFloat(metrics?.total_cost || 0))}
          </p>
        </div>
      </div>

      {/* Sessões Recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Sessões Recentes</h3>
        </div>
        {sessionsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma sessão encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duração
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(session.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(session.duration_seconds || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(session.total_tokens || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(parseFloat(session.cost_total || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

