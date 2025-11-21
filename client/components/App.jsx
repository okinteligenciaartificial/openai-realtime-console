import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import samanthaImage from "/assets/samantha.jpg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
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
  function stopSession() {
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
  }

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
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);
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
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-12 md:h-16 flex items-center z-20 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-4 w-full m-2 md:m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "20px" }} className="md:w-6" src={logo} />
          <h1 className="text-sm md:text-base font-semibold">realtime console</h1>
        </div>
      </nav>
      <main className="absolute top-12 md:top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-0 md:right-[380px] bottom-0 flex relative">
          {/* Container com imagem de fundo */}
          <section className="absolute top-0 left-0 right-0 bottom-24 md:bottom-32 px-2 md:px-4 overflow-y-auto relative">
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
