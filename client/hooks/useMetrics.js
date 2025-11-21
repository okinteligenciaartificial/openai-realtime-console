import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.js';
import { metricsAPI, sessionsAPI, subscriptionsAPI, limitsAPI } from '../services/api.js';

/**
 * Hook para buscar métricas do usuário
 */
export function useUserMetrics(userId = null, startDate = null, endDate = null) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await metricsAPI.getSummary(targetUserId, startDate, endDate);
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [targetUserId, startDate, endDate]);

  return { metrics, loading, error, refetch: () => {
    if (targetUserId) {
      metricsAPI.getSummary(targetUserId, startDate, endDate)
        .then(setMetrics)
        .catch((err) => setError(err.message));
    }
  }};
}

/**
 * Hook para buscar sessões do usuário
 */
export function useSessions(userId = null, limit = 50, offset = 0) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await sessionsAPI.getUserSessions(targetUserId, limit, offset);
        setSessions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [targetUserId, limit, offset]);

  return { sessions, loading, error, refetch: () => {
    if (targetUserId) {
      sessionsAPI.getUserSessions(targetUserId, limit, offset)
        .then(setSessions)
        .catch((err) => setError(err.message));
    }
  }};
}

/**
 * Hook para verificar limites do usuário
 */
export function useLimits(userId = null) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const fetchLimits = async () => {
      try {
        setLoading(true);
        setError(null);
        const subscription = await subscriptionsAPI.getUserSubscription(targetUserId);
        const metrics = await metricsAPI.getSummary(targetUserId);
        
        setLimits({
          subscription,
          usage: {
            tokens: parseInt(metrics?.total_tokens || 0),
            sessions: parseInt(metrics?.total_sessions || 0),
          },
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [targetUserId]);

  const checkTokenLimit = async (additionalTokens) => {
    if (!targetUserId) return { allowed: false, reason: 'No user ID' };
    return await limitsAPI.checkTokenLimit(targetUserId, additionalTokens);
  };

  const checkSessionLimit = async () => {
    if (!targetUserId) return { allowed: false, reason: 'No user ID' };
    return await limitsAPI.checkSessionLimit(targetUserId);
  };

  return {
    limits,
    loading,
    error,
    checkTokenLimit,
    checkSessionLimit,
    refetch: () => {
      if (targetUserId) {
        subscriptionsAPI.getUserSubscription(targetUserId)
          .then((subscription) => {
            metricsAPI.getSummary(targetUserId).then((metrics) => {
              setLimits({
                subscription,
                usage: {
                  tokens: parseInt(metrics?.total_tokens || 0),
                  sessions: parseInt(metrics?.total_sessions || 0),
                },
              });
            });
          })
          .catch((err) => setError(err.message));
      }
    },
  };
}

