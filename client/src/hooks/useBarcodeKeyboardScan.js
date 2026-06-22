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

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return undefined;

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
        if (typingTarget) return;
        bufferRef.current += event.key;
        if (bufferRef.current.length > 220) {
          bufferRef.current = "";
        }
        return;
      }

      if (!isSubmitKey) {
        if (typingTarget) return;
        return;
      }

      const rawCode = bufferRef.current.trim();
      bufferRef.current = "";
      if (!rawCode || rawCode.length < 4) return;

      event.preventDefault();
      onScanRef.current?.(rawCode);
    }

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => window.removeEventListener("keydown", onWindowKeyDown, true);
  }, [enabled]);
}