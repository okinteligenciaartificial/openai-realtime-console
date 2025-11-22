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
  const savedMessagesRef = useRef(new Set()); // Ref para rastrear mensagens já salvas

  useEffect(() => {
    return () => {
      // Cleanup ao desmontar
      if (isSessionActive) {
        stopSession();
      }
    };
  }, []);

  // IMPORTANTE: Monitorar mensagens e garantir que todas as mensagens do usuário sejam salvas
  useEffect(() => {
    console.log('[ConversationSession] 🔍 useEffect triggered - checking messages:', {
      sessionId,
      messagesCount: messages.length,
      hasSessionId: !!sessionId,
      messages: messages.map(m => ({ type: m.type, textPreview: m.text?.substring(0, 30) })),
    });

    if (!sessionId) {
      console.log('[ConversationSession] ⚠️ useEffect: No sessionId, skipping');
      return;
    }

    if (messages.length === 0) {
      console.log('[ConversationSession] ⚠️ useEffect: No messages, skipping');
      return;
    }

    // Processar apenas mensagens do usuário que ainda não foram salvas
    messages.forEach((msg, idx) => {
      if (msg.type === 'user' && msg.text && msg.text.trim()) {
        const messageKey = `${msg.text.trim()}-${msg.timestamp?.getTime() || idx}`;
        
        // Verificar se já foi salva
        if (!savedMessagesRef.current.has(messageKey)) {
          console.log('[ConversationSession] 🔄🔄🔄 Auto-saving user message from state:', {
            sessionId,
            textPreview: msg.text.substring(0, 50),
            textLength: msg.text.length,
            messageKey,
            timestamp: msg.timestamp,
            savedCount: savedMessagesRef.current.size,
          });

          // Marcar como salva ANTES de tentar salvar (para evitar duplicatas)
          savedMessagesRef.current.add(messageKey);

          conversationsAPI.saveMessage(sessionId, {
            role: 'user',
            content: msg.text.trim(),
            messageType: 'transcription',
            eventType: 'auto-saved-from-state',
            eventData: { timestamp: msg.timestamp, source: 'state' },
          }).then((response) => {
            console.log('[ConversationSession] ✅✅✅ User message auto-saved from state successfully!', response);
          }).catch((err) => {
            console.error('[ConversationSession] ❌❌❌ Error auto-saving user message from state:', {
              error: err,
              message: err.message,
              stack: err.stack,
              sessionId,
              textPreview: msg.text.substring(0, 50),
            });
            // Remover da lista de salvas se falhou, para tentar novamente
            savedMessagesRef.current.delete(messageKey);
          });
        } else {
          console.log('[ConversationSession] ⏭️ Message already saved, skipping:', {
            messageKey,
            textPreview: msg.text.substring(0, 30),
          });
        }
      }
    });
  }, [messages, sessionId]);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Criar sessão no backend (o backend fará a verificação de limites)
      // O backend permite sessões sem assinatura em desenvolvimento
      const session_id = `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const session = await sessionsAPI.create({
        session_id,
        model: 'gpt-4o-mini-realtime-preview',
      });

      // IMPORTANTE: Atualizar sessionIdRef ANTES de configurar o dataChannel
      // para garantir que o sessionId esteja disponível quando as transcrições chegarem
      const initialSessionId = session.id || session_id;
      setSessionId(initialSessionId);
      sessionIdRef.current = initialSessionId; // Atualizar ref imediatamente
      setStartTime(new Date());
      
      console.log('[ConversationSession] ✅ Initial sessionId set:', initialSessionId);

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

      // IMPORTANTE: sessionIdRef já foi atualizado acima, mas vamos garantir
      console.log('[ConversationSession] Data channel created. sessionIdRef.current:', sessionIdRef.current);

      dataChannel.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          // IMPORTANTE: Sempre usar sessionIdRef.current que é atualizado imediatamente
          // Não usar sessionId do closure porque pode estar desatualizado
          const currentSessionId = sessionIdRef.current;
          
          // Log para debug - verificar se sessionIdRef está sendo usado corretamente
          if (!currentSessionId) {
            console.warn('[ConversationSession] ⚠️ No sessionId available! sessionIdRef.current:', sessionIdRef.current);
          }
          
          // Log detalhado para TODOS os eventos - especialmente para identificar eventos de transcrição do usuário
          if (data.type && (
            data.type.includes('transcript') || 
            data.type.includes('transcription') ||
            data.type.includes('input_audio') ||
            data.type.includes('output_audio') ||
            data.type.includes('conversation') ||
            data.type.includes('item')
          )) {
            console.log('[ConversationSession] 📥 POTENTIAL TRANSCRIPTION EVENT:', {
              type: data.type,
              hasTranscript: !!data.transcript,
              transcript: data.transcript?.substring(0, 100),
              hasItem: !!data.item,
              itemType: data.item?.type,
              itemRole: data.item?.role,
              itemContent: data.item?.content,
              hasText: !!data.text,
              text: data.text?.substring(0, 100),
              keys: Object.keys(data),
              fullData: JSON.stringify(data, null, 2).substring(0, 1000),
              sessionId: currentSessionId,
            });
          }
          
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
          // IMPORTANTE: Verificar múltiplos formatos de eventos de transcrição do usuário
          // A API Realtime pode enviar transcrições do usuário em diferentes eventos
          let userText = null;
          let isUserTranscription = false;
          let userTranscriptionEventType = null;
          
          // Verificar TODOS os possíveis eventos de transcrição do usuário
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            userText = data.transcript;
            isUserTranscription = true;
            userTranscriptionEventType = data.type;
          } else if (data.type === 'conversation.item.created' && data.item?.role === 'user') {
            // Transcrição pode estar em item.content
            userText = data.item?.content?.[0]?.transcript || data.item?.content?.[0]?.text;
            isUserTranscription = true;
            userTranscriptionEventType = data.type;
          } else if (data.type === 'input_audio_buffer.committed') {
            // Transcrição pode estar em transcript ou text
            userText = data.transcript || data.text;
            isUserTranscription = true;
            userTranscriptionEventType = data.type;
          } else if (data.type === 'conversation.item.input_audio_transcription.delta') {
            // Transcrição incremental - vamos acumular em uma variável temporária
            // Mas por enquanto, vamos apenas logar e esperar pelo .completed
            console.log('[ConversationSession] 📝 User transcription delta received:', {
              delta: data.delta,
              eventType: data.type,
              sessionId: currentSessionId,
            });
          } else if (data.type && data.type.includes('input') && data.type.includes('audio')) {
            // Qualquer evento relacionado a input_audio pode conter transcrição
            console.log('[ConversationSession] 🔍 Checking input_audio event for transcription:', {
              type: data.type,
              hasTranscript: !!data.transcript,
              transcript: data.transcript?.substring(0, 100),
              hasText: !!data.text,
              text: data.text?.substring(0, 100),
              hasItem: !!data.item,
              itemContent: data.item?.content,
              keys: Object.keys(data),
            });
            
            // Tentar extrair texto de vários lugares
            userText = data.transcript || data.text || data.item?.content?.[0]?.transcript || data.item?.content?.[0]?.text;
            if (userText && userText.trim()) {
              isUserTranscription = true;
              userTranscriptionEventType = data.type;
            }
          }
          
          // Se encontrou transcrição do usuário, salvar
          if (isUserTranscription && userText && userText.trim()) {
            console.log('[ConversationSession] 💬✅ User transcription FOUND:', {
              sessionId: currentSessionId,
              hasSessionId: !!currentSessionId,
              textLength: userText?.length,
              textPreview: userText?.substring(0, 50),
              eventType: userTranscriptionEventType,
            });
            
            const newMessage = { type: 'user', text: userText, timestamp: new Date() };
            console.log('[ConversationSession] 📝 Adding user message to state:', {
              textPreview: userText.substring(0, 50),
              timestamp: newMessage.timestamp,
            });
            setMessages((prev) => [...prev, newMessage]);
            
            // Salvar mensagem do usuário no backend
            if (currentSessionId) {
              const eventDataWithUsage = {
                ...data,
                usage: extractedUsage || data.usage,
              };
              
              console.log('[ConversationSession] 💾💾💾 SAVING USER TRANSCRIPTION:', {
                sessionId: currentSessionId,
                textLength: userText.trim().length,
                textPreview: userText.trim().substring(0, 50),
                eventType: userTranscriptionEventType,
              });
              
              conversationsAPI.saveMessage(currentSessionId, {
                role: 'user',
                content: userText.trim(),
                messageType: 'transcription',
                eventType: userTranscriptionEventType,
                eventData: eventDataWithUsage,
              }).then((response) => {
                console.log('[ConversationSession] ✅✅✅ User message saved successfully!', response);
              }).catch((err) => {
                console.error('[ConversationSession] ❌❌❌ Error saving user message:', {
                  error: err,
                  message: err.message,
                  stack: err.stack,
                  sessionId: currentSessionId,
                });
              });
            } else {
              console.error('[ConversationSession] ❌❌❌ Cannot save user message - NO SESSION ID!', {
                sessionId: currentSessionId,
                sessionIdRef: sessionIdRef.current,
              });
            }
          } else if (isUserTranscription && !userText) {
            // Evento de transcrição do usuário recebido mas sem texto
            console.log('[ConversationSession] ⚠️⚠️⚠️ User transcription event received but no text found:', {
              eventType: userTranscriptionEventType || data.type,
              hasTranscript: !!data.transcript,
              transcript: data.transcript,
              hasText: !!data.text,
              text: data.text,
              hasItem: !!data.item,
              itemRole: data.item?.role,
              itemContent: data.item?.content,
              dataKeys: Object.keys(data),
              fullData: JSON.stringify(data, null, 2).substring(0, 1000),
            });
          } else if (data.type === 'conversation.item.output_audio_transcription.completed') {
            const text = data.transcript;
            setMessages((prev) => [...prev, { type: 'assistant', text, timestamp: new Date() }]);
            
            console.log('[ConversationSession] 💬 Assistant transcription received:', {
              sessionId: currentSessionId,
              hasSessionId: !!currentSessionId,
              textLength: text?.length,
              textPreview: text?.substring(0, 50),
            });
            
            // Salvar mensagem do assistente no backend
            if (currentSessionId && text && text.trim()) {
              // Garantir que o eventData tenha o usage correto
              const eventDataWithUsage = {
                ...data,
                usage: extractedUsage || data.usage,
              };
              
              console.log('[ConversationSession] 💾 Saving assistant transcription:', {
                sessionId: currentSessionId,
                textLength: text.trim().length,
              });
              
              conversationsAPI.saveMessage(currentSessionId, {
                role: 'assistant',
                content: text.trim(),
                messageType: 'transcription',
                eventType: data.type,
                eventData: eventDataWithUsage,
              }).then(() => {
                console.log('[ConversationSession] ✅ Assistant message saved successfully');
              }).catch((err) => {
                console.error('[ConversationSession] ❌ Error saving assistant message:', err);
              });
            } else {
              console.warn('[ConversationSession] ⚠️ Cannot save assistant message:', {
                hasSessionId: !!currentSessionId,
                hasText: !!(text && text.trim()),
                sessionId: currentSessionId,
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
          } else if (data.type === 'response.output_audio_transcript.done') {
            // IMPORTANTE: Este é o evento que contém a transcrição completa do assistente
            const text = data.transcript;
            console.log('[ConversationSession] 💬 Assistant audio transcript done:', {
              sessionId: currentSessionId,
              hasSessionId: !!currentSessionId,
              textLength: text?.length,
              textPreview: text?.substring(0, 50),
            });
            
            if (text && text.trim()) {
              setMessages((prev) => [...prev, { type: 'assistant', text, timestamp: new Date() }]);
              
              // Salvar mensagem do assistente no backend
              if (currentSessionId) {
                const eventDataWithUsage = {
                  ...data,
                  usage: extractedUsage || data.usage,
                };
                
                console.log('[ConversationSession] 💾 Saving assistant audio transcript:', {
                  sessionId: currentSessionId,
                  textLength: text.trim().length,
                });
                
                conversationsAPI.saveMessage(currentSessionId, {
                  role: 'assistant',
                  content: text.trim(),
                  messageType: 'transcription',
                  eventType: data.type,
                  eventData: eventDataWithUsage,
                }).then(() => {
                  console.log('[ConversationSession] ✅ Assistant audio transcript saved successfully');
                }).catch((err) => {
                  console.error('[ConversationSession] ❌ Error saving assistant audio transcript:', err);
                });
              }
            }
          } else if (data.type === 'response.output_audio_transcript.delta') {
            // Transcrição de áudio do assistente (incremental) - apenas para exibição em tempo real
            // Não salvar aqui, esperar pelo .done
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
      
      // IMPORTANTE: Atualizar o sessionIdRef ANTES de processar qualquer evento
      // Isso garante que as transcrições sejam salvas com o sessionId correto
      // O backend retorna o sessionId no header X-Session-Id, que é extraído pelo realtimeAPI.createSession
      const finalSessionId = backendSessionId || sessionIdRef.current || initialSessionId;
      
      if (backendSessionId) {
        console.log('[ConversationSession] ✅ Using backend sessionId from header:', backendSessionId);
        setSessionId(backendSessionId);
        // Atualizar o sessionIdRef IMEDIATAMENTE para que o dataChannel.onmessage use o valor correto
        sessionIdRef.current = backendSessionId;
        console.log('[ConversationSession] ✅ Updated sessionIdRef to:', backendSessionId);
      } else {
        // Se não recebeu sessionId do backend, usar o sessionId inicial que já foi definido
        console.warn('[ConversationSession] ⚠️ No backend sessionId received, using initial sessionId:', sessionIdRef.current);
        // sessionIdRef.current já foi atualizado acima, não precisa atualizar novamente
      }
      
      // Garantir que o sessionIdRef está definido antes de continuar
      if (!sessionIdRef.current) {
        console.error('[ConversationSession] ❌ CRITICAL: sessionIdRef.current is null! This will prevent messages from being saved.');
        sessionIdRef.current = initialSessionId; // Fallback de emergência
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
      savedMessagesRef.current.clear(); // Limpar mensagens salvas ao encerrar sessão
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

      const userTextMessage = { type: 'user', text, timestamp: new Date() };
      console.log('[ConversationSession] 📝 Adding user TEXT message to state:', {
        textPreview: text.substring(0, 50),
        timestamp: userTextMessage.timestamp,
        sessionId,
      });
      setMessages((prev) => [...prev, userTextMessage]);
      
      // Salvar mensagem de texto do usuário no backend
      if (sessionId && text && text.trim()) {
        console.log('[ConversationSession] 💾 Saving user TEXT message immediately:', {
          sessionId,
          textPreview: text.substring(0, 50),
        });
        conversationsAPI.saveMessage(sessionId, {
          role: 'user',
          content: text.trim(),
          messageType: 'text',
          eventType: 'conversation.item.create',
          eventData: { type: 'message', role: 'user', content: text },
        }).then(() => {
          console.log('[ConversationSession] ✅✅✅ User TEXT message saved successfully!');
        }).catch((err) => {
          console.error('[ConversationSession] ❌❌❌ Error saving user TEXT message:', err);
        });
      } else {
        console.warn('[ConversationSession] ⚠️ Cannot save user TEXT message:', {
          hasSessionId: !!sessionId,
          hasText: !!(text && text.trim()),
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

