import {
  SidebarAside,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@vine/ui";
import { pageGroups } from "../lib/registry";

interface AppSidebarProps {
  collapsed: boolean;
  slug: string;
}

const AppSidebar = ({ collapsed, slug }: AppSidebarProps) => (
  <SidebarAside collapsed={collapsed}>
    {pageGroups.map((group) => (
      <div key={group.group}>
        {!collapsed && group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
        <SidebarMenu>
          {group.items.map((item) => (
            <SidebarMenuItem key={item.slug}>
              <SidebarMenuButton
                asChild
                isActive={slug === item.slug}
                tooltip={item.title}
              >
                <a href={`#/${item.slug}`}>
                  <item.icon />
                  {!collapsed && <span>{item.title}</span>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        {!collapsed && <SidebarSeparator />}
      </div>
    ))}
  </SidebarAside>
);

export { AppSidebar };
