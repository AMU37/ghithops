"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bus, Home, Wrench, Sofa, LogOut, Clock, Plus, ClipboardList, CheckCircle, XCircle } from "lucide-react"
import api from "@/lib/api"

const typeMeta: Record<string, { label: string; icon: any; color: string; endpoint: string; fields: { name: string; label: string; type: string; required?: boolean; options?: { value: string; label: string }[] }[] }> = {
  transport: {
    label: "مواصلات", icon: Bus, color: "text-amber-400", endpoint: "/transport/requests/",
    fields: [
      { name: "employee_name", label: "الاسم", type: "text", required: true },
      { name: "requester_section", label: "جهة الطالب / القسم", type: "text" },
      { name: "purpose", label: "الغرض", type: "text", required: true },
      { name: "transport_type", label: "نوع المواصلات", type: "select", options: [{ value: "باص", label: "باص" }, { value: "سيارة", label: "سيارة" }, { value: "دراجة", label: "دراجة" }] },
      { name: "destination", label: "الجهة", type: "text" },
      { name: "requested_time", label: "الزمن", type: "time" },
    ],
  },
  housing: {
    label: "سكن", icon: Home, color: "text-emerald-400", endpoint: "/housing/requests/",
    fields: [
      { name: "employee_name", label: "الاسم", type: "text", required: true },
    ],
  },
  service: {
    label: "خدمات", icon: Wrench, color: "text-blue-400", endpoint: "/services/requests/",
    fields: [
      { name: "employee_name", label: "الاسم", type: "text", required: true },
      { name: "description", label: "وصف الخدمة", type: "textarea", required: true },
    ],
  },
  asset: {
    label: "أصول", icon: Sofa, color: "text-purple-400", endpoint: "/assets/requests/",
    fields: [
      { name: "employee_name", label: "الاسم", type: "text", required: true },
      { name: "purpose", label: "الغرض", type: "text", required: true },
      { name: "quantity", label: "الكمية", type: "number" },
    ],
  },
}

