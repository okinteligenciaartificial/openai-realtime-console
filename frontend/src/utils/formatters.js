/**
 * Funções utilitárias para formatação de dados
 */

/**
 * Formata número com separadores de milhar
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined) return '$0.00';
  const numValue = Number(value);
  // Para valores muito pequenos, usar mais casas decimais
  if (numValue > 0 && numValue < 0.01) {
    return `$${numValue.toFixed(6)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(numValue);
}

/**
 * Formata data
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '-';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(date);
  } catch (error) {
    return dateString;
  }
}

/**
 * Formata duração em segundos para formato legível
 */
export function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Formata tokens
 */
export function formatTokens(value) {
  if (value === null || value === undefined) return '0';
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return formatNumber(value);
}

/**
 * Formata tempo relativo (ex: "há 2 horas")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `há ${hours} hora${hours > 1 ? 's' : ''}`;
    }
    if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `há ${days} dia${days > 1 ? 's' : ''}`;
    }

    return formatDate(dateString);
  } catch (error) {
    return dateString;
  }
}

/**
 * Calcula porcentagem
 */
export function calculatePercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

