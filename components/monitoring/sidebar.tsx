"use client"

import Link from "next/link"
import { Activity, ChartNoAxesCombined, LayoutDashboard, Leaf, Radio, Shapes } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar"

const items = [
  { title: "Overview", href: "/monitoring", icon: LayoutDashboard },
  { title: "Sensor readings", href: "/monitoring#sensors", icon: Radio },
  { title: "Historical trends", href: "/monitoring#history", icon: ChartNoAxesCombined },
  { title: "Asset overview", href: "/monitoring#assets", icon: Shapes },
]

export function MonitoringSidebar() {
  return <Sidebar collapsible="icon">
    <SidebarHeader>
      <Link href="/monitoring" className="flex items-center gap-2 px-1 py-1.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><Leaf className="size-4" /></div>
        <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
          <span className="text-sm font-semibold">Agroindustrial</span>
          <span className="text-xs text-muted-foreground">Digital Twin · Phase 1</span>
        </div>
      </Link>
    </SidebarHeader>
    <SidebarContent><SidebarGroup><SidebarGroupContent><SidebarMenu>
      {items.map(({ title, href, icon: Icon }, index) => <SidebarMenuItem key={href}>
        <SidebarMenuButton tooltip={title} isActive={index === 0} render={<Link href={href} />}>
          <Icon /><span>{title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>)}
    </SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarFooter>
      <div className="flex items-center gap-2 px-2 py-2 text-muted-foreground">
        <Activity className="size-4 shrink-0" />
        <span className="text-xs group-data-[collapsible=icon]:hidden">Sensor monitoring prototype</span>
      </div>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
}
