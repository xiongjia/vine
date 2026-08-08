/**
 * Demo data-source config (tile/glyph URLs are set at build time).
 * Local dev defaults to the vite plugins' same-origin cache (pmtiles:///pmtiles/...);
 * the hosted (Pages) build gets the R2 URLs injected via CI build params
 * (VITE_PMTILES_URL_PREFIX / VITE_GLYPHS_URL).
 */
export interface DemoConfig {
  pmtilesPrefix: string;
  glyphs?: string;
}

export function demoConfig(): DemoConfig {
  const prefix = import.meta.env.VITE_PMTILES_URL_PREFIX ?? "pmtiles:///pmtiles/";
  const glyphs = import.meta.env.VITE_GLYPHS_URL || undefined;
  return { pmtilesPrefix: prefix, glyphs };
}
