import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import logo from "/assets/openai-logomark.svg";
import samanthaImage from "/assets/samantha.jpg";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";
import SessionMetrics from "./SessionMetrics";
import LimitAlerts from "./LimitAlerts";
import UserDashboard from "./UserDashboard";
import SessionHistory from "./SessionHistory";
import UserProfile from "./UserProfile";

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="text-xs md:text-sm text-indigo-600 hover:text-indigo-800"
    >
      Sair
    </button>
  );
}

export default function App() {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Estados para métricas
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const userId = user?.id;
  
  // Navegação
  const [currentView, setCurrentView] = useState('session'); // session, dashboard, history, profile

  async function startSession() {
    // Gerar session_id único
    const newSessionId = crypto.randomUUID();
    setCurrentSessionId(newSessionId);
    setSessionStartTime(new Date());

    // Criar sessão no backend
    try {
      const token = localStorage.getItem('token');
      await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: newSessionId,
          model: "gpt-4o-mini-realtime-preview",
        }),
      });
    } catch (error) {
      console.error("Error creating session in backend:", error);
      // Continuar mesmo se falhar (para desenvolvimento)
    }

    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime/calls";
    const model = "gpt-4o-mini-realtime-preview";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const sdp = await sdpResponse.text();
    const answer = { type: "answer", sdp };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  async function stopSession() {
    // Finalizar sessão no backend
    if (currentSessionId) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/sessions/${currentSessionId}/finalize`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Error finalizing session in backend:", error);
      }
      setCurrentSessionId(null);
    }

    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    setSessionStartTime(null);
  }
  
  const handleLimitExceeded = (type) => {
    alert(`Limite de ${type === 'tokens' ? 'tokens' : 'sessões'} excedido. Não é possível iniciar uma nova sessão.`);
  };

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", async (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);

        // Capturar tokens quando response.done for recebido
        if (event.type === "response.done" && event.response?.usage && currentSessionId) {
          const usage = event.response.usage;
          const inputTokens = usage.input_tokens || 0;
          const outputTokens = usage.output_tokens || 0;

          // Atualizar métricas locais (estimativa de custo: $0.15/1M input, $0.60/1M output)
          const cost = (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.60;
          if (window.updateSessionMetrics) {
            window.updateSessionMetrics(inputTokens, outputTokens, cost);
          }

          // Enviar métricas para o backend
          try {
            const token = localStorage.getItem('token');
            await fetch(`/api/sessions/${currentSessionId}/metrics`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({
                input_tokens: inputTokens,
                output_tokens: outputTokens,
              }),
            });
          } catch (error) {
            console.error("Error sending metrics to backend:", error);
          }
        }
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        
        // Enviar instruções do sistema após a sessão ser criada
        setTimeout(() => {
          const sessionUpdate = {
            type: "session.update",
            session: {
              instructions: `You are a helpful assistant. You MUST ONLY speak and respond in American English or Brazilian Portuguese. 
              
              - If the user speaks in English, respond in American English.
              - If the user speaks in Portuguese, respond in Brazilian Portuguese.
              - Never use any other language or dialect.
              - Always match the language the user is using.
              - Keep your responses natural and conversational in the chosen language.`,
            },
          };
          sendClientEvent(sessionUpdate);
        }, 500);
      });
    }
  }, [dataChannel, currentSessionId, userId]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar login se não autenticado
  if (!isAuthenticated) {
    return <Login />;
  }

  // Mostrar dashboard admin se for admin
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Interface normal para alunos
  // Mostrar diferentes views baseado na navegação
  if (currentView === 'dashboard') {
    return (
      <>
        <nav className="absolute top-0 left-0 right-0 h-12 md:h-16 flex items-center justify-between z-20 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 md:gap-4 w-full m-2 md:m-4 pb-2 border-0 border-b border-solid border-gray-200">
            <img style={{ width: "20px" }} className="md:w-6" src={logo} />
            <h1 className="text-sm md:text-base font-semibold">realtime console</h1>
            <div className="ml-auto flex items-center gap-2 md:gap-4">
              <nav className="flex gap-2 md:gap-4">
                <button
                  onClick={() => setCurrentView('session')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'session' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sessão
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('history')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Histórico
                </button>
                <button
                  onClick={() => setCurrentView('profile')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'profile' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Perfil
                </button>
              </nav>
              <span className="text-xs md:text-sm text-gray-600 hidden md:inline">{user?.name}</span>
              <LogoutButton />
            </div>
          </div>
        </nav>
        <main className="absolute top-12 md:top-16 left-0 right-0 bottom-0 overflow-y-auto">
          <UserDashboard />
        </main>
      </>
    );
  }

  if (currentView === 'history') {
    return (
      <>
        <nav className="absolute top-0 left-0 right-0 h-12 md:h-16 flex items-center justify-between z-20 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 md:gap-4 w-full m-2 md:m-4 pb-2 border-0 border-b border-solid border-gray-200">
            <img style={{ width: "20px" }} className="md:w-6" src={logo} />
            <h1 className="text-sm md:text-base font-semibold">realtime console</h1>
            <div className="ml-auto flex items-center gap-2 md:gap-4">
              <nav className="flex gap-2 md:gap-4">
                <button
                  onClick={() => setCurrentView('session')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'session' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sessão
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('history')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Histórico
                </button>
                <button
                  onClick={() => setCurrentView('profile')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'profile' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Perfil
                </button>
              </nav>
              <span className="text-xs md:text-sm text-gray-600 hidden md:inline">{user?.name}</span>
              <LogoutButton />
            </div>
          </div>
        </nav>
        <main className="absolute top-12 md:top-16 left-0 right-0 bottom-0 overflow-y-auto">
          <SessionHistory />
        </main>
      </>
    );
  }

  if (currentView === 'profile') {
    return (
      <>
        <nav className="absolute top-0 left-0 right-0 h-12 md:h-16 flex items-center justify-between z-20 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 md:gap-4 w-full m-2 md:m-4 pb-2 border-0 border-b border-solid border-gray-200">
            <img style={{ width: "20px" }} className="md:w-6" src={logo} />
            <h1 className="text-sm md:text-base font-semibold">realtime console</h1>
            <div className="ml-auto flex items-center gap-2 md:gap-4">
              <nav className="flex gap-2 md:gap-4">
                <button
                  onClick={() => setCurrentView('session')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'session' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sessão
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('history')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Histórico
                </button>
                <button
                  onClick={() => setCurrentView('profile')}
                  className={`text-xs md:text-sm px-2 py-1 rounded ${
                    currentView === 'profile' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Perfil
                </button>
              </nav>
              <span className="text-xs md:text-sm text-gray-600 hidden md:inline">{user?.name}</span>
              <LogoutButton />
            </div>
          </div>
        </nav>
        <main className="absolute top-12 md:top-16 left-0 right-0 bottom-0 overflow-y-auto">
          <UserProfile />
        </main>
      </>
    );
  }

  // View de sessão (padrão)
  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-12 md:h-16 flex items-center justify-between z-20 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-4 w-full m-2 md:m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "20px" }} className="md:w-6" src={logo} />
          <h1 className="text-sm md:text-base font-semibold">realtime console</h1>
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <nav className="flex gap-2 md:gap-4">
              <button
                onClick={() => setCurrentView('session')}
                className={`text-xs md:text-sm px-2 py-1 rounded ${
                  currentView === 'session' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sessão
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`text-xs md:text-sm px-2 py-1 rounded ${
                  currentView === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`text-xs md:text-sm px-2 py-1 rounded ${
                  currentView === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Histórico
              </button>
              <button
                onClick={() => setCurrentView('profile')}
                className={`text-xs md:text-sm px-2 py-1 rounded ${
                  currentView === 'profile' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Perfil
              </button>
            </nav>
            <span className="text-xs md:text-sm text-gray-600 hidden md:inline">{user?.name}</span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="absolute top-12 md:top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-0 md:right-[380px] bottom-0 flex relative">
          {/* Container com imagem de fundo */}
          <section className="absolute top-0 left-0 right-0 bottom-24 md:bottom-32 px-2 md:px-4 overflow-y-auto relative">
            {/* Alertas de Limites */}
            {!isSessionActive && <LimitAlerts onLimitExceeded={handleLimitExceeded} />}
            
            {/* Métricas da Sessão */}
            {isSessionActive && sessionStartTime && (
              <SessionMetrics sessionId={currentSessionId} startTime={sessionStartTime} />
            )}
            
            {/* Imagem da professora em tela cheia */}
            <div className="fixed inset-0 top-12 md:top-16 right-0 md:right-[380px] bottom-24 md:bottom-32 pointer-events-none z-0">
              <img 
                src={samanthaImage} 
                alt="English Teacher - Samantha" 
                className="w-full h-full object-cover object-center opacity-100"
              />
            </div>
            
            {/* Eventos sobrepostos */}
            <div className="relative z-10">
              <EventLog events={events} />
            </div>
          </section>
          <section className="absolute h-24 md:h-32 left-0 right-0 bottom-0 p-2 md:p-4 z-10 bg-white/90 backdrop-blur-sm md:bg-transparent">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        {/* ToolPanel - escondido em mobile, visível em desktop */}
        <section className="hidden md:block absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto bg-white/95 backdrop-blur-sm">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
          />
        </section>
      </main>
    </>
  );
}
