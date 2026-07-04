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

export interface PageMeta {
  slug: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
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
    Component: OverviewMod.default,
  },
  {
    slug: "button",
    title: (ButtonMod as unknown as MDXExports).frontmatter?.title ?? "Button",
    description:
      (ButtonMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: Square,
    Component: ButtonMod.default,
  },
  {
    slug: "card",
    title: (CardMod as unknown as MDXExports).frontmatter?.title ?? "Card",
    description:
      (CardMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: Layers,
    Component: CardMod.default,
  },
  {
    slug: "map",
    title: (MapMod as unknown as MDXExports).frontmatter?.title ?? "Map",
    description:
      (MapMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: Map,
    Component: MapMod.default,
  },
  {
    slug: "checkbox",
    title:
      (CheckboxMod as unknown as MDXExports).frontmatter?.title ?? "Checkbox",
    description:
      (CheckboxMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: CheckSquare,
    Component: CheckboxMod.default,
  },
  {
    slug: "dialog",
    title: (DialogMod as unknown as MDXExports).frontmatter?.title ?? "Dialog",
    description:
      (DialogMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: AppWindow,
    Component: DialogMod.default,
  },
  {
    slug: "sheet",
    title: (SheetMod as unknown as MDXExports).frontmatter?.title ?? "Sheet",
    description:
      (SheetMod as unknown as MDXExports).frontmatter?.description ?? "",
    icon: PanelRight,
    Component: SheetMod.default,
  },
];

export const getPage = (slug: string): PageEntry | undefined =>
  pages.find((p) => p.slug === slug);

export const pagesMeta: PageMeta[] = pages.map(
  ({ slug, title, description, icon }) => ({
    slug,
    title,
    description,
    icon,
  }),
);
