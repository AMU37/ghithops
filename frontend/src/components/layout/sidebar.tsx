"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, Building2, Users, Bell,
  Truck, Home, Wrench, Sparkles, Sprout, Sofa,
  LogOut, ChevronLeft, Shield, ClipboardList,
  Bot, FileText, BarChart3, ChevronDown, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

const allMenuItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["super_admin", "company_admin", "department_user"], excludeDepartments: ["الطلبات"] },
  { href: "/companies", label: "الشركات", icon: Building2, roles: ["super_admin", "company_admin"] },
  { href: "/users", label: "المستخدمين", icon: Users, roles: ["super_admin", "company_admin"] },
  { href: "/employees", label: "الموظفين", icon: Users, roles: ["super_admin", "company_admin", "department_user"] },
  { href: "/notifications", label: "الإشعارات", icon: Bell, roles: ["super_admin", "company_admin", "department_user"] },
  { href: "/ai-assistant", label: "المساعد الذكي", icon: Bot, roles: ["super_admin", "company_admin"] },
  { href: "/ocr", label: "التعرف على المستندات", icon: FileText, roles: ["super_admin", "company_admin"] },
  { href: "/reports", label: "التقارير والتحليلات", icon: BarChart3, roles: ["super_admin", "company_admin"] },
  { href: "/requests", label: "جميع الطلبات", icon: ClipboardList, roles: ["super_admin", "company_admin", "department_user", "service_requester"] },
  { label: "الأقسام", icon: Shield, roles: ["super_admin", "company_admin", "department_user"], children: [
    { href: "/transport", label: "المواصلات", icon: Truck, departments: ["المواصلات"] },
    { href: "/housing", label: "السكنات", icon: Home, departments: ["السكنات"] },
    { href: "/services", label: "الخدمات", icon: Wrench, departments: ["الخدمات"] },
    { href: "/assets", label: "الأصول (الأثاث)", icon: Sofa, departments: ["الأصول"] },
    { href: "/cleaning", label: "النظافة", icon: Sparkles, departments: ["النظافة"] },
    { href: "/agriculture", label: "الزراعة", icon: Sprout, departments: ["الزراعة"] },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState("")
  const [department, setDepartment] = useState("")
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  const [companyOpen, setCompanyOpen] = useState(false)

  const loadUser = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      setRole(user.role || "")
      setDepartment(user.department_name || "")
      const sc = JSON.parse(localStorage.getItem("selected_company") || "null")
      setSelectedCompany(sc)
    } catch {}
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  useEffect(() => {
    if (role === "super_admin") {
      api.get("/companies/").then((res) => {
        setCompanies(res.data.results || res.data || [])
      }).catch(() => {})
    }
  }, [role])

  const switchCompany = (c: any) => {
    localStorage.setItem("selected_company", JSON.stringify({ id: c.id, name: c.name }))
    setSelectedCompany({ id: c.id, name: c.name })
    setCompanyOpen(false)
    // Refresh the page to apply new company context
    router.refresh()
  }

  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles.includes(role)) return false
    if ((item as any).excludeDepartments?.includes(department)) return false
    if (role === "department_user" && item.children) {
      item.children = item.children.filter((child) =>
        child.departments?.includes(department)
      )
      return item.children.length > 0
    }
    return true
  })

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-64 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
          <span className="text-sm font-bold text-black">غ</span>
        </div>
        <span className="text-lg font-bold text-amber-500">GhithOps</span>
      </div>

      {role === "super_admin" && (
        <div className="relative border-b border-zinc-800 px-4 py-3">
          <button
            onClick={() => setCompanyOpen(!companyOpen)}
            className="flex w-full items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Building2 className="h-4 w-4 text-amber-500" />
            <span className="flex-1 text-right">{selectedCompany?.name || "اختر الشركة"}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${companyOpen ? "rotate-180" : ""}`} />
          </button>
          {companyOpen && (
            <div className="absolute left-4 right-4 top-full z-50 mt-1 rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => switchCompany(c)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors text-right"
                >
                  <span className="flex-1">{c.name}</span>
                  {selectedCompany?.id === c.id && <Check className="h-3 w-3 text-amber-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            if (item.children) {
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    <ChevronLeft className="mr-auto h-3 w-3" />
                  </div>
                  <div className="mr-4 space-y-1 border-r border-zinc-800 pr-2">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                            pathname === child.href
                              ? "bg-amber-500/10 text-amber-500"
                              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-zinc-800 p-4">
        <div className="mb-3 text-center">
          <p className="text-[10px] leading-tight text-zinc-600">الغيث لتصميم التطبيقات والأنظمة</p>
          <p className="text-[9px] leading-tight text-zinc-700">تطبيق مميز لمساعدة الشركات في أعمالها</p>
        </div>
        <button
          onClick={() => { localStorage.clear(); router.push("/login") }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>تسجيل خروج</span>
        </button>
      </div>
    </aside>
  )
}
