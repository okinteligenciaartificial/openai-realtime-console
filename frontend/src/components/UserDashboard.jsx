import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { metricsAPI, subscriptionsAPI } from '../services/api/index.js';
import { Activity, Clock, DollarSign, Zap, TrendingUp, Layout, FileText, User, CreditCard, MessageCircle } from 'react-feather';
import SessionHistory from './SessionHistory.jsx';
import UserProfile from './UserProfile.jsx';
import SubscriptionManagement from './SubscriptionManagement.jsx';
import ConversationSession from './ConversationSession.jsx';

function DashboardTab({ user, metrics, subscription }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Bem-vindo, {user.name}!</p>
      </div>

      {subscription && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Plano Ativo</h3>
          <p className="text-2xl font-bold">{subscription.plan_name}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="opacity-80">Limite de Tokens</p>
              <p className="font-semibold">{formatNumber(subscription.monthly_token_limit)}/mês</p>
            </div>
            <div>
              <p className="opacity-80">Limite de Sessões</p>
              <p className="font-semibold">{subscription.monthly_session_limit}/mês</p>
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Sessões</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.total_sessions || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tempo Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatDuration(metrics.total_duration_seconds || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Tokens</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(metrics.total_tokens || 0)}
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Custo Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(metrics.total_cost || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Detalhes de Uso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Tokens de Entrada</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatNumber(metrics.total_input_tokens || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tokens de Saída</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatNumber(metrics.total_output_tokens || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duração Média</p>
              <p className="text-xl font-semibold text-gray-900">
                {metrics.total_sessions > 0
                  ? formatDuration(
                      Math.floor(
                        (metrics.total_duration_seconds || 0) / metrics.total_sessions
                      )
                    )
                  : '0m'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, subscriptionData] = await Promise.all([
        metricsAPI.getSummary(user.id),
        subscriptionsAPI.getUserSubscription(user.id).catch(() => null),
      ]);
      setMetrics(metricsData);
      setSubscription(subscriptionData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layout },
    { id: 'conversation', label: 'Conversar', icon: MessageCircle },
    { id: 'history', label: 'Histórico', icon: FileText },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'subscription', label: 'Assinatura', icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Erro ao carregar dados: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && (
          <DashboardTab user={user} metrics={metrics} subscription={subscription} />
        )}
        {activeTab === 'conversation' && <ConversationSession />}
        {activeTab === 'history' && <SessionHistory />}
        {activeTab === 'profile' && <UserProfile />}
        {activeTab === 'subscription' && <SubscriptionManagement />}
      </div>
    </div>
  );
}
