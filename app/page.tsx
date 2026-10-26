import { redirect } from "next/navigation"

export default function Home() {
  // The retained ERP dashboard remains available at /dashboard.
  redirect("/monitoring")
}
