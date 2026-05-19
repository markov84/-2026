import { useEffect } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { getSocketBaseUrl } from "../lib/network";

export function useRealtimeNotifications(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    const socket = io(getSocketBaseUrl());

    socket.on("notification", (payload) => {
      toast(payload?.message || "Ново известие.");
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);
}
