/**
 * Serviços de professores
 */
import request from '../http.js';

export const teachersAPI = {
  /**
   * Listar todos os professores ativos
   */
  async list() {
    const response = await request('/teachers');
    return response;
  },

  /**
   * Obter professor por ID
   */
  async get(teacherId) {
    const response = await request(`/teachers/${teacherId}`);
    return response;
  },

  /**
   * Criar professor
   */
  async create(teacherData) {
    const response = await request('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    });
    return response;
  },

  /**
   * Obter estudantes de um professor
   */
  async getStudents(teacherId) {
    const response = await request(`/teachers/${teacherId}/students`);
    return response;
  },

  /**
   * Obter resumo de um professor
   */
  async getSummary(teacherId) {
    const response = await request(`/teachers/${teacherId}/summary`);
    return response;
  },

  /**
   * Atualizar professor (Admin)
   */
  async update(teacherId, teacherData) {
    const response = await request(`/teachers/admin/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData),
    });
    return response;
  },

  /**
   * Deletar professor (Admin)
   */
  async delete(teacherId) {
    const response = await request(`/teachers/admin/teachers/${teacherId}`, {
      method: 'DELETE',
    });
    return response;
  },
};
