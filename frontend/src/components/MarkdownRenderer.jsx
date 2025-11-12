import { useMemo } from "react";

const escapeHtml = (unsafe) => {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

function basicMarkdownToHtml(src) {
  if (!src) return "";
  const text = escapeHtml(src);
  const lines = text.split(/\r?\n/);
  let inCode = false;
  let html = [];
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length) {
      html.push(`<ul class="list-disc pl-5 my-2">${listBuffer.join("")}</ul>`);
      listBuffer = [];
    }
  };
  for (let line of lines) {
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        inCode = true;
        flushList();
        html.push(`<pre class="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto"><code>`);
      } else {
        inCode = false;
        html.push(`</code></pre>`);
      }
      continue;
    }
    if (inCode) {
      html.push(line + "\n");
      continue;
    }
    // list item
    if (/^\s*[-*]\s+/.test(line)) {
      const li = line.replace(/^\s*[-*]\s+/, "");
      listBuffer.push(`<li>${li}</li>`);
      continue;
    } else {
      flushList();
    }
    // inline bold, code
    let l = line
      .replace(/(\*\*)(.+?)\1/g, "<strong>$2</strong>")
      .replace(/`([^`]+)`/g, "<code class=\"bg-gray-100 px-1 py-0.5 rounded\">$1</code>");
    if (l.trim().length === 0) {
      html.push("<br/>");
    } else {
      html.push(`<p class="my-1">${l}</p>`);
    }
  }
  flushList();
  return html.join("");
}

const MarkdownRenderer = ({ text, className = "" }) => {
  const fallbackHtml = useMemo(() => basicMarkdownToHtml(text), [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
};

export default MarkdownRenderer;


