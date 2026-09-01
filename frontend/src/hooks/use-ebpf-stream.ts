"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface EbpfEvent {
  timestamp: string;
  pid: number;
  comm: string;
  event_type: string;
  syscall: string;
  details: Record<string, unknown>;
  severity: "INFO" | "WARN" | "CRIT";
}

export function useEbpfStream(streamUrl: string, bufferLimit: number = 200) {
  const [events, setEvents] = useState<EbpfEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clearEvents = useCallback(() => setEvents([]), []);

  useEffect(() => {
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    es.addEventListener("ebpf_event", (messageEvent: MessageEvent) => {
      try {
        const parsedEvent: EbpfEvent = JSON.parse(messageEvent.data);
        setEvents((prev) => [parsedEvent, ...prev.slice(0, bufferLimit - 1)]);
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [streamUrl, bufferLimit]);

  return { events, isConnected, clearEvents };
}
