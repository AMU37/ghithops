"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, ChevronRight, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const pageTitles: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/companies": "الشركات",
  "/users": "المستخدمين",
  "/employees": "الموظفين",
  "/transport": "المواصلات",
  "/housing": "السكنات",
  "/services": "الخدمات",
  "/cleaning": "النظافة",
  "/agriculture": "الزراعة",
  "/ai-assistant": "المساعد الذكي",
  "/ocr": "التعرف على المستندات",
  "/reports": "التقارير والتحليلات",
  "/notifications": "الإشعارات",
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState({ full_name: "", company_name: "", department_name: "" })

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}")
      setUser({ full_name: u.full_name || "", company_name: u.company_name || "", department_name: u.department_name || "" })
    } catch {}
  }, [])

  const showBack = pathname !== "/dashboard"
  const currentTitle = pageTitles[pathname] || ""

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6">
      {showBack ? (
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-100">
          <ChevronRight className="h-5 w-5" />
        </Button>
      ) : <div className="w-10" />}
      {currentTitle && <span className="text-sm font-medium text-zinc-400">{currentTitle}</span>}
      <div className="flex-1" />
      <div className="flex items-center gap-3 text-xs text-zinc-500 ml-4">
        <span className="hidden sm:inline">{user.company_name && `${user.company_name} /`} {user.department_name}</span>
        <span className="text-zinc-300">{user.full_name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/notifications")} className="relative">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { localStorage.clear(); router.push("/login") }} title="تسجيل خروج">
          <LogOut className="h-5 w-5 text-zinc-400 hover:text-red-400" />
        </Button>
      </div>
    </header>
  )
}
