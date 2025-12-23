import type { PageMemoTree, MemoNode, ExportFormat } from "../types";

// メモノードをMarkdownに変換（再帰）
const nodeToMarkdown = (node: MemoNode, depth: number = 0): string => {
  const indent = "  ".repeat(depth);
  const heading = "#".repeat(Math.min(depth + 2, 6));
  let md = "";

  md += depth === 0
    ? `${heading} ${node.name}\n\n`
    : `${indent}- **${node.name}**\n`;

  if (node.content) {
    md += depth === 0
      ? `${node.content}\n\n`
      : `${indent}  ${node.content.replace(/\n/g, "\n" + indent + "  ")}\n\n`;
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      md += nodeToMarkdown(child, depth + 1);
    }
  }

  return md;
};

// ページメモツリーをMarkdownに変換
export const treeToMarkdown = (tree: PageMemoTree): string => {
  let md = `# ${tree.title}\n\n`;
  md += `> URL: ${tree.url}\n\n`;
  md += `---\n\n`;

  for (const node of tree.rootNodes) {
    md += nodeToMarkdown(node);
  }

  return md;
};

// NotebookLM用にフラット化したテキストを生成
export const treeToNotebookLM = (tree: PageMemoTree): string => {
  let text = `タイトル: ${tree.title}\n`;
  text += `URL: ${tree.url}\n\n`;
  text += `=== メモ内容 ===\n\n`;

  const flattenNode = (node: MemoNode, path: string[] = []): string => {
    let result = "";
    const currentPath = [...path, node.name];

    result += `【${currentPath.join(" > ")}】\n`;
    if (node.content) {
      result += `${node.content}\n`;
    }
    result += "\n";

    if (node.children) {
      for (const child of node.children) {
        result += flattenNode(child, currentPath);
      }
    }

    return result;
  };

  for (const node of tree.rootNodes) {
    text += flattenNode(node);
  }

  return text;
};

// エクスポート実行
export const exportTree = (tree: PageMemoTree, format: ExportFormat): string => {
  switch (format) {
    case "json":
      return JSON.stringify(tree, null, 2);
    case "markdown":
      return treeToMarkdown(tree);
    case "notebooklm":
      return treeToNotebookLM(tree);
    default:
      return JSON.stringify(tree, null, 2);
  }
};

// ファイルとしてダウンロード
export const downloadExport = (content: string, filename: string, format: ExportFormat): void => {
  const mimeTypes: Record<ExportFormat, string> = {
    json: "application/json",
    markdown: "text/markdown",
    notebooklm: "text/plain",
  };

  const extensions: Record<ExportFormat, string> = {
    json: "json",
    markdown: "md",
    notebooklm: "txt",
  };

  const blob = new Blob([content], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${extensions[format]}`;
  a.click();
  URL.revokeObjectURL(url);
};

// 全ツリーをエクスポート
export const exportAllTrees = (trees: PageMemoTree[], format: ExportFormat): string => {
  if (format === "json") {
    return JSON.stringify(trees, null, 2);
  }

  return trees.map((tree) => exportTree(tree, format)).join("\n\n---\n\n");
};
