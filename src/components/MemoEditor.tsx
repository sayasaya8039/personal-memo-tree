import { useState, useEffect, useRef } from "react";
import type { MemoNode } from "../types";

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
    // リンク
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setContent(node.content);
    }
  }, [node?.id]);

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
        />
      ) : (
        <textarea
          ref={textareaRef}
          className="content-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メモ内容を入力..."
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
