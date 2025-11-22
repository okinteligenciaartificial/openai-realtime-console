import { useState, useEffect } from 'react';

export default function PlanModal({ plan, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    monthly_token_limit: '',
    monthly_session_limit: '',
    cost_per_token: '0',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        monthly_token_limit: plan.monthly_token_limit || '',
        monthly_session_limit: plan.monthly_session_limit || '',
        cost_per_token: plan.cost_per_token || '0',
        is_active: plan.is_active !== undefined ? plan.is_active : true,
      });
    }
  }, [plan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        monthly_token_limit: formData.monthly_token_limit ? parseInt(formData.monthly_token_limit) : null,
        monthly_session_limit: formData.monthly_session_limit ? parseInt(formData.monthly_session_limit) : null,
        cost_per_token: parseFloat(formData.cost_per_token),
        is_active: formData.is_active,
      };
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar plano');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {plan ? 'Editar Plano' : 'Criar Plano'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Tokens/Mês (deixe vazio para ilimitado)
            </label>
            <input
              type="number"
              value={formData.monthly_token_limit}
              onChange={(e) => setFormData({ ...formData, monthly_token_limit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: 100000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Sessões/Mês (deixe vazio para ilimitado)
            </label>
            <input
              type="number"
              value={formData.monthly_session_limit}
              onChange={(e) => setFormData({ ...formData, monthly_session_limit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: 100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custo por Token</label>
            <input
              type="number"
              step="0.00000001"
              required
              value={formData.cost_per_token}
              onChange={(e) => setFormData({ ...formData, cost_per_token: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {plan && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Plano ativo</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

