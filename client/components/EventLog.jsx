import { ArrowUp, ArrowDown } from "react-feather";
import { useState } from "react";

function Event({ event, timestamp }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isClient = event.event_id && !event.event_id.startsWith("event_");

  return (
    <div className="flex flex-col gap-2 p-2 md:p-3 rounded-md bg-white/90 backdrop-blur-sm shadow-md border border-gray-200/50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isClient ? (
          <ArrowDown className="text-blue-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
        ) : (
          <ArrowUp className="text-green-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
        )}
        <div className="text-xs md:text-sm text-gray-700 font-medium break-words">
          {isClient ? "client:" : "server:"}
          &nbsp;{event.type} | {timestamp}
        </div>
      </div>
      <div
        className={`text-gray-700 bg-white/80 backdrop-blur-sm p-2 rounded-md overflow-x-auto border border-gray-200/50 ${
          isExpanded ? "block" : "hidden"
        }`}
      >
        <pre className="text-xs">{JSON.stringify(event, null, 2)}</pre>
      </div>
    </div>
  );
}

export default function EventLog({ events }) {
  const eventsToDisplay = [];
  let deltaEvents = {};

  events.forEach((event) => {
    if (event.type.endsWith("delta")) {
      if (deltaEvents[event.type]) {
        // for now just log a single event per render pass
        return;
      } else {
        deltaEvents[event.type] = event;
      }
    }

    eventsToDisplay.push(
      <Event key={event.event_id} event={event} timestamp={event.timestamp} />,
    );
  });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {events.length === 0 ? (
        <div className="text-gray-600 font-medium bg-white/80 backdrop-blur-sm p-4 rounded-md shadow-md border border-gray-200/50">
          Awaiting events...
        </div>
      ) : (
        eventsToDisplay
      )}
    </div>
  );
}
