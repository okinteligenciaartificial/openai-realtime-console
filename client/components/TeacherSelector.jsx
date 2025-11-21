import { useState, useEffect } from 'react';
import { teachersAPI } from '../services/api.js';

export default function TeacherSelector({ selectedTeacherId, onSelect }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const data = await teachersAPI.list();
        setTeachers(data);
        
        // Se não há professor selecionado e há professores, selecionar o primeiro
        if (!selectedTeacherId && data.length > 0 && onSelect) {
          onSelect(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm">Carregando professores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
        Erro ao carregar professores: {error}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Nenhum professor disponível
      </div>
    );
  }

  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Selecione um professor
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => (
          <button
            key={teacher.id}
            onClick={() => onSelect && onSelect(teacher.id)}
            className={`p-4 border-2 rounded-lg transition-all ${
              selectedTeacherId === teacher.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            {teacher.image_url && (
              <img
                src={teacher.image_url}
                alt={teacher.name || teacher.teacher_code}
                className="w-full h-32 object-cover rounded-md mb-2"
              />
            )}
            <p className="font-medium text-gray-900">{teacher.name || teacher.teacher_code}</p>
            {teacher.teacher_code && (
              <p className="text-xs text-gray-500 mt-1">{teacher.teacher_code}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

