import { useEffect } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { getSocketBaseUrl } from "../lib/network";

export function useRealtimeNotifications(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    const socket = io(getSocketBaseUrl(), {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 5000,
      timeout: 7000,
      transports: ["polling", "websocket"]
    });

    socket.on("notification", (payload) => {
      toast(payload?.message || "Ново известие.");
    });

    socket.on("connect_error", () => {
      // Notification channel is optional. Ignore transient failures.
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);
}
