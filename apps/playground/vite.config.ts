import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import { createProcessor } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import { compression } from "vite-plugin-compression2";
import path from "path";

interface MdastNode {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: MdastNode[];
}

const mdxCodePreview = (): Plugin => {
  const parser = createProcessor({ format: "mdx" });

  return {
    name: "mdx-code-preview",
    enforce: "pre",

    transform(rawCode, id) {
      if (!id.endsWith(".mdx") && !id.endsWith(".md")) return;

      const code = rawCode.replace(/\r\n/g, "\n");

      const importStmt = 'import { ComponentPreview } from "@vine/ui";\n';
      const hasImport = code.includes(importStmt.trim());
      let source = code;
      if (!hasImport) {
        const closingIdx = code.startsWith("---\n")
          ? code.indexOf("---\n", 4)
          : -1;
        const fmEnd = closingIdx !== -1 ? closingIdx + 4 : 0;
        source = code.slice(0, fmEnd) + "\n" + importStmt + code.slice(fmEnd);
      }

      let tree: MdastNode;
      try {
        tree = parser.parse(source) as unknown as MdastNode;
      } catch {
        return;
      }

      const blocks: Array<{ start: number; end: number; codeText: string }> =
        [];

      const walk = (node: MdastNode) => {
        if (
          node.type === "code" &&
          node.lang === "tsx" &&
          node.meta === "preview" &&
          node.position?.start.offset != null &&
          node.position.end.offset != null &&
          node.value != null
        ) {
          blocks.push({
            start: node.position.start.offset,
            end: node.position.end.offset,
            codeText: node.value,
          });
        }
        if (node.children) {
          for (const child of node.children) walk(child);
        }
      }

      walk(tree);

      if (blocks.length === 0) return;

      for (const { start, end, codeText } of [...blocks].reverse()) {
        const replacement = `<ComponentPreview code={${JSON.stringify(codeText)}}>\n${codeText}\n</ComponentPreview>`;
        source = source.slice(0, start) + replacement + source.slice(end);
      }

      return { code: source };
    },
  };
}

export default defineConfig({
  plugins: [
    mdxCodePreview(),
    compression(),
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
      }),
    },
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("node_modules/shiki/")) return "shiki-core";
          if (id.includes("@shikijs/themes")) return "shiki-themes";
          if (id.includes("@shikijs/langs")) {
            const match = id.match(/@shikijs\/langs\/dist\/([a-z0-9]+)/);
            if (match) return `shiki-lang-${match[1]}`;
            return "shiki-langs";
          }
          if (id.includes("@shikijs")) return "shiki-other";
          if (id.includes("maplibre-gl")) return "maplibre";
          if (id.includes("react-dom") || id.includes("react/")) return "react";
          return "vendor";
        },
      },
    },
  },
});
