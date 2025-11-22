import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { sessionsAPI, realtimeAPI, conversationsAPI } from '../services/api/index.js';
import { MessageCircle, Mic, MicOff, Phone, PhoneOff, AlertCircle } from 'react-feather';
import SessionMetrics from './SessionMetrics.jsx';
import EventLog from './EventLog.jsx';
import ConversationHistory from './ConversationHistory.jsx';

export default function ConversationSession() {
  const { user } = useAuth();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sessionIdRef = useRef(null); // Ref para manter sessionId atualizado no closure

  useEffect(() => {
    return () => {
      // Cleanup ao desmontar
      if (isSessionActive) {
        stopSession();
      }
    };
  }, []);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Criar sessão no backend (o backend fará a verificação de limites)
      // O backend permite sessões sem assinatura em desenvolvimento
      const session_id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const session = await sessionsAPI.create({
        session_id,
        model: 'gpt-4o-mini-realtime-preview',
      });

      setSessionId(session.id || session_id);
      setStartTime(new Date());

      // Obter token do servidor (via API do backend)
      const tokenData = await realtimeAPI.getToken();
      console.log('[ConversationSession] Token data received:', tokenData);
      
      // Extrair client_secret de qualquer formato possível
      // A API retorna: {"value": "ek_...", "expires_at": ..., "session": {...}}
      let client_secret_value = null;
      if (tokenData.value) {
        // Formato atual da API: value na raiz
        client_secret_value = tokenData.value;
      } else if (tokenData.client_secret_value) {
        client_secret_value = tokenData.client_secret_value;
      } else if (tokenData.client_secret) {
        if (typeof tokenData.client_secret === 'string') {
          client_secret_value = tokenData.client_secret;
        } else if (tokenData.client_secret.value) {
          client_secret_value = tokenData.client_secret.value;
        }
      }
      
      if (!client_secret_value) {
        console.error('[ConversationSession] Could not extract client_secret from:', tokenData);
        throw new Error('Failed to obtain client_secret from token endpoint. Response: ' + JSON.stringify(tokenData));
      }
      
      console.log('[ConversationSession] Client secret extracted:', client_secret_value.substring(0, 10) + '...');

      // Configurar WebRTC
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Configurar data channel para eventos
      const dataChannel = pc.createDataChannel('events');
      dataChannelRef.current = dataChannel;

      // Atualizar sessionIdRef com o sessionId inicial
      sessionIdRef.current = sessionId;
      console.log('[ConversationSession] Initial sessionIdRef set to:', sessionId);

      dataChannel.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          // Usar sessionIdRef.current que será atualizado quando sessionId mudar
          const currentSessionId = sessionIdRef.current || sessionId;
          
          console.log('[ConversationSession] 📥 Event received:', {
            type: data.type,
            hasUsage: !!data.usage,
            hasResponseUsage: !!(data.response && data.response.usage),
            usage: data.usage,
            responseUsage: data.response?.usage,
            keys: Object.keys(data),
            sessionId: currentSessionId,
          });
          setEvents((prev) => [...prev, data]);
          
          // Extrair usage ANTES de processar mensagens para usar em ambos os lugares
          let extractedUsage = null;
          if (data.usage && typeof data.usage === 'object') {
            // Criar uma cópia do objeto usage para garantir que não perdemos referência
            extractedUsage = {
              input_tokens: data.usage.input_tokens,
              output_tokens: data.usage.output_tokens,
            };
          } else if (data.response && data.response.usage && typeof data.response.usage === 'object') {
            // Criar uma cópia do objeto usage para garantir que não perdemos referência
            extractedUsage = {
              input_tokens: data.response.usage.input_tokens,
              output_tokens: data.response.usage.output_tokens,
            };
          }
          
          // Log para debug
          if (extractedUsage) {
            console.log('[ConversationSession] ✅ Extracted usage:', {
              type: data.type,
              usage: extractedUsage,
              inputTokens: extractedUsage.input_tokens,
              outputTokens: extractedUsage.output_tokens,
              usageKeys: Object.keys(extractedUsage),
              originalUsage: data.usage,
              originalResponseUsage: data.response?.usage,
            });
          } else if (data.type === 'response.done' || data.type === 'response.text.done') {
            // Log detalhado para eventos que deveriam ter usage
            console.log('[ConversationSession] ⚠️ No usage extracted for:', {
              type: data.type,
              hasDataUsage: !!data.usage,
              hasResponseUsage: !!(data.response && data.response.usage),
              dataUsage: data.usage,
              responseUsage: data.response?.usage,
              responseKeys: data.response ? Object.keys(data.response) : null,
            });
          }

          // Processar mensagens de áudio/texto (exibição + salvar no backend)
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            const text = data.transcript;
            setMessages((prev) => [...prev, { type: 'user', text, timestamp: new Date() }]);
            
            // Salvar mensagem do usuário no backend
            if (currentSessionId && text && text.trim()) {
              // Garantir que o eventData tenha o usage correto
              const eventDataWithUsage = {
                ...data,
                usage: extractedUsage || data.usage,
              };
              
              conversationsAPI.saveMessage(currentSessionId, {
                role: 'user',
                content: text.trim(),
                messageType: 'transcription',
                eventType: data.type,
                eventData: eventDataWithUsage,
              }).catch((err) => {
                console.error('[ConversationSession] Error saving user message:', err);
              });
            }
          } else if (data.type === 'conversation.item.output_audio_transcription.completed') {
            const text = data.transcript;
            setMessages((prev) => [...prev, { type: 'assistant', text, timestamp: new Date() }]);
            
            // Salvar mensagem do assistente no backend
            if (currentSessionId && text && text.trim()) {
              // Garantir que o eventData tenha o usage correto
              const eventDataWithUsage = {
                ...data,
                usage: extractedUsage || data.usage,
              };
              
              conversationsAPI.saveMessage(currentSessionId, {
                role: 'assistant',
                content: text.trim(),
                messageType: 'transcription',
                eventType: data.type,
                eventData: eventDataWithUsage,
              }).catch((err) => {
                console.error('[ConversationSession] Error saving assistant message:', err);
              });
            }
          } else if (data.type === 'response.text.delta') {
            // Atualizar última mensagem do assistente (texto incremental)
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.type === 'assistant') {
                return [...prev.slice(0, -1), { ...last, text: (last.text || '') + data.delta }];
              }
              return [...prev, { type: 'assistant', text: data.delta, timestamp: new Date() }];
            });
          } else if (data.type === 'response.text.done') {
            // Quando a resposta de texto estiver completa, salvar no backend
            const text = data.text || data.response?.text || '';
            if (currentSessionId && text && text.trim()) {
              // Garantir que o eventData tenha o usage correto em response.usage
              const eventDataWithUsage = {
                ...data,
                response: {
                  ...(data.response || {}),
                  usage: extractedUsage || data.response?.usage,
                },
              };
              
              conversationsAPI.saveMessage(currentSessionId, {
                role: 'assistant',
                content: text.trim(),
                messageType: 'text',
                eventType: data.type,
                eventData: eventDataWithUsage,
              }).catch((err) => {
                console.error('[ConversationSession] Error saving assistant text message:', err);
              });
            }
          } else if (data.type === 'response.done') {
            // IMPORTANTE: response.done contém o usage completo da resposta
            // Mas NÃO devemos salvar como mensagem se não tiver texto real
            // O texto real vem das transcrições (conversation.item.output_audio_transcription.completed)
            // Este evento é usado apenas para atualizar métricas via /api/realtime/events/:sessionId
            // que já está sendo feito no bloco abaixo
            
            // Se tiver texto real (não apenas placeholder), podemos salvar
            const text = data.response?.text || data.text || '';
            const hasRealText = text && text.trim() && !text.includes('[Response completed]');
            
            if (currentSessionId && hasRealText) {
              // Garantir que temos o usage - tentar extrair novamente se necessário
              let finalUsage = extractedUsage;
              if (!finalUsage && data.response && data.response.usage) {
                finalUsage = {
                  input_tokens: data.response.usage.input_tokens,
                  output_tokens: data.response.usage.output_tokens,
                };
              }
              
              // Garantir que o eventData tenha o usage correto em response.usage
              const eventDataWithUsage = {
                ...data,
                response: {
                  ...(data.response || {}),
                  usage: finalUsage || data.response?.usage || {
                    input_tokens: 0,
                    output_tokens: 0,
                  },
                },
              };
              
              console.log('[ConversationSession] 💾 Saving response.done with real text:', {
                sessionId: currentSessionId,
                textLength: text.length,
                hasUsage: !!finalUsage,
              });
              
              conversationsAPI.saveMessage(currentSessionId, {
                role: 'assistant',
                content: text.trim(),
                messageType: 'text',
                eventType: data.type,
                eventData: eventDataWithUsage,
              }).catch((err) => {
                console.error('[ConversationSession] Error saving response.done message:', err);
              });
            } else {
              console.log('[ConversationSession] ⏭️ Skipping response.done (no real text, usage will be processed via events endpoint):', {
                sessionId: currentSessionId,
                hasText: !!text,
                textPreview: text?.substring(0, 50),
              });
            }
          } else if (data.type === 'response.audio_transcript.delta') {
            // Transcrição de áudio do assistente (incremental)
            console.log('[ConversationSession] Audio transcript delta:', data.delta);
          } else if (data.type === 'session.updated') {
            console.log('[ConversationSession] Session updated:', data);
          } else if (data.type === 'error') {
            console.error('[ConversationSession] Error from API:', data);
            setError(data.error?.message || 'Erro na sessão');
          }
          
          // Enviar QUALQUER evento que tenha usage para o backend
          // IMPORTANTE: Na API Realtime GA há dois tipos de custos:
          // 1. Per-Response costs: response.usage em response.done (custo da resposta do modelo)
          // 2. Input transcription costs: usage em conversation.item.input_audio_transcription.completed (custo da transcrição)
          // Ambos devem ser enviados para o backend processar
          // Usar o usage já extraído anteriormente
          let usage = extractedUsage;
          let hasUsage = false;
          
          // Se não extraímos antes, tentar novamente
          if (!usage) {
            if (data.usage) {
              usage = data.usage;
              hasUsage = true;
            } else if (data.response && data.response.usage) {
              usage = data.response.usage;
              hasUsage = true;
            }
          } else {
            hasUsage = true;
          }
          
          // Se encontrou usage, enviar para o backend (mesmo que tokens sejam 0)
          if (hasUsage && usage) {
            const inputTokens = parseInt(usage.input_tokens || 0, 10);
            const outputTokens = parseInt(usage.output_tokens || 0, 10);
            
            // Se o usage está vazio mas temos tokens, criar um usage válido
            if ((inputTokens > 0 || outputTokens > 0) && Object.keys(usage).length === 0) {
              usage = {
                input_tokens: inputTokens,
                output_tokens: outputTokens,
              };
            }
            
            console.log('[ConversationSession] 🔍 Event has usage!', {
              type: data.type,
              usage: usage,
              inputTokens,
              outputTokens,
              total: inputTokens + outputTokens,
              sessionId: currentSessionId,
              sessionIdRef: sessionIdRef.current,
              usageLocation: data.response ? 'response.usage' : 'usage',
            });
            
            if (currentSessionId) {
              // IMPORTANTE: Enviar mesmo se tokens forem 0, pois pode ser um evento de transcrição
              // ou um response.done que ainda não tem tokens acumulados
              console.log('[ConversationSession] 📤 Sending event with usage to backend:', {
                sessionId: currentSessionId,
                eventType: data.type,
                inputTokens,
                outputTokens,
                total: inputTokens + outputTokens,
                usageLocation: data.response ? 'response.usage' : 'usage',
                fullEvent: JSON.stringify(data, null, 2).substring(0, 500), // Primeiros 500 chars
              });
              
              try {
                await realtimeAPI.sendEvent(currentSessionId, data);
                console.log('[ConversationSession] ✅ Event sent to backend successfully');
              } catch (err) {
                console.error('[ConversationSession] ❌ Error sending event to backend:', {
                  sessionId: currentSessionId,
                  eventType: data.type,
                  error: err.message,
                  errorDetails: err,
                });
              }
            } else {
              console.warn('[ConversationSession] ⚠️ Cannot send event - sessionId is null. Current sessionId:', sessionId, 'sessionIdRef.current:', sessionIdRef.current);
            }
          }
        } catch (err) {
          console.error('Error parsing event:', err, event.data);
        }
      };

      // Configurar áudio - IMPORTANTE: usar constraints corretas para PCM
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000, // Realtime API usa 24kHz
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      mediaStreamRef.current = stream;
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
        console.log('[ConversationSession] Audio track added:', track.getSettings());
      });

      // Configurar recepção de áudio
      pc.ontrack = (event) => {
        console.log('[ConversationSession] Remote track received:', event.track.kind);
        const [remoteStream] = event.streams;
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play().catch((err) => console.error('Error playing audio:', err));
        console.log('[ConversationSession] Audio playback started');
      };
      
      // Monitorar conexão
      pc.onconnectionstatechange = () => {
        console.log('[ConversationSession] Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Conexão perdida');
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log('[ConversationSession] ICE connection state:', pc.iceConnectionState);
      };

      // Criar oferta
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Enviar SDP para o servidor (via API do backend)
      // O SDP deve ser enviado como texto, não JSON
      // Passar client_secret_value para usar chave ephemeral (recomendado)
      const response = await realtimeAPI.createSession(offer.sdp, client_secret_value);
      
      // O backend retorna { sdp, sessionId } ou apenas sdp (compatibilidade)
      const answerSdp = typeof response === 'string' ? response : response.sdp;
      const backendSessionId = typeof response === 'object' ? response.sessionId : null;
      
      // Usar o sessionId do backend se disponível (é o que está no banco)
      if (backendSessionId) {
        console.log('[ConversationSession] Using backend sessionId:', backendSessionId);
        setSessionId(backendSessionId);
        // Atualizar o sessionIdRef para que o dataChannel.onmessage use o valor correto
        sessionIdRef.current = backendSessionId;
        console.log('[ConversationSession] Updated sessionIdRef to:', backendSessionId);
      }
      
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      // Aguardar data channel abrir e configurar sessão
      dataChannel.onopen = async () => {
        console.log('[ConversationSession] Data channel opened, configuring session...');
        
        // Aguardar um pouco para garantir que a conexão está estável
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // A sessão já foi configurada quando obtivemos o token
        // Mas podemos atualizar instruções se necessário
        // A configuração principal vem do token (session config)
        
        console.log('[ConversationSession] Session ready. Waiting for user input or assistant greeting...');
        
        // Não enviar mensagem inicial automaticamente
        // O assistente deve iniciar a conversa ou esperar input do usuário
      };

      setIsSessionActive(true);
      setIsConnecting(false);
    } catch (err) {
      console.error('Error starting session:', err);
      setError(err.message || 'Erro ao iniciar sessão');
      setIsConnecting(false);
      stopSession();
    }
  };

  const stopSession = async () => {
    try {
      // Fechar conexões
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      // Finalizar sessão no backend
      if (sessionId && startTime) {
        const duration = Math.floor((new Date() - startTime) / 1000);
        try {
          // Métricas já foram enviadas durante a sessão via addMetrics
          // Apenas finalizar a sessão
          
          await sessionsAPI.finalize(sessionId, duration);
          console.log('[ConversationSession] Session finalized');
        } catch (err) {
          console.error('Error finalizing session:', err);
        }
      }

      setIsSessionActive(false);
      setSessionId(null);
      setStartTime(null);
      setEvents([]);
      setMessages([]);
    } catch (err) {
      console.error('Error stopping session:', err);
      setError(err.message || 'Erro ao encerrar sessão');
    }
  };

  const sendTextMessage = async (text) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      setError('Data channel not ready');
      return;
    }

    try {
      dataChannelRef.current.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: text,
          },
        })
      );

      setMessages((prev) => [...prev, { type: 'user', text, timestamp: new Date() }]);
      
      // Salvar mensagem de texto do usuário no backend
      if (sessionId && text && text.trim()) {
        conversationsAPI.saveMessage(sessionId, {
          role: 'user',
          content: text.trim(),
          messageType: 'text',
          eventType: 'conversation.item.create',
          eventData: { type: 'message', role: 'user', content: text },
        }).catch((err) => {
          console.error('[ConversationSession] Error saving user text message:', err);
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erro ao enviar mensagem');
    }
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Conversar com a Professora</h2>
        <p className="text-gray-600">
          Inicie uma sessão de conversação em tempo real com a professora Samantha
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {!isSessionActive ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="max-w-md mx-auto">
            <MessageCircle className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Pronto para conversar?
            </h3>
            <p className="text-gray-600 mb-6">
              Clique no botão abaixo para iniciar uma sessão de conversação com a professora
              Samantha. Você poderá conversar em tempo real usando áudio ou texto.
            </p>
            <button
              onClick={startSession}
              disabled={isConnecting}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Conectando...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  Iniciar Conversação
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sessionId && startTime && (
            <>
              <SessionMetrics sessionId={sessionId} startTime={startTime} />
              <ConversationHistory sessionId={sessionId} />
            </>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Conversação</h3>
              <div className="flex gap-2">
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-lg ${
                    isMuted ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}
                  title={isMuted ? 'Desmutar' : 'Mutar'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={stopSession}
                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  title="Encerrar sessão"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Aguardando mensagens...</p>
                  <p className="text-sm mt-2">Fale ou digite uma mensagem para começar</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite uma mensagem..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    sendTextMessage(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.target.previousElementSibling;
                  if (input.value.trim()) {
                    sendTextMessage(input.value);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Enviar
              </button>
            </div>
          </div>

          <details className="bg-white rounded-lg shadow p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Eventos da Sessão (Debug)
            </summary>
            <div className="mt-4">
              <EventLog events={events} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

