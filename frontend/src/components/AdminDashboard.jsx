import { useState } from 'react';
import { BarChart2, Users, UserCheck, CreditCard, FileText, Activity, Layout } from 'react-feather';
import OverviewTab from './admin/OverviewTab.jsx';
import UsersTab from './admin/UsersTab.jsx';
import TeachersTab from './admin/TeachersTab.jsx';
import PlansTab from './admin/PlansTab.jsx';
import SubscriptionsTab from './admin/SubscriptionsTab.jsx';
import SessionsTab from './admin/SessionsTab.jsx';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'teachers', label: 'Professores', icon: UserCheck },
    { id: 'plans', label: 'Planos', icon: CreditCard },
    { id: 'subscriptions', label: 'Assinaturas', icon: FileText },
    { id: 'sessions', label: 'Sessões', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Painel Administrativo</h2>
        <p className="text-gray-600">Gerencie usuários, planos, assinaturas e sessões</p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
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
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'teachers' && <TeachersTab />}
        {activeTab === 'plans' && <PlansTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
        {activeTab === 'sessions' && <SessionsTab />}
      </div>
    </div>
  );
}
