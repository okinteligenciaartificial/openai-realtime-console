import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usersAPI, sessionsAPI, metricsAPI, plansAPI, teachersAPI } from '../services/api.js';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSessions: 0,
    totalTokens: 0,
    totalCost: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Carregar dados básicos
      // Nota: Algumas APIs precisam ser adaptadas para retornar todos os dados para admin
      const [plansData] = await Promise.all([
        plansAPI.list(),
        // Adicionar outras chamadas conforme necessário
      ]);
      setPlans(plansData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-sm text-gray-600">Bem-vindo, {user?.name}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral' },
              { id: 'users', label: 'Usuários' },
              { id: 'sessions', label: 'Sessões' },
              { id: 'plans', label: 'Planos' },
              { id: 'teachers', label: 'Professores' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total de Sessões</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total de Tokens</p>
                <p className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Custo Total</p>
                <p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Planos</h2>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Limite de Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Limite de Sessões
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Custo por Token
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {plan.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.monthly_token_limit ? plan.monthly_token_limit.toLocaleString() : 'Ilimitado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.monthly_session_limit ? plan.monthly_session_limit.toLocaleString() : 'Ilimitado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(plan.cost_per_token).toFixed(8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Usuários</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Sessões</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Professores</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        )}
      </main>
    </div>
  );
}

