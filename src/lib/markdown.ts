import DOMPurify from "dompurify";
import katex from "katex";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import texmath from "markdown-it-texmath";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false
}).use(taskLists, { enabled: true, label: true, labelAfter: true });

markdown.use(texmath, {
  engine: katex,
  delimiters: ["dollars", "brackets"],
  katexOptions: { throwOnError: false, strict: false, trust: false }
});

const defaultLinkOpen = markdown.renderer.rules.link_open ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const hrefIndex = token.attrIndex("href");
  if (hrefIndex >= 0) {
    const href = token.attrs?.[hrefIndex]?.[1] ?? "";
    if (!/^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i.test(href)) {
      token.attrSet("href", "#");
    }
  }
  token.attrSet("target", "_blank");
  token.attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, index, options, env, self);
};

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(markdown.render(source), {
    NAMESPACE: "http://www.w3.org/1999/xhtml",
    ADD_TAGS: ["semantics", "annotation"],
    ADD_ATTR: ["encoding"],
    FORBID_TAGS: ["style", "iframe", "form", "object", "embed"],
    FORBID_ATTR: ["onerror", "onclick", "onload"]
  });
}

export function renderHtml(source: string): string {
  return DOMPurify.sanitize(source, {
    NAMESPACE: "http://www.w3.org/1999/xhtml",
    FORBID_TAGS: ["script", "style", "iframe", "form", "object", "embed"],
    FORBID_ATTR: ["style", "onerror", "onclick", "onload"]
  });
}

export function getDocumentStats(source: string) {
  const words = source.trim() ? source.trim().split(/\s+/).length : 0;
  const lines = source ? source.split("\n").length : 1;
  const readingMinutes = Math.max(1, Math.ceil(words / 220));
  return { words, lines, readingMinutes };
}

export function safeFilename(title: string): string {
  const cleaned = title.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ");
  return `${cleaned || "untitled"}.md`;
}

export function toggleTaskAtIndex(source: string, targetIndex: number, checked: boolean): string {
  let currentIndex = 0;
  return source.replace(/^(\s*[-*+]\s+)\[([ xX])\]/gm, (match, prefix: string) => {
    if (currentIndex++ !== targetIndex) return match;
    return `${prefix}[${checked ? "x" : " "}]`;
  });
}
