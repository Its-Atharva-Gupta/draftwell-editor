import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { renderHtml, renderMarkdown } from "./markdown";

function mathReplacement(node: Element): string | null {
  const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
  const expression = node.getAttribute("data-tex")?.trim() || annotation?.textContent?.trim();
  if (!expression) return null;
  const display = node.closest(".katex-display") !== null || node.getAttribute("display") === "block";
  return display ? `\n\n$$\n${expression}\n$$\n\n` : `$${expression}$`;
}

export function htmlToMarkdown(source: string): string {
  const clean = renderHtml(source);
  const document = new DOMParser().parseFromString(`<body>${clean}</body>`, "text/html");
  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**"
  });
  service.use(gfm);
  service.addRule("latex", {
    filter: (node) => node.nodeName.toLowerCase() === "math" || (node instanceof Element && node.classList.contains("katex")),
    replacement: (content, node) => mathReplacement(node as Element) ?? content
  });
  return service.turndown(document.body).trim() + "\n";
}

function mathMlOnly(rendered: string): string {
  const document = new DOMParser().parseFromString(`<body>${rendered}</body>`, "text/html");
  const preserveTex = (math: Element) => {
    const expression = math.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
    if (expression) math.setAttribute("data-tex", expression);
  };
  document.querySelectorAll<HTMLElement>(".katex-display").forEach((container) => {
    const math = container.querySelector(".katex-mathml math")?.cloneNode(true) as Element | undefined;
    if (math) {
      preserveTex(math);
      math.setAttribute("display", "block");
      container.replaceWith(math);
    }
  });
  document.querySelectorAll<HTMLElement>(".katex").forEach((container) => {
    const math = container.querySelector(".katex-mathml math")?.cloneNode(true) as Element | undefined;
    if (math) {
      preserveTex(math);
      container.replaceWith(math);
    }
  });
  return document.body.innerHTML;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function markdownToHtml(source: string, title = "Document"): string {
  const body = mathMlOnly(renderMarkdown(source));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { max-width: 760px; margin: 48px auto; padding: 0 24px; color: #252622; font: 17px/1.7 Georgia, serif; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.25; } h1 { border-bottom: 1px solid #ddd; padding-bottom: 12px; }
    pre { overflow: auto; padding: 16px; background: #f3f2ee; } code { font-family: ui-monospace, monospace; }
    blockquote { margin-left: 0; padding-left: 16px; border-left: 3px solid #b94a2e; color: #686a64; }
    table { width: 100%; border-collapse: collapse; } th, td { padding: 8px 10px; border: 1px solid #ddd; text-align: left; }
    img { max-width: 100%; } math[display="block"] { margin: 1.5em auto; }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}