const statusConfig: Record<string, Record<string, { label: string; color: string }>> = {
  transport: { pending: { label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-400" }, manager_pending: { label: "بانتظار المدير", color: "bg-blue-500/10 text-blue-400" }, in_progress: { label: "تحت التنفيذ", color: "bg-purple-500/10 text-purple-400" }, completed: { label: "مكتملة", color: "bg-emerald-500/10 text-emerald-400" }, rejected: { label: "مرفوضة", color: "bg-red-500/10 text-red-400" } },
  housing: { pending: { label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-400" }, approved: { label: "تمت الموافقة", color: "bg-emerald-500/10 text-emerald-400" }, rejected: { label: "مرفوض", color: "bg-red-500/10 text-red-400" }, completed: { label: "مكتمل", color: "bg-blue-500/10 text-blue-400" } },
  service: { pending: { label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-400" }, in_progress: { label: "قيد التنفيذ", color: "bg-blue-500/10 text-blue-400" }, completed: { label: "مكتملة", color: "bg-emerald-500/10 text-emerald-400" }, cancelled: { label: "ملغية", color: "bg-red-500/10 text-red-400" } },
  asset: { pending: { label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-400" }, approved: { label: "تمت الموافقة", color: "bg-emerald-500/10 text-emerald-400" }, rejected: { label: "مرفوض", color: "bg-red-500/10 text-red-400" }, completed: { label: "مكتمل", color: "bg-blue-500/10 text-blue-400" } },
}

export default function RequestsPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({})
  const [refresh, setRefresh] = useState(0)
  const [userRole, setUserRole] = useState("")
  const [approvals, setApprovals] = useState<any[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem("access_token")
    if (t) {
      setAuthenticated(true)
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}")
        setUserRole(user.role || "")
      } catch {}
    } else setLoading(false)
  }, [])

  useEffect(() => {
    if (!authenticated) return
    setLoading(true)
    const all: any[] = []
    Promise.allSettled([
      api.get("/transport/requests/"),
      api.get("/housing/requests/"),
      api.get("/services/requests/"),
      api.get("/assets/requests/"),
    ]).then(([t, h, s, a]) => {
      if (t.status === "fulfilled") (t.value.data.results || t.value.data).forEach((r: any) => all.push({ ...r, _type: "transport", _purpose: r.purpose || r.transport_type }))
      if (h.status === "fulfilled") (h.value.data.results || h.value.data).forEach((r: any) => all.push({ ...r, _type: "housing", _purpose: "طلب سكن" }))
      if (s.status === "fulfilled") (s.value.data.results || s.value.data).forEach((r: any) => all.push({ ...r, _type: "service", _purpose: r.description || r.purpose }))
      if (a.status === "fulfilled") (a.value.data.results || a.value.data).forEach((r: any) => all.push({ ...r, _type: "asset", _purpose: r.purpose || r.asset_name }))
      all.sort((x, y) => ((y.request_date || y.created_at || "") > (x.request_date || x.created_at || "") ? 1 : -1))
      setRequests(all)
      setLoading(false)
    })
  }, [authenticated, refresh])

  useEffect(() => {
    if (authenticated && userRole === "company_admin") {
      api.get("/transport/requests/?status=manager_pending").then((res) => {
        setApprovals(res.data.results || res.data)
      }).catch(() => {})
    }
  }, [authenticated, userRole, refresh])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    try {
      const res = await api.post("/auth/login/", { email: loginEmail, password: loginPassword })
      localStorage.setItem("access_token", res.data.access)
      localStorage.setItem("refresh_token", res.data.refresh)
      setAuthenticated(true)
    } catch (err: any) {
      setLoginError(err?.response?.data?.detail || "بيانات الدخول غير صحيحة")
    } finally { setLoginLoading(false) }
  }

  const handleFormChange = (type: string, field: string, value: string) => {
    setForms((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  const handleSubmit = async (type: string) => {
    const meta = typeMeta[type]
    const form = forms[type] || {}
    if (!form.employee_name?.trim()) return
    setSubmitting(type)
    const today = new Date().toLocaleDateString("en-CA")
    const payload: Record<string, any> = {
      employee_name: form.employee_name.trim(),
      request_date: today,
    }
    if (type === "transport") {
      payload.purpose = form.purpose || ""
      payload.requester_section = form.requester_section || ""
      payload.transport_type = form.transport_type || "باص"
      payload.destination = form.destination || ""
      payload.requested_time = form.requested_time || null
    } else if (type === "housing") {
      // minimal fields
    } else if (type === "service") {
      payload.description = form.description || ""
    } else if (type === "asset") {
      payload.purpose = form.purpose || ""
      payload.quantity = parseInt(form.quantity || "1")
    }
    try {
      await api.post(meta.endpoint, payload)
      setForms((prev) => ({ ...prev, [type]: {} }))
      setRefresh((p) => p + 1)
    } catch (err: any) {
      alert(err?.response?.data?.detail || "فشل إرسال الطلب")
    } finally { setSubmitting(null) }
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    setAuthenticated(false)
    setRequests([])
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <ClipboardList className="h-7 w-7 text-amber-500" />
            </div>
            <CardTitle className="text-xl text-zinc-100">بوابة الطلبات</CardTitle>
            <CardDescription className="text-zinc-500">تقديم طلبات المواصلات والسكن والخدمات والأصول</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">اسم المستخدم</Label>
                <Input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 text-center text-lg" required dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">كلمة المرور</Label>
                <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 text-center text-lg" required />
              </div>
              {loginError && <p className="text-sm text-red-400 text-center">{loginError}</p>}
              <Button type="submit" disabled={loginLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium h-11">
                {loginLoading ? "..." : "دخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main portal
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">بوابة الطلبات</h1>
          <p className="text-sm text-zinc-500 mt-1">تقديم ومتابعة جميع الطلبات</p>
        </div>
        <Button variant="outline" onClick={logout} className="border-zinc-700 text-zinc-400">
          <LogOut className="h-4 w-4 ml-1" />خروج
        </Button>
      </div>

      <Tabs defaultValue="all" value={filterType} onValueChange={setFilterType} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">جميع الطلبات</TabsTrigger>
          {Object.entries(typeMeta).map(([key, meta]) => (
            <TabsTrigger key={key} value={key}>{meta.label}</TabsTrigger>
          ))}
          {userRole === "company_admin" && <TabsTrigger value="approvals" className="text-amber-400">بانتظار الاعتماد</TabsTrigger>}
        </TabsList>

        {/* All requests view */}
        <TabsContent value="all">
          {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
          : requests.length === 0
            ? <Card className="bg-zinc-900 border-zinc-800"><CardContent className="text-center py-8 text-zinc-500">لا توجد طلبات</CardContent></Card>
            : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {requests.map((r) => {
                  const meta = typeMeta[r._type]
                  if (!meta) return null
                  const Icon = meta.icon
                  const st = statusConfig[r._type]?.[r.status]
                  return (
                    <Card key={`${r._type}-${r.id}`} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className={`h-5 w-5 shrink-0 ${meta.color}`} />
                            <div className="min-w-0">
                              <p className="text-sm text-zinc-100 font-medium truncate">{r.employee_name}</p>
                              <p className="text-xs text-zinc-400 truncate">{r._purpose}</p>
                              {r.requester_section && <p className="text-[10px] text-zinc-600 truncate">القسم: {r.requester_section}</p>}
                            </div>
                          </div>
                          {st && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] shrink-0 ${st.color}`}>{st.label}</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {r.request_date || r.created_at?.slice(0, 10) || "-"}
                        </div>
                        {(r.assigned_driver_name || r.assigned_vehicle_plate) && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-zinc-500">
                            {r.assigned_driver_name && <span>السائق: {r.assigned_driver_name}</span>}
                            {r.assigned_vehicle_plate && <span>المركبة: {r.assigned_vehicle_plate}</span>}
                            {r.departure_time && <span>التحرك: {r.departure_time?.slice(0, 16)?.replace("T", " ")}</span>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            }
        </TabsContent>

        {/* Per-type tabs with submit forms */}
        {Object.entries(typeMeta).map(([type, meta]) => {
          const Icon = meta.icon
          const form = forms[type] || {}
          const typeRequests = requests.filter((r) => r._type === type)
          return (
            <TabsContent key={type} value={type}>
              <div className="grid gap-6 md:grid-cols-5">
                {/* Submit form */}
                <Card className="md:col-span-2 bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-100 flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${meta.color}`} />طلب {meta.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(type) }} className="space-y-3 text-sm">
                      {meta.fields.map((f) => (
                        <div key={f.name}>
                          <Label className="text-zinc-400">{f.label}{f.required && " *"}</Label>
                          {f.type === "select" ? (
                            <select value={form[f.name] || ""} onChange={(e) => handleFormChange(type, f.name, e.target.value)}
                              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 mt-1">
                              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : f.type === "textarea" ? (
                            <textarea value={form[f.name] || ""} onChange={(e) => handleFormChange(type, f.name, e.target.value)}
                              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 mt-1" rows={3} />
                          ) : (
                            <Input value={form[f.name] || ""} onChange={(e) => handleFormChange(type, f.name, e.target.value)}
                              type={f.type === "time" ? "time" : "text"} required={f.required}
                              className="bg-zinc-950 border-zinc-700 text-zinc-100 mt-1" />
                          )}
                        </div>
                      ))}
                      <Button type="submit" disabled={submitting === type}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white">
                        {submitting === type ? "..." : "إرسال الطلب"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Previous requests */}
                <div className="md:col-span-3 space-y-3">
                  <h3 className="text-sm text-zinc-500 font-medium">الطلبات السابقة</h3>
                  {typeRequests.length === 0
                    ? <p className="text-zinc-600 text-sm">لا توجد طلبات سابقة</p>
                    : typeRequests.map((r) => {
                        const st = statusConfig[type]?.[r.status]
                        return (
                          <Card key={r.id} className="bg-zinc-900 border-zinc-800">
                            <CardContent className="py-3 flex items-center justify-between gap-2">
                              <div className="text-sm min-w-0">
                                <p className="text-zinc-100 truncate">{r.employee_name}</p>
                                <p className="text-xs text-zinc-500 truncate">{r._purpose || r.purpose}</p>
                                {r.requester_section && <p className="text-[10px] text-zinc-600 truncate">القسم: {r.requester_section}</p>}
                                {(r.assigned_driver_name || r.assigned_vehicle_plate) && (
                                  <div className="flex flex-wrap gap-x-3 text-[10px] text-zinc-600 mt-0.5">
                                    {r.assigned_driver_name && <span>السائق: {r.assigned_driver_name}</span>}
                                    {r.assigned_vehicle_plate && <span>المركبة: {r.assigned_vehicle_plate}</span>}
                                    {r.departure_time && <span>التحرك: {r.departure_time?.slice(0, 16)?.replace("T", " ")}</span>}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-zinc-500">{r.request_date || r.created_at?.slice(0, 10)}</span>
                                {st && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${st.color}`}>{st.label}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                </div>
              </div>
            </TabsContent>
          )
        })}

        {/* Approvals tab (manager only) */}
        <TabsContent value="approvals">
          <div className="space-y-3">
            <h3 className="text-sm text-zinc-400 font-medium">الطلبات بانتظار اعتماد المدير</h3>
            {approvals.length === 0
              ? <Card className="bg-zinc-900 border-zinc-800"><CardContent className="text-center py-8 text-zinc-500">لا توجد طلبات بانتظار الاعتماد</CardContent></Card>
              : approvals.map((r: any) => (
                  <Card key={r.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="text-sm min-w-0 flex-1">
                          <p className="text-zinc-100 font-medium">{r.employee_name || r.employee_id}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{r.purpose}</p>
                          <div className="flex flex-wrap gap-x-4 text-[10px] text-zinc-500 mt-1">
                            <span>النوع: {r.transport_type}</span>
                            {r.destination && <span>الجهة: {r.destination}</span>}
                            {r.requester_section && <span>القسم: {r.requester_section}</span>}
                            {r.requested_time && <span>الزمن: {r.requested_time?.slice(0,5)}</span>}
                            <span>التاريخ: {r.request_date}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" onClick={() => { api.post(`/transport/requests/${r.id}/approve_manager/`).then(() => setRefresh((p) => p + 1)).catch(() => alert("فشل الاعتماد")) }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8">
                            <CheckCircle className="h-4 w-4 ml-1" />اعتماد
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { api.post(`/transport/requests/${r.id}/reject/`).then(() => setRefresh((p) => p + 1)).catch(() => alert("فشل الرفض")) }}
                            className="border-red-700 text-red-400 hover:bg-red-950 text-xs h-8">
                            <XCircle className="h-4 w-4 ml-1" />رفض
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
