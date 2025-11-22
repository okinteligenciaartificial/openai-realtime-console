import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api/admin.js';

/**
 * Hook para gerenciar usuários (admin)
 */
export function useAdminUsers(filters = {}, autoLoad = true) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const loadUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.users.list(page, pagination.limit, filters);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    if (autoLoad) {
      loadUsers(1);
    }
  }, [autoLoad, loadUsers]);

  const createUser = async (email, name, role, password) => {
    try {
      const user = await adminAPI.users.create(email, name, role, password);
      await loadUsers(pagination.page);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateUser = async (id, data) => {
    try {
      const user = await adminAPI.users.update(id, data);
      await loadUsers(pagination.page);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteUser = async (id) => {
    try {
      await adminAPI.users.delete(id);
      await loadUsers(pagination.page);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    users,
    loading,
    error,
    pagination,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    refetch: () => loadUsers(pagination.page),
  };
}

/**
 * Hook para gerenciar sessões (admin)
 */
export function useAdminSessions(filters = {}, autoLoad = true) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const loadSessions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.sessions.list(page, pagination.limit, filters);
      setSessions(data.sessions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    if (autoLoad) {
      loadSessions(1);
    }
  }, [autoLoad, loadSessions]);

  const getStats = async (startDate, endDate) => {
    try {
      return await adminAPI.sessions.getStats(startDate, endDate);
    } catch (err) {
      throw err;
    }
  };

  return {
    sessions,
    loading,
    error,
    pagination,
    loadSessions,
    getStats,
    refetch: () => loadSessions(pagination.page),
  };
}

/**
 * Hook para estatísticas admin
 */
export function useAdminStats(startDate = null, endDate = null) {
  const [overview, setOverview] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [costs, setCosts] = useState([]);
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, topUsersData, costsData, usageData] = await Promise.all([
        adminAPI.stats.overview(startDate, endDate),
        adminAPI.stats.users(10, startDate, endDate),
        adminAPI.stats.costs(startDate, endDate, 'day'),
        adminAPI.stats.usage(startDate, endDate),
      ]);

      setOverview(overviewData);
      setTopUsers(topUsersData);
      setCosts(costsData);
      setUsage(usageData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    overview,
    topUsers,
    costs,
    usage,
    loading,
    error,
    refetch: loadStats,
  };
}

/**
 * Hook para gerenciar assinaturas (admin)
 */
export function useAdminSubscriptions(filters = {}, autoLoad = true) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const loadSubscriptions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.subscriptions.list(page, pagination.limit, filters);
      setSubscriptions(data.subscriptions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    if (autoLoad) {
      loadSubscriptions(1);
    }
  }, [autoLoad, loadSubscriptions]);

  const createSubscription = async (userId, planId, teacherId) => {
    try {
      const subscription = await adminAPI.subscriptions.create(userId, planId, teacherId);
      await loadSubscriptions(pagination.page);
      return { success: true, subscription };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateSubscription = async (id, data) => {
    try {
      const subscription = await adminAPI.subscriptions.update(id, data);
      await loadSubscriptions(pagination.page);
      return { success: true, subscription };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    subscriptions,
    loading,
    error,
    pagination,
    loadSubscriptions,
    createSubscription,
    updateSubscription,
    refetch: () => loadSubscriptions(pagination.page),
  };
}

