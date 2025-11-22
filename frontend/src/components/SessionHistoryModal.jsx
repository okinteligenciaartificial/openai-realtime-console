import { X } from 'react-feather';
import ConversationHistory from './ConversationHistory.jsx';
import { formatDate, formatDuration, formatNumber, formatCurrency } from '../utils/formatters.js';

export default function SessionHistoryModal({ session, isOpen, onClose }) {
  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Detalhes da Sessão</h2>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(session.start_time)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Session Info */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    session.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : session.status === 'active'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {session.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Duração</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDuration(session.duration_seconds || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Tokens</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatNumber(session.total_tokens || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Custo Total</p>
                <p className="text-sm font-medium text-green-600">
                  {formatCurrency(parseFloat(session.cost_total || 0))}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Input Tokens</p>
                <p className="text-sm text-gray-700">
                  {formatNumber(session.input_tokens || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Output Tokens</p>
                <p className="text-sm text-gray-700">
                  {formatNumber(session.output_tokens || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Modelo</p>
                <p className="text-sm text-gray-700">
                  {session.model || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Session ID</p>
                <p className="text-xs text-gray-700 font-mono truncate" title={session.session_id}>
                  {session.session_id || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-6">
            <ConversationHistory sessionId={session.session_id} />
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

