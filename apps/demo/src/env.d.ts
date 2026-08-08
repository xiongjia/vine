/// <reference types="vite/client" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType;
  export const frontmatter: Record<string, string>;
  export default MDXComponent;
}

interface ImportMetaEnv {
  /** pmtiles URL prefix, e.g. pmtiles://https://cdn.example.com/vine/pmtiles/ (injected as a CI build param) */
  readonly VITE_PMTILES_URL_PREFIX?: string;
  /** Glyphs URL template (remote R2; falls back to the local /glyphs/...) */
  readonly VITE_GLYPHS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
