import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUserMetrics, useLimits } from '../hooks/useMetrics.js';
import { subscriptionsAPI } from '../services/api.js';
import { formatNumber, formatCurrency } from '../utils/formatters.js';

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const { metrics } = useUserMetrics();
  const { limits } = useLimits();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    // Implementar mudança de senha
    alert('Funcionalidade em desenvolvimento');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h2>

      {/* Informações do Usuário */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <p className="text-gray-900">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <p className="text-gray-900 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plano Atual */}
      {limits?.subscription && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Plano Atual</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {limits.subscription.plan_name}
                </p>
                <p className="text-sm text-gray-500">
                  Desde {new Date(limits.subscription.start_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50">
                Trocar Plano
              </button>
            </div>

            {/* Limites e Uso */}
            {limits.subscription.monthly_token_limit && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Tokens usados este mês</span>
                  <span className="font-medium">
                    {formatNumber(limits.usage.tokens)} / {formatNumber(limits.subscription.monthly_token_limit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        (limits.usage.tokens / limits.subscription.monthly_token_limit) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            {limits.subscription.monthly_session_limit && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Sessões usadas este mês</span>
                  <span className="font-medium">
                    {formatNumber(limits.usage.sessions)} / {formatNumber(limits.subscription.monthly_session_limit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        (limits.usage.sessions / limits.subscription.monthly_session_limit) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {metrics && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Estatísticas Gerais</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total de Sessões</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(metrics.total_sessions || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Tokens</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatNumber(metrics.total_tokens || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Custo Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(parseFloat(metrics.total_cost || 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mudança de Senha */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {showChangePassword ? 'Cancelar' : 'Alterar Senha'}
          </button>
        </div>
        {showChangePassword && (
          <div className="p-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha Atual
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={passwordData.current}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={passwordData.new}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={passwordData.confirm}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirm: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Salvar Senha
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

