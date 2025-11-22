import { useState } from 'react';
import { useAdminSessions } from '../../hooks/useAdmin.js';
import DataTable from './DataTable.jsx';
import { formatDate, formatDuration, formatNumber, formatCurrency } from '../../utils/formatters.js';

export default function SessionsTab() {
  const [filters, setFilters] = useState({});
  const { sessions, loading, pagination, loadSessions } = useAdminSessions(filters);

  const columns = [
    {
      key: 'user_name',
      label: 'Usuário',
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'start_time',
      label: 'Data/Hora',
      render: (value) => formatDate(value),
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            value === 'completed'
              ? 'bg-green-100 text-green-800'
              : value === 'active'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'duration_seconds',
      label: 'Duração',
      render: (value) => formatDuration(value || 0),
    },
    {
      key: 'total_tokens',
      label: 'Tokens',
      render: (value) => formatNumber(value || 0),
      sortable: true,
    },
    {
      key: 'cost_total',
      label: 'Custo',
      render: (value) => formatCurrency(parseFloat(value || 0)),
      sortable: true,
    },
  ];

  const handleExport = async () => {
    try {
      // Implementar exportação
      alert('Funcionalidade de exportação em desenvolvimento');
    } catch (error) {
      alert('Erro ao exportar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciamento de Sessões</h2>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Exportar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="active">Ativa</option>
              <option value="completed">Completa</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
            <select
              onChange={(e) => setFilters({ ...filters, model: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="gpt-4o-mini-realtime-preview">gpt-4o-mini-realtime-preview</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        pagination={pagination}
        onPageChange={loadSessions}
      />
    </div>
  );
}

