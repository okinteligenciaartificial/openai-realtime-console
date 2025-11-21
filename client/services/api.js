const API_BASE = '/api';

// Obter token do localStorage
function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

// Headers padrão
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Função helper para fazer requisições
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Auth endpoints
export const authAPI = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email, name, password, role) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, role }),
    }),

  me: () => request('/auth/me'),

  updatePassword: (currentPassword, newPassword) =>
    request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Users endpoints
export const usersAPI = {
  create: (email, name, role) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify({ email, name, role }),
    }),

  get: (id) => request(`/users/${id}`),

  update: (id, data) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getMetrics: (id, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString();
    return request(`/users/${id}/metrics${query ? `?${query}` : ''}`);
  },
};

// Teachers endpoints
export const teachersAPI = {
  list: () => request('/teachers'),

  create: (userId, teacherCode, imageUrl) =>
    request('/teachers', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, teacher_code: teacherCode, image_url: imageUrl }),
    }),

  getStudents: (id) => request(`/teachers/${id}/students`),

  getSummary: (id) => request(`/teachers/${id}/summary`),
};

// Plans endpoints
export const plansAPI = {
  list: () => request('/plans'),

  create: (name, monthlyTokenLimit, monthlySessionLimit, costPerToken) =>
    request('/plans', {
      method: 'POST',
      body: JSON.stringify({
        name,
        monthly_token_limit: monthlyTokenLimit,
        monthly_session_limit: monthlySessionLimit,
        cost_per_token: costPerToken,
      }),
    }),

  update: (id, data) =>
    request(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Subscriptions endpoints
export const subscriptionsAPI = {
  create: (userId, planId, teacherId) =>
    request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, plan_id: planId, teacher_id: teacherId }),
    }),

  getUserSubscription: (userId) => request(`/subscriptions/user/${userId}`),

  update: (id, data) =>
    request(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Sessions endpoints
export const sessionsAPI = {
  create: (sessionId, model) =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, model }),
    }),

  updateMetrics: (sessionId, inputTokens, outputTokens) =>
    request(`/sessions/${sessionId}/metrics`, {
      method: 'POST',
      body: JSON.stringify({ input_tokens: inputTokens, output_tokens: outputTokens }),
    }),

  finalize: (sessionId) =>
    request(`/sessions/${sessionId}/finalize`, {
      method: 'POST',
    }),

  get: (sessionId) => request(`/sessions/${sessionId}`),

  getUserSessions: (userId, limit = 50, offset = 0) =>
    request(`/sessions/user/${userId}?limit=${limit}&offset=${offset}`),

  logEvent: (sessionId, eventType, inputTokens, outputTokens, eventData) =>
    request(`/sessions/${sessionId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        event_type: eventType,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        event_data: eventData,
      }),
    }),
};

// Metrics endpoints
export const metricsAPI = {
  getSummary: (userId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString();
    return request(`/metrics/summary/${userId}${query ? `?${query}` : ''}`);
  },

  getSessions: (userId, limit = 50, offset = 0, startDate, endDate) => {
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('offset', offset);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/metrics/sessions/${userId}?${params.toString()}`);
  },

  export: (userId, format = 'json', startDate, endDate) => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/metrics/export/${userId}?${params.toString()}`);
  },
};

// Limits endpoints (helper)
export const limitsAPI = {
  checkTokenLimit: async (userId, additionalTokens) => {
    // Esta função precisaria ser implementada no backend
    // Por enquanto, vamos usar a API de métricas para verificar
    const summary = await metricsAPI.getSummary(userId);
    const subscription = await subscriptionsAPI.getUserSubscription(userId);
    
    if (!subscription) {
      return { allowed: false, reason: 'No active subscription' };
    }

    const plan = subscription.plan_name;
    // Lógica de verificação de limites seria implementada aqui
    return { allowed: true };
  },

  checkSessionLimit: async (userId) => {
    const summary = await metricsAPI.getSummary(userId);
    const subscription = await subscriptionsAPI.getUserSubscription(userId);
    
    if (!subscription) {
      return { allowed: false, reason: 'No active subscription' };
    }

    return { allowed: true };
  },
};

