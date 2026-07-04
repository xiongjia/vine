import { codeToHtml } from "shiki";

export const highlightCode = async (
  code: string,
  lang = "tsx",
  dark = false,
): Promise<string> => {
  return codeToHtml(code, {
    lang,
    theme: dark ? "github-dark" : "github-light",
  });
};
