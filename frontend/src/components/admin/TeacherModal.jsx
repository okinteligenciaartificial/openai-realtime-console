import { useState, useEffect } from 'react';
import { adminAPI, teachersAPI } from '../../services/api.js';

export default function TeacherModal({ teacher, onClose, onSave }) {
  const [formData, setFormData] = useState({
    user_id: '',
    teacher_code: '',
    image_url: '',
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
    if (teacher) {
      setFormData({
        user_id: teacher.user_id || '',
        teacher_code: teacher.teacher_code || '',
        image_url: teacher.image_url || '',
      });
    }
  }, [teacher]);

  const loadUsers = async () => {
    try {
      setError('');
      // Buscar apenas usuários com role teacher usando adminAPI
      const response = await adminAPI.users.list(1, 1000, { role: 'teacher' });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback: tentar buscar todos e filtrar
      try {
        const response = await adminAPI.users.list(1, 1000, {});
        setUsers((response.users || []).filter((u) => u.role === 'teacher'));
      } catch (e) {
        console.error('Error in fallback:', e);
        setUsers([]);
        setError('Erro ao carregar lista de usuários. Tente novamente.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar professor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {teacher ? 'Editar Professor' : 'Criar Professor'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!teacher && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
              <select
                required={!teacher}
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione um usuário</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código do Professor</label>
            <input
              type="text"
              required
              value={formData.teacher_code}
              onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: PROF001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
            <input
              type="text"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="/assets/teacher.jpg"
            />
          </div>

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

