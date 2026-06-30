import { useEffect, useRef } from "react";

function isTypingTarget(target) {
  if (!target) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest?.("[contenteditable='true']"));
}

export function useBarcodeKeyboardScan(onScan, enabled = true) {
  const onScanRef = useRef(onScan);
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return undefined;

    const config = typeof enabled === "object" ? enabled : {};
    const captureInInputs = Boolean(config.captureInInputs);
    const flushOnIdle = Boolean(config.flushOnIdle);
    const minLength = Number.isFinite(Number(config.minLength)) ? Number(config.minLength) : 4;
    const idleMs = Number.isFinite(Number(config.idleMs)) ? Number(config.idleMs) : 90;

    function flushBuffer() {
      const rawCode = bufferRef.current.trim();
      bufferRef.current = "";
      if (!rawCode || rawCode.length < minLength) return;
      onScanRef.current?.(rawCode);
    }

    function scheduleIdleFlush() {
      if (!flushOnIdle) return;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        flushBuffer();
      }, idleMs);
    }

    function onWindowKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;

      const typingTarget = isTypingTarget(event.target);
      const isSubmitKey =
        event.key === "Enter" ||
        event.key === "Tab" ||
        event.key === "Process" ||
        event.code === "Enter" ||
        event.code === "NumpadEnter" ||
        event.code === "Tab";

      const now = Date.now();
      if (now - lastKeyAtRef.current > 120) {
        bufferRef.current = "";
      }
      lastKeyAtRef.current = now;

      if (event.key.length === 1) {
        if (typingTarget && !captureInInputs) return;
        bufferRef.current += event.key;
        if (bufferRef.current.length > 220) {
          bufferRef.current = "";
        }
        scheduleIdleFlush();
        return;
      }

      if (!isSubmitKey) {
        if (typingTarget && !captureInInputs) return;
        return;
      }

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      event.preventDefault();
      flushBuffer();
    }

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, true);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [enabled]);
}