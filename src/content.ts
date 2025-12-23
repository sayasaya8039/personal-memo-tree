// Content Script - ページからのドラッグを監視

// 拡張機能コンテキストが有効かチェック
const safeStorageSet = (data: object) => {
  try {
    chrome.storage.local.set(data);
  } catch (e) {
    // Extension context invalidated - ページリロードが必要
    console.log("個人メモツリー: Extension reloaded, please refresh the page");
  }
};

document.addEventListener("dragstart", (e) => {
  const target = e.target as HTMLElement;

  // 1. 画像のドラッグ（最優先）
  if (target.tagName === "IMG") {
    const img = target as HTMLImageElement;
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
    console.log("個人メモツリー: Image drag detected", img.src);
    return;
  }

  // 2. リンクのドラッグ
  const anchor = target.closest("a") as HTMLAnchorElement | null;
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
    console.log("個人メモツリー: Link drag detected", anchor.href);
    return;
  }

  // 3. 選択テキストのドラッグ
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
    console.log("個人メモツリー: Text drag detected", selectedText.substring(0, 50));
    return;
  }
});

// 画像の場合、dragstartが発火しないケースがあるのでmousedownでも監視
let lastMouseDownImage: HTMLImageElement | null = null;

document.addEventListener("mousedown", (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === "IMG") {
    lastMouseDownImage = target as HTMLImageElement;
  } else {
    lastMouseDownImage = null;
  }
});

document.addEventListener("dragend", () => {
  lastMouseDownImage = null;
});

// ドラッグ中の画像を検出（dragstartが発火しない場合の対策）
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

console.log("個人メモツリー: Content Script loaded");
