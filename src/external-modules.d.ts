declare module "markdown-it-texmath" {
  import type MarkdownIt from "markdown-it";
  import type katex from "katex";

  interface TexmathOptions {
    engine: typeof katex;
    delimiters?: string | string[];
    katexOptions?: Record<string, unknown>;
  }

  const texmath: (markdown: MarkdownIt, options: TexmathOptions) => void;
  export default texmath;
}

declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const gfm: (service: TurndownService) => void;
}
