import type { ComponentType } from "react";
import {
  AppWindow,
  CheckSquare,
  LayoutDashboard,
  Layers,
  Map,
  PanelRight,
  Square,
} from "lucide-react";

import * as OverviewMod from "../pages/overview.mdx";
import * as ButtonMod from "../pages/button.mdx";
import * as CardMod from "../pages/card.mdx";
import * as CheckboxMod from "../pages/checkbox.mdx";
import * as DialogMod from "../pages/dialog.mdx";
import * as MapMod from "../pages/map.mdx";
import * as SheetMod from "../pages/sheet.mdx";

export type PageGroup = "overview" | "maps" | "components";

export interface PageMeta {
  slug: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** Group: map components (maps) first, generic components (components) after. */
  group: PageGroup;
}

export interface PageEntry extends PageMeta {
  Component: ComponentType;
}

interface MDXExports {
  default: ComponentType;
  frontmatter?: { title?: string; description?: string };
}

const pages: PageEntry[] = [
  {
    slug: "overview",
    title:
      (OverviewMod as unknown as MDXExports).frontmatter?.title ?? "Overview",
    description:
      (OverviewMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: LayoutDashboard,
    group: "overview",
    Component: OverviewMod.default,
  },
  {
    slug: "map",
    title: (MapMod as unknown as MDXExports).frontmatter?.title ?? "Map",
    description:
      (MapMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: Map,
    group: "maps",
    Component: MapMod.default,
  },
  {
    slug: "button",
    title: (ButtonMod as unknown as MDXExports).frontmatter?.title ?? "Button",
    description:
      (ButtonMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: Square,
    group: "components",
    Component: ButtonMod.default,
  },
  {
    slug: "card",
    title: (CardMod as unknown as MDXExports).frontmatter?.title ?? "Card",
    description:
      (CardMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: Layers,
    group: "components",
    Component: CardMod.default,
  },
  {
    slug: "checkbox",
    title:
      (CheckboxMod as unknown as MDXExports).frontmatter?.title ?? "Checkbox",
    description:
      (CheckboxMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: CheckSquare,
    group: "components",
    Component: CheckboxMod.default,
  },
  {
    slug: "dialog",
    title: (DialogMod as unknown as MDXExports).frontmatter?.title ?? "Dialog",
    description:
      (DialogMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: AppWindow,
    group: "components",
    Component: DialogMod.default,
  },
  {
    slug: "sheet",
    title: (SheetMod as unknown as MDXExports).frontmatter?.title ?? "Sheet",
    description:
      (SheetMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: PanelRight,
    group: "components",
    Component: SheetMod.default,
  },
];

const toMeta = ({ slug, title, description, icon, group }: PageEntry): PageMeta => ({
  slug,
  title,
  description,
  icon,
  group,
});

export const getPage = (slug: string): PageEntry | undefined =>
  pages.find((p) => p.slug === slug);

export const pagesMeta: PageMeta[] = pages.map(toMeta);

/** Sidebar groups: Overview first, then map components (maps), then generic components (components). */
export const pageGroups: Array<{ group: PageGroup; label?: string; items: PageMeta[] }> = [
  {
    group: "overview",
    items: pages.filter((p) => p.group === "overview").map(toMeta),
  },
  { group: "maps", label: "Maps", items: pages.filter((p) => p.group === "maps").map(toMeta) },
  {
    group: "components",
    label: "Components",
    items: pages.filter((p) => p.group === "components").map(toMeta),
  },
];
