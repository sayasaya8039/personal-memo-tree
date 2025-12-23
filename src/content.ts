// Content Script - ページからのドラッグを監視

// ドラッグ開始時に選択テキストを保存
document.addEventListener("dragstart", (e) => {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  
  if (selectedText) {
    // 選択テキストをストレージに一時保存
    chrome.storage.local.set({ 
      draggedContent: {
        type: "text",
        content: selectedText,
        sourceUrl: window.location.href,
        sourceTitle: document.title,
        timestamp: Date.now()
      }
    });
  }
});

// 画像のドラッグ
document.addEventListener("dragstart", (e) => {
  const target = e.target as HTMLElement;
  
  if (target.tagName === "IMG") {
    const img = target as HTMLImageElement;
    chrome.storage.local.set({
      draggedContent: {
        type: "image",
        content: img.src,
        alt: img.alt || "",
        sourceUrl: window.location.href,
        sourceTitle: document.title,
        timestamp: Date.now()
      }
    });
  }
});

// リンクのドラッグ
document.addEventListener("dragstart", (e) => {
  const target = e.target as HTMLElement;
  const anchor = target.closest("a") as HTMLAnchorElement | null;
  
  if (anchor?.href) {
    chrome.storage.local.set({
      draggedContent: {
        type: "link",
        content: anchor.href,
        text: anchor.textContent?.trim() || anchor.href,
        sourceUrl: window.location.href,
        sourceTitle: document.title,
        timestamp: Date.now()
      }
    });
  }
});

console.log("個人メモツリー: Content Script loaded");
