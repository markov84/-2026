import { useEffect } from "react";

function isFocusableElement(element) {
  if (!element) return false;

  if (element.closest('[data-no-form-navigation="true"]')) return false;

  const tagName = element.tagName?.toLowerCase();
  if (tagName === "button" || tagName === "a" || tagName === "select" || tagName === "textarea") return true;
  if (tagName === "input") {
    const type = (element.type || "text").toLowerCase();
    if (["hidden", "submit", "button", "checkbox", "radio", "file"].includes(type)) return false;
    return true;
  }

  return element.getAttribute("role") === "button" || element.getAttribute("tabindex") === "0";
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll("input, select, textarea, button, a, [role='button'], [tabindex='0']")).filter((element) => {
    if (!isFocusableElement(element)) return false;
    if (element.offsetParent === null && element.getAttribute("aria-hidden") === "true") return false;
    return true;
  });
}

function focusNextElement(container, currentElement, reverse = false) {
  const candidates = getFocusableElements(container);
  if (!candidates.length) return false;

  const currentIndex = candidates.indexOf(currentElement);
  if (currentIndex === -1) return false;

  const nextIndex = reverse
    ? (currentIndex - 1 + candidates.length) % candidates.length
    : (currentIndex + 1) % candidates.length;

  const nextElement = candidates[nextIndex];
  if (nextElement) {
    nextElement.focus();
    if (typeof nextElement.select === "function" && nextElement.tagName?.toLowerCase() === "input") {
      nextElement.select();
    }
    return true;
  }

  return false;
}

export default function FormKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      if (!activeElement) return;

      const isTextLike = ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
      if (!isTextLike && event.key !== "Enter") return;

      if (event.key === "Enter" && !isTextLike) return;

      if (event.key === "Enter" && activeElement.tagName === "TEXTAREA") return;

      if (event.key === "Enter" && activeElement.tagName === "INPUT") {
        const inputType = (activeElement.type || "text").toLowerCase();
        if (["checkbox", "radio", "button", "submit", "reset", "file"].includes(inputType)) return;
      }

      const container = activeElement.closest(".MuiDialog-container, form, .MuiStack-root, .MuiBox-root, .MuiPaper-root");
      if (!container) return;

      const shouldMoveForward = event.key === "Enter" || (event.key === "Tab" && !event.shiftKey);
      const shouldMoveBackward = event.key === "Tab" && event.shiftKey;

      if (!shouldMoveForward && !shouldMoveBackward) return;

      if (event.key === "Enter") {
        event.preventDefault();
        const next = focusNextElement(container, activeElement, false);
        if (!next) {
          const dialogButton = activeElement.closest(".MuiDialog-root")?.querySelector("button");
          dialogButton?.focus();
        }
        return;
      }

      event.preventDefault();
      focusNextElement(container, activeElement, event.shiftKey);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return null;
}
