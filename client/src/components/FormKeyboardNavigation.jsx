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

  return false;
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
      if (!event.shiftKey) return;

      const activeElement = document.activeElement;
      if (!activeElement || !isFocusableElement(activeElement)) return;

      const container = activeElement.closest("form, .MuiDialog-container, .MuiPaper-root");
      if (!container) return;

      event.preventDefault();
      focusNextElement(container, activeElement, true);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return null;
}
