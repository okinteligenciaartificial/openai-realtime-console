import { useState, useEffect } from 'react';
import { teachersAPI, adminAPI } from '../../services/api.js';
import DataTable from './DataTable.jsx';
import TeacherModal from './TeacherModal.jsx';
import { formatDate } from '../../utils/formatters.js';

export default function TeachersTab() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeacherStudents, setSelectedTeacherStudents] = useState(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const data = await teachersAPI.list();
      setTeachers(data);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTeacher(null);
    setShowModal(true);
  };

  const handleEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedTeacher) {
        await adminAPI.teachers.update(selectedTeacher.id, data);
      } else {
        await teachersAPI.create(data.user_id, data.teacher_code, data.image_url);
      }
      await loadTeachers();
      setShowModal(false);
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async (teacher) => {
    if (window.confirm(`Tem certeza que deseja remover o professor ${teacher.name || teacher.teacher_code}?`)) {
      try {
        await adminAPI.teachers.delete(teacher.id);
        await loadTeachers();
      } catch (error) {
        alert('Erro ao remover professor');
      }
    }
  };

  const handleViewStudents = async (teacher) => {
    try {
      const students = await teachersAPI.getStudents(teacher.id);
      setSelectedTeacherStudents({ teacher, students });
    } catch (error) {
      alert('Erro ao carregar alunos');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Professor',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          {row.image_url && (
            <img
              src={row.image_url}
              alt={value}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.teacher_code}</div>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (value) => formatDate(value),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciamento de Professores</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          + Novo Professor
        </button>
      </div>

      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        actions={(teacher) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(teacher)}
              className="text-indigo-600 hover:text-indigo-900 text-sm"
            >
              Editar
            </button>
            <button
              onClick={() => handleViewStudents(teacher)}
              className="text-blue-600 hover:text-blue-900 text-sm"
            >
              Alunos
            </button>
            <button
              onClick={() => handleDelete(teacher)}
              className="text-red-600 hover:text-red-900 text-sm"
            >
              Remover
            </button>
          </div>
        )}
      />

      {showModal && (
        <TeacherModal
          teacher={selectedTeacher}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {selectedTeacherStudents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Alunos de {selectedTeacherStudents.teacher.name}
              </h3>
              <button
                onClick={() => setSelectedTeacherStudents(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {selectedTeacherStudents.students.length === 0 ? (
                <p className="text-gray-500">Nenhum aluno vinculado</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedTeacherStudents.students.map((student) => (
                      <tr key={student.user_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.plan_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              student.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

