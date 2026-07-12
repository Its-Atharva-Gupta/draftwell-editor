import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./conversion";
import { getDocumentStats, renderHtml, renderMarkdown, safeFilename, toggleTaskAtIndex } from "./markdown";

describe("markdown rendering", () => {
  it("removes executable content", () => {
    const html = renderMarkdown("[bad](javascript:alert(1))\n\n<script>alert(1)</script>");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<script");
  });

  it("counts document stats", () => {
    expect(getDocumentStats("hello brave world\nnext")).toEqual({ words: 4, lines: 2, readingMinutes: 1 });
  });

  it("creates portable filenames", () => {
    expect(safeFilename("API: Notes / Draft")).toBe("API- Notes - Draft.md");
  });

  it("updates the matching source task without touching other tasks", () => {
    const source = "- [ ] first\n- [x] second\n  - [ ] nested\n";
    expect(toggleTaskAtIndex(source, 1, false)).toBe("- [ ] first\n- [ ] second\n  - [ ] nested\n");
    expect(toggleTaskAtIndex(source, 2, true)).toBe("- [ ] first\n- [x] second\n  - [x] nested\n");
  });

  it("renders inline and display LaTeX without executing unsafe content", () => {
    const html = renderMarkdown("Inline $x^2$\n\n$$\\int_0^1 x dx$$");
    expect(html).toContain("katex");
    expect(html).toContain("<math");
    expect(html).toContain("style=");
    expect(html).not.toContain("<script");
  });

  it("converts Markdown to standalone HTML with self-contained MathML", () => {
    const html = markdownToHtml("# Formula\n\n$$E=mc^2$$", "Physics");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Physics</title>");
    expect(html).toContain("<math");
    expect(html).not.toContain("katex-html");
  });

  it("preserves LaTeX when converted through MathML and back", () => {
    const html = markdownToHtml("The identity $e^{i\\pi}+1=0$ is useful.", "Math");
    expect(htmlToMarkdown(html)).toContain("$e^{i\\pi}+1=0$");
  });

  it("converts sanitized HTML to GFM", () => {
    const markdown = htmlToMarkdown("<h1>Title</h1><p><strong>Bold</strong></p><table><tr><th>A</th></tr><tr><td>B</td></tr></table><script>alert(1)</script>");
    expect(markdown).toContain("# Title");
    expect(markdown).toContain("**Bold**");
    expect(markdown).toContain("| A |");
    expect(markdown).not.toContain("alert(1)");
  });

  it("sanitizes HTML previews", () => {
    expect(renderHtml('<h1>Safe</h1><img src="x" onerror="alert(1)"><script>alert(2)</script>')).toBe('<h1>Safe</h1><img src="x">');
  });
});
