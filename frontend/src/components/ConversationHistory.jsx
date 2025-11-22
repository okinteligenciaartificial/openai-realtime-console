import { useState, useEffect } from 'react';
import { conversationsAPI } from '../services/api/index.js';
import { MessageCircle, User, MessageSquare, Clock } from 'react-feather';

export default function ConversationHistory({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        // Carregar mensagens e estatísticas
        const [historyResponse, statsResponse] = await Promise.all([
          conversationsAPI.getHistory(sessionId),
          conversationsAPI.getStats(sessionId),
        ]);

        if (historyResponse.success) {
          setMessages(historyResponse.messages || []);
        }

        if (statsResponse.success) {
          setStats(statsResponse.stats);
        }
      } catch (err) {
        console.error('[ConversationHistory] Error loading history:', err);
        setError(err.message || 'Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [sessionId]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!sessionId) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4">
        <p className="text-gray-500 text-sm">Nenhuma sessão selecionada</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4">
        <p className="text-gray-500 text-sm">Carregando histórico...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4">
        <p className="text-red-500 text-sm">Erro: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MessageCircle size={18} />
          Histórico de Conversa
        </h3>
        {stats && (
          <div className="text-xs text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <User size={14} />
              {stats.user_messages || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} />
              {stats.assistant_messages || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={14} />
              {stats.total_messages || 0}
            </span>
            {stats.total_cost > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                ${parseFloat(stats.total_cost || 0).toFixed(6)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Nenhuma mensagem ainda nesta conversa
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  {message.role === 'user' ? (
                    <User size={16} className="mt-0.5 flex-shrink-0" />
                  ) : (
                    <MessageSquare size={16} className="mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-xs font-semibold opacity-75">
                    {message.role === 'user' ? 'Você' : 'Samantha'}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs opacity-60">
                  <Clock size={12} />
                  <span>{formatTime(message.created_at)}</span>
                  {message.message_type && message.message_type !== 'text' && (
                    <span className="px-2 py-0.5 bg-black/10 rounded">
                      {message.message_type}
                    </span>
                  )}
                  {message.cost_total > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                      ${parseFloat(message.cost_total || 0).toFixed(6)}
                    </span>
                  )}
                  {message.total_tokens > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {message.total_tokens} tokens
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

