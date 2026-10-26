import { NextResponse, type NextRequest } from "next/server"
import { monitoringConfig } from "@/lib/monitoring/config"
import { canReadMonitoring } from "@/lib/monitoring/access"

import { updateSession } from "@/lib/supabase/middleware"

// Next.js 16 renamed the `middleware` file convention to `proxy`. The exported
// function must be named `proxy` (or be the default export). Behavior is
// unchanged: refresh the Supabase auth cookie on every matched request.
// See https://nextjs.org/docs/app/api-reference/file-conventions/proxy
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === "/") return NextResponse.next()
  if (pathname === "/monitoring" || pathname.startsWith("/monitoring/")) {
    const config = monitoringConfig()
    if (config.mode === "mongodb" && !canReadMonitoring(config, request.headers.get("authorization"))) {
      return new NextResponse("Monitoring operator authentication required.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Sensor monitoring", charset="UTF-8"', "Cache-Control": "no-store" },
      })
    }
    const response = NextResponse.next()
    response.headers.set("Cache-Control", "private, no-store")
    return response
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files. Webhook
     * routes are matched here too but treated as public in updateSession so the
     * session cookie is refreshed without forcing a redirect.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
