import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { plansAPI, subscriptionsAPI, teachersAPI } from '../services/api/index.js';
import { formatNumber, formatCurrency } from '../utils/formatters.js';
import { CreditCard, Check, X, User, Calendar } from 'react-feather';

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, teachersData, subscriptionData] = await Promise.all([
        plansAPI.list(),
        teachersAPI.list(),
        subscriptionsAPI.getUserSubscription(user.id).catch(() => null),
      ]);
      setPlans(plansData || []);
      setTeachers(teachersData || []);
      setCurrentSubscription(subscriptionData);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!selectedPlan) {
      setError('Selecione um plano');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await subscriptionsAPI.create({
        plan_id: selectedPlan.id,
        teacher_id: selectedTeacher || null,
      });
      setSuccess('Assinatura criada com sucesso!');
      setShowCreateModal(false);
      setSelectedPlan(null);
      setSelectedTeacher(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Erro ao criar assinatura');
    }
  };

  const handleUpdateSubscription = async (updates) => {
    if (!currentSubscription) return;

    try {
      setError(null);
      setSuccess(null);
      await subscriptionsAPI.update(currentSubscription.id, updates);
      setSuccess('Assinatura atualizada com sucesso!');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar assinatura');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerenciar Assinatura</h2>
          <p className="text-gray-600">Escolha um plano e gerencie sua assinatura</p>
        </div>
        {!currentSubscription && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Criar Assinatura
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <X className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {currentSubscription ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Assinatura Ativa</h3>
              <p className="text-2xl font-semibold text-indigo-600">
                {currentSubscription.plan_name}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                currentSubscription.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {currentSubscription.is_active ? 'Ativa' : 'Inativa'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Limite de Tokens</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(currentSubscription.monthly_token_limit)}/mês
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Limite de Sessões</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(currentSubscription.monthly_session_limit)}/mês
              </p>
            </div>
            {currentSubscription.teacher_code && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Professor</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentSubscription.teacher_code}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-1">Data de Início</p>
              <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(currentSubscription.start_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowCreateModal(true);
                setSelectedPlan(plans.find((p) => p.id === currentSubscription.plan_id));
                setSelectedTeacher(
                  teachers.find((t) => t.id === currentSubscription.teacher_id)
                );
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Alterar Plano
            </button>
            {currentSubscription.is_active && (
              <button
                onClick={() => handleUpdateSubscription({ is_active: false })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Desativar Assinatura
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">Você não possui uma assinatura ativa.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Criar Assinatura
          </button>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Planos Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow p-6 border-2 ${
                currentSubscription?.plan_id === plan.id
                  ? 'border-indigo-500'
                  : 'border-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                {currentSubscription?.plan_id === plan.id && (
                  <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded">
                    Atual
                  </span>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tokens/mês:</span>
                  <span className="text-sm font-semibold">
                    {formatNumber(plan.monthly_token_limit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sessões/mês:</span>
                  <span className="text-sm font-semibold">
                    {formatNumber(plan.monthly_session_limit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Custo/token:</span>
                  <span className="text-sm font-semibold">
                    {formatCurrency(parseFloat(plan.cost_per_token || 0))}
                  </span>
                </div>
              </div>
              {currentSubscription?.plan_id !== plan.id && (
                <button
                  onClick={() => {
                    setSelectedPlan(plan);
                    setShowCreateModal(true);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Selecionar Plano
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {currentSubscription ? 'Alterar Assinatura' : 'Criar Assinatura'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plano
                </label>
                <select
                  value={selectedPlan?.id || ''}
                  onChange={(e) => {
                    const plan = plans.find((p) => p.id === e.target.value);
                    setSelectedPlan(plan);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Selecione um plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {formatNumber(plan.monthly_token_limit)} tokens/mês
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professor (Opcional)
                </label>
                <select
                  value={selectedTeacher?.id || ''}
                  onChange={(e) => {
                    const teacher = teachers.find((t) => t.id === e.target.value);
                    setSelectedTeacher(teacher || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Nenhum professor</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.teacher_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleCreateSubscription}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {currentSubscription ? 'Atualizar' : 'Criar'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedPlan(null);
                  setSelectedTeacher(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

