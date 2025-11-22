import { request } from '../http.js';

export const adminAPI = {
  // Users
  users: {
    list: (page = 1, limit = 50, filters = {}) => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (filters.role) params.append('role', filters.role);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      if (filters.search) params.append('search', filters.search);
      return request(`/users/admin/users?${params.toString()}`);
    },

    get: (id) => request(`/users/admin/users/${id}`),

    create: (email, name, role, password) =>
      request('/users/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, name, role, password }),
      }),

    update: (id, data) =>
      request(`/users/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/users/admin/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Sessions
  sessions: {
    list: (page = 1, limit = 50, filters = {}) => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.model) params.append('model', filters.model);
      return request(`/sessions/admin/sessions?${params.toString()}`);
    },

    getStats: (startDate, endDate) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return request(`/sessions/admin/sessions/stats?${params.toString()}`);
    },
  },

  // Stats
  stats: {
    overview: (startDate, endDate) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return request(`/metrics/admin/stats/overview?${params.toString()}`);
    },

    users: (limit = 10, startDate, endDate) => {
      const params = new URLSearchParams();
      params.append('limit', limit);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return request(`/metrics/admin/stats/users?${params.toString()}`);
    },

    costs: (startDate, endDate, groupBy = 'day') => {
      const params = new URLSearchParams();
      params.append('group_by', groupBy);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return request(`/metrics/admin/stats/costs?${params.toString()}`);
    },

    usage: (startDate, endDate) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return request(`/metrics/admin/stats/usage?${params.toString()}`);
    },
  },

  // Subscriptions
  subscriptions: {
    list: (page = 1, limit = 50, filters = {}) => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.plan_id) params.append('plan_id', filters.plan_id);
      return request(`/subscriptions/admin/subscriptions?${params.toString()}`);
    },

    get: (id) => request(`/subscriptions/admin/subscriptions/${id}`),

    create: (userId, planId, teacherId) =>
      request('/subscriptions/admin/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, plan_id: planId, teacher_id: teacherId }),
      }),

    update: (id, data) =>
      request(`/subscriptions/admin/subscriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Teachers
  teachers: {
    list: () => request('/teachers/admin/teachers'),

    get: (id) => request(`/teachers/admin/teachers/${id}`),

    create: (data) =>
      request('/teachers/admin/teachers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/teachers/admin/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/teachers/admin/teachers/${id}`, {
        method: 'DELETE',
      }),
  },

  // Plans
  plans: {
    list: () => request('/plans/admin/plans'),

    get: (id) => request(`/plans/admin/plans/${id}`),

    create: (data) =>
      request('/plans/admin/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/plans/admin/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/plans/admin/plans/${id}`, {
        method: 'DELETE',
      }),
  },
};

