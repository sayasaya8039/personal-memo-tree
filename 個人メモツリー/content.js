"use strict";
(() => {
  // src/content.ts
  var safeStorageSet = (data) => {
    try {
      chrome.storage.local.set(data).catch(() => {
      });
    } catch {
    }
  };
  document.addEventListener("dragstart", (e) => {
    const target = e.target;
    if (target.tagName === "IMG") {
      const img = target;
      safeStorageSet({
        draggedContent: {
          type: "image",
          content: img.src,
          alt: img.alt || "",
          sourceUrl: window.location.href,
          sourceTitle: document.title,
          timestamp: Date.now()
        }
      });
      return;
    }
    const anchor = target.closest("a");
    if (anchor?.href && !anchor.href.startsWith("javascript:")) {
      safeStorageSet({
        draggedContent: {
          type: "link",
          content: anchor.href,
          text: anchor.textContent?.trim() || anchor.href,
          sourceUrl: window.location.href,
          sourceTitle: document.title,
          timestamp: Date.now()
        }
      });
      return;
    }
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText) {
      safeStorageSet({
        draggedContent: {
          type: "text",
          content: selectedText,
          sourceUrl: window.location.href,
          sourceTitle: document.title,
          timestamp: Date.now()
        }
      });
      return;
    }
  });
  var lastMouseDownImage = null;
  document.addEventListener("mousedown", (e) => {
    const target = e.target;
    if (target.tagName === "IMG") {
      lastMouseDownImage = target;
    } else {
      lastMouseDownImage = null;
    }
  });
  document.addEventListener("dragend", () => {
    lastMouseDownImage = null;
  });
  document.addEventListener("drag", (e) => {
    if (lastMouseDownImage && e.target === lastMouseDownImage) {
      safeStorageSet({
        draggedContent: {
          type: "image",
          content: lastMouseDownImage.src,
          alt: lastMouseDownImage.alt || "",
          sourceUrl: window.location.href,
          sourceTitle: document.title,
          timestamp: Date.now()
        }
      });
    }
  });
})();
