import { useState, useEffect, useRef } from "react";
import type { MemoNode } from "../types";

interface DraggedContent {
  type: "text" | "image" | "link";
  content: string;
  text?: string;
  alt?: string;
  sourceUrl: string;
  sourceTitle: string;
  timestamp: number;
}

interface MemoEditorProps {
  node: MemoNode | null;
  onUpdate: (node: MemoNode) => void;
}

// シンプルなMarkdownプレビュー
const renderMarkdown = (text: string): string => {
  if (!text) return "";

  return text
    // コードブロック
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // インラインコード
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // 太字
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // 斜体
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // 画像（リンクより先に処理）
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="memo-image" loading="lazy" />')
    // リンク
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 生のURL（既にリンク化されていないもの）
    .replace(/(?<!href=")(?<!src=")(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank">$1</a>')
    // リスト
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    // 見出し
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // 改行
    .replace(/\n/g, "<br>");
};

export const MemoEditor = ({ node, onUpdate }: MemoEditorProps) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setContent(node.content);
    }
  }, [node?.id]);

  // コンテンツを末尾に追加するヘルパー
  const appendContent = (insertText: string) => {
    if (insertText) {
      setContent(prevContent => {
        const separator = prevContent && !prevContent.endsWith("\n") ? "\n" : "";
        return prevContent + separator + insertText;
      });
    }
  };

  // ファイルを読み込んでテキストまたはBase64として返す
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });
  };

  // 画像をリサイズ＆圧縮してBase64化（サムネイル用）
  const resizeAndCompressImage = (file: File, maxWidth = 300, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        // リサイズ計算
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // JPEG圧縮してBase64化
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = () => resolve("");

      // ファイルを読み込んでImage要素に設定
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ドロップを処理（外部 + 内部ページ両対応）
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const dt = e.dataTransfer;

    // 1. 外部からのファイルドロップ
    if (dt.files && dt.files.length > 0) {
      for (const file of Array.from(dt.files)) {
        if (file.type.startsWith("image/")) {
          // 画像ファイル → Base64で埋め込み
          const dataUrl = await resizeAndCompressImage(file);
          appendContent(`![${file.name}](${dataUrl})`);
        } else if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
          // テキストファイル → 内容を読み込み
          const text = await readFileAsText(file);
          appendContent(text);
        }
      }
      return;
    }

    // 2. 外部からのテキスト/URLドロップ
    const droppedText = dt.getData("text/plain");
    const droppedUrl = dt.getData("text/uri-list");
    const droppedHtml = dt.getData("text/html");

    if (droppedUrl && droppedUrl.startsWith("http")) {
      // URLがドロップされた
      // HTMLから画像かどうか判定
      if (droppedHtml && droppedHtml.includes("<img")) {
        const match = droppedHtml.match(/src="([^"]+)"/);
        if (match) {
          appendContent(`![画像](${match[1]})`);
          return;
        }
      }
      appendContent(`[${droppedText || droppedUrl}](${droppedUrl})`);
      return;
    }

    if (droppedText && !droppedText.startsWith("http")) {
      // 純粋なテキスト
      appendContent(droppedText);
      return;
    }

    // 3. 内部ページからのドロップ（Content Script経由）
    try {
      const result = await chrome.storage.local.get("draggedContent");
      const draggedContent = result.draggedContent as DraggedContent | undefined;

      if (draggedContent && Date.now() - draggedContent.timestamp < 5000) {
        let insertText = "";

        switch (draggedContent.type) {
          case "text":
            insertText = draggedContent.content;
            break;
          case "image":
            insertText = `![${draggedContent.alt || "画像"}](${draggedContent.content})`;
            break;
          case "link":
            insertText = `[${draggedContent.text}](${draggedContent.content})`;
            break;
        }

        appendContent(insertText);
        chrome.storage.local.remove("draggedContent");
      }
    } catch {
      // chrome.storage unavailable (development mode)
    }
  };

  const handleSave = () => {
    if (!node) return;
    onUpdate({
      ...node,
      name,
      content,
      updatedAt: Date.now(),
    });
  };

  // 自動保存（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (node && (name !== node.name || content !== node.content)) {
        handleSave();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name, content]);

  // 選択範囲にフォーマットを適用
  const applyFormat = (prefix: string, suffix: string, linePrefix?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (linePrefix) {
      // 行頭に追加（リスト、見出し）
      const beforeSelection = content.substring(0, start);
      const lastNewline = beforeSelection.lastIndexOf("\n");
      const lineStart = lastNewline + 1;

      newText =
        content.substring(0, lineStart) +
        linePrefix +
        content.substring(lineStart);
      newCursorPos = end + linePrefix.length;
    } else if (selectedText) {
      // 選択範囲を囲む
      newText =
        content.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        content.substring(end);
      newCursorPos = end + prefix.length + suffix.length;
    } else {
      // 選択なしの場合、プレースホルダーを挿入
      const placeholder = "テキスト";
      newText =
        content.substring(0, start) +
        prefix +
        placeholder +
        suffix +
        content.substring(end);
      newCursorPos = start + prefix.length;

      // プレースホルダーを選択状態にする
      setTimeout(() => {
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + placeholder.length
        );
        textarea.focus();
      }, 0);
      setContent(newText);
      return;
    }

    setContent(newText);

    // カーソル位置を復元
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  if (!node) {
    return (
      <div className="memo-editor empty">
        <p>メモを選択してください</p>
      </div>
    );
  }

  return (
    <div className="memo-editor">
      <input
        type="text"
        className="node-name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="メモタイトル"
      />
      <div className="editor-toolbar">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${!isPreview ? "active" : ""}`}
            onClick={() => setIsPreview(false)}
          >
            編集
          </button>
          <button
            className={`tab-btn ${isPreview ? "active" : ""}`}
            onClick={() => setIsPreview(true)}
          >
            プレビュー
          </button>
        </div>
        {!isPreview && (
          <div className="format-buttons">
            <button
              className="format-btn"
              onClick={() => applyFormat("**", "**")}
              title="太字 (Ctrl+B)"
            >
              <b>B</b>
            </button>
            <button
              className="format-btn"
              onClick={() => applyFormat("*", "*")}
              title="斜体 (Ctrl+I)"
            >
              <i>I</i>
            </button>
            <button
              className="format-btn"
              onClick={() => applyFormat("`", "`")}
              title="コード"
            >
              &lt;/&gt;
            </button>
            <button
              className="format-btn"
              onClick={() => applyFormat("", "", "- ")}
              title="リスト"
            >
              ●
            </button>
            <button
              className="format-btn"
              onClick={() => applyFormat("", "", "# ")}
              title="見出し"
            >
              H
            </button>
            <button
              className="format-btn"
              onClick={() => applyFormat("[", "](url)")}
              title="リンク"
            >
              🔗
            </button>
          </div>
        )}
      </div>
      {isPreview ? (
        <div
          className="preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "A") {
              e.preventDefault();
              const href = (target as HTMLAnchorElement).href;
              if (href) {
                chrome.tabs?.create({ url: href }) || window.open(href, "_blank");
              }
            } else if (target.tagName === "IMG") {
              const src = (target as HTMLImageElement).src;
              if (src) {
                chrome.tabs?.create({ url: src }) || window.open(src, "_blank");
              }
            }
          }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          className={`content-textarea ${isDragOver ? "drag-over" : ""}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="ページからテキスト/画像/リンクをドラッグ&ドロップできます"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onKeyDown={(e) => {
            // キーボードショートカット
            if (e.ctrlKey || e.metaKey) {
              if (e.key === "b") {
                e.preventDefault();
                applyFormat("**", "**");
              } else if (e.key === "i") {
                e.preventDefault();
                applyFormat("*", "*");
              }
            }
          }}
        />
      )}
      <div className="editor-footer">
        <span className="timestamp">
          更新: {new Date(node.updatedAt).toLocaleString("ja-JP")}
        </span>
      </div>
    </div>
  );
};
