import { useState, useEffect } from 'react';
import { plansAPI } from '../../services/api.js';
import DataTable from './DataTable.jsx';
import PlanModal from './PlanModal.jsx';
import { formatNumber, formatCurrency } from '../../utils/formatters.js';

export default function PlansTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await plansAPI.list();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setShowModal(true);
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedPlan) {
        await plansAPI.update(selectedPlan.id, data);
      } else {
        await plansAPI.create(
          data.name,
          data.monthly_token_limit,
          data.monthly_session_limit,
          data.cost_per_token
        );
      }
      await loadPlans();
      setShowModal(false);
    } catch (error) {
      throw error;
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      await plansAPI.update(plan.id, { is_active: !plan.is_active });
      await loadPlans();
    } catch (error) {
      alert('Erro ao atualizar plano');
    }
  };

  const columns = [
    { key: 'name', label: 'Nome', sortable: true },
    {
      key: 'monthly_token_limit',
      label: 'Limite Tokens',
      render: (value) => (value ? formatNumber(value) : 'Ilimitado'),
    },
    {
      key: 'monthly_session_limit',
      label: 'Limite Sessões',
      render: (value) => (value ? formatNumber(value) : 'Ilimitado'),
    },
    {
      key: 'cost_per_token',
      label: 'Custo por Token',
      render: (value) => formatCurrency(parseFloat(value)),
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
          {value ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciamento de Planos</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          + Novo Plano
        </button>
      </div>

      <DataTable
        columns={columns}
        data={plans}
        loading={loading}
        actions={(plan) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(plan)}
              className="text-indigo-600 hover:text-indigo-900 text-sm"
            >
              Editar
            </button>
            <button
              onClick={() => handleToggleActive(plan)}
              className={`text-sm ${
                plan.is_active
                  ? 'text-red-600 hover:text-red-900'
                  : 'text-green-600 hover:text-green-900'
              }`}
            >
              {plan.is_active ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        )}
      />

      {showModal && (
        <PlanModal
          plan={selectedPlan}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

