import { useState } from 'react';
import { useAdminSubscriptions } from '../../hooks/useAdmin.js';
import DataTable from './DataTable.jsx';
import SubscriptionModal from './SubscriptionModal.jsx';
import { formatDate } from '../../utils/formatters.js';

export default function SubscriptionsTab() {
  const [filters, setFilters] = useState({});
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { subscriptions, loading, pagination, loadSubscriptions, createSubscription, updateSubscription } = useAdminSubscriptions(filters);

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
    { key: 'plan_name', label: 'Plano' },
    {
      key: 'teacher_code',
      label: 'Professor',
      render: (value) => value || '-',
    },
    {
      key: 'start_date',
      label: 'Início',
      render: (value) => formatDate(value),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
  ];

  const handleCreate = () => {
    setSelectedSubscription(null);
    setShowModal(true);
  };

  const handleEdit = (subscription) => {
    setSelectedSubscription(subscription);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    if (selectedSubscription) {
      await updateSubscription(selectedSubscription.id, data);
    } else {
      await createSubscription(data.user_id, data.plan_id, data.teacher_id || null);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciamento de Assinaturas</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          + Nova Assinatura
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              onChange={(e) =>
                setFilters({
                  ...filters,
                  is_active: e.target.value === '' ? undefined : e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        pagination={pagination}
        onPageChange={loadSubscriptions}
        actions={(subscription) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(subscription)}
              className="text-indigo-600 hover:text-indigo-900 text-sm"
            >
              Editar
            </button>
          </div>
        )}
      />

      {showModal && (
        <SubscriptionModal
          subscription={selectedSubscription}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

