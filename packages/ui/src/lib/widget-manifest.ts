/**
 * Shape of the `widget.json` manifest emitted by the widget build
 * (packages/ui/vite.lib.config.ts → widgetManifestPlugin). Shared between the
 * build config and the demo's embed plugin so the two cannot drift.
 */
export interface WidgetManifestFile {
  name: string;
  /** Full sha256 hex digest (the filename uses its first 12 chars). */
  hash: string;
  size: number;
}

export interface WidgetManifest {
  version: string;
  buildTime: string;
  entry: string;
  css: string;
  files: WidgetManifestFile[];
  /** External deps keyed by bare specifier (version + pinned CDN URL). */
  dependencies: Record<string, { version: string; cdn: string }>;
  /** Bare specifier → CDN URL, for `<script type="importmap">`. */
  importMap: Record<string, string>;
}
