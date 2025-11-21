/**
 * Formata número com separadores de milhar
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('pt-BR');
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
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
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

/**
 * Formata data para exibição
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formata data relativa (ex: "há 2 horas")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'agora';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }

  return formatDate(dateString);
}

/**
 * Formata tokens para exibição (ex: 1.5K, 2.3M)
 */
export function formatTokens(tokens) {
  if (!tokens || tokens === 0) return '0';
  
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

/**
 * Calcula porcentagem
 */
export function calculatePercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

