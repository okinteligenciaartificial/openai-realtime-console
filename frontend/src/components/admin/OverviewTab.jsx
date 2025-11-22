import { useState } from 'react';
import { useAdminStats } from '../../hooks/useAdmin.js';
import StatsCard from './StatsCard.jsx';
import { formatNumber, formatCurrency } from '../../utils/formatters.js';

export default function OverviewTab() {
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const { overview, topUsers, costs, usage, loading, error } = useAdminStats(
    dateRange.start || null,
    dateRange.end || null
  );

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Erro ao carregar estatísticas: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de Data */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value || null })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value || null })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={() => setDateRange({ start: null, end: null })}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Usuários"
          value={formatNumber(overview?.total_users || overview?.totalUsers || 0)}
          subtitle={`${overview?.active_users || overview?.activeUsers || 0} ativos`}
          color="blue"
        />
        <StatsCard
          title="Total de Sessões"
          value={formatNumber(overview?.total_sessions || overview?.totalSessions || 0)}
          color="indigo"
        />
        <StatsCard
          title="Total de Tokens"
          value={formatNumber(overview?.total_tokens || overview?.totalTokens || 0)}
          color="purple"
        />
        <StatsCard
          title="Custo Total"
          value={formatCurrency(parseFloat(overview?.total_cost || overview?.totalCost || 0))}
          color="green"
        />
      </div>

      {/* Top Usuários */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top 10 Usuários por Uso</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessões</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Nenhum dado disponível
                  </td>
                </tr>
              ) : (
                topUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(user.session_count)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(user.total_tokens)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(parseFloat(user.total_cost))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico de Custos (simplificado) */}
      {costs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Custos por Período</h3>
          <div className="space-y-2">
            {costs.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(item.period).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {formatNumber(item.session_count)} sessões
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(parseFloat(item.total_cost))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

