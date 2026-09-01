"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { EbpfEvent } from "./use-ebpf-stream";

export function usePersonalStream(token: string | null, bufferLimit: number = 200) {
  const [events, setEvents] = useState<EbpfEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clearEvents = useCallback(() => setEvents([]), []);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  useEffect(() => {
    const url = token
      ? `${apiUrl}/api/v1/telemetry/stream?token=${encodeURIComponent(token)}`
      : `${apiUrl}/api/v1/telemetry/stream`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    es.addEventListener("ebpf_event", (e: MessageEvent) => {
      try {
        const parsed: EbpfEvent = JSON.parse(e.data);
        setEvents((prev) => [parsed, ...prev.slice(0, bufferLimit - 1)]);
      } catch (err) {
        console.error("Personal SSE parsing error:", err);
      }
    });

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [token, apiUrl, bufferLimit]);

  return { events, isConnected, clearEvents };
}
