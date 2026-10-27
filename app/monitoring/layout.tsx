import type { Metadata } from "next"
import { MonitoringSidebar } from "@/components/monitoring/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Sensor monitoring · Agroindustrial Digital Twin",
  description: "Environmental and process sensor monitoring for agroindustrial assets.",
}

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>
    <MonitoringSidebar />
    <SidebarInset className="min-w-0">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger className="-ml-1" /><Separator orientation="vertical" className="mr-1 h-5" />
        <span className="text-sm font-medium">Operations overview</span><ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
    </SidebarInset>
  </SidebarProvider>
}
