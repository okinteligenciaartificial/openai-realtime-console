import { useState } from 'react';
import { useAdminUsers } from '../../hooks/useAdmin.js';
import DataTable from './DataTable.jsx';
import UserModal from './UserModal.jsx';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import { adminAPI } from '../../services/api.js';

export default function UsersTab() {
  const [filters, setFilters] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { users, loading, pagination, loadUsers, createUser, updateUser, deleteUser } = useAdminUsers(filters);

  const columns = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 capitalize">
          {value}
        </span>
      ),
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
    {
      key: 'created_at',
      label: 'Criado em',
      render: (value) => formatDate(value),
    },
  ];

  const handleCreate = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    if (selectedUser) {
      await updateUser(selectedUser.id, data);
    } else {
      await createUser(data.email, data.name, data.role, data.password);
    }
    setShowModal(false);
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Tem certeza que deseja desativar o usuário ${user.name}?`)) {
      await deleteUser(user.id);
    }
  };

  const handleViewMetrics = async (user) => {
    try {
      const details = await adminAPI.users.get(user.id);
      const metrics = details.metrics || {};
      alert(
        `Métricas do usuário ${user.name}:\n\n` +
        `Sessões: ${metrics.total_sessions || 0}\n` +
        `Tokens: ${metrics.total_tokens || 0}\n` +
        `Custo: ${formatCurrency(parseFloat(metrics.total_cost || 0))}`
      );
    } catch (error) {
      alert('Erro ao carregar métricas: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciamento de Usuários</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          + Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Nome ou email..."
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="student">Aluno</option>
              <option value="teacher">Professor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
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
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        pagination={pagination}
        onPageChange={loadUsers}
        actions={(user) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(user)}
              className="text-indigo-600 hover:text-indigo-900 text-sm"
            >
              Editar
            </button>
            <button
              onClick={() => handleViewMetrics(user)}
              className="text-blue-600 hover:text-blue-900 text-sm"
            >
              Métricas
            </button>
            <button
              onClick={() => handleDelete(user)}
              className="text-red-600 hover:text-red-900 text-sm"
            >
              Desativar
            </button>
          </div>
        )}
      />

      {showModal && (
        <UserModal
          user={selectedUser}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

