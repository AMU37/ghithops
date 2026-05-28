"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, LogOut, Bus, Clock } from "lucide-react"
import api from "@/lib/api"

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  manager_pending: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
}
const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار", manager_pending: "بانتظار المدير", in_progress: "تحت التنفيذ",
  completed: "مكتملة", rejected: "مرفوضة",
}

export default function EmployeeRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ employee_name: "", requester_section: "", purpose: "", transport_type: "باص", destination: "", requested_time: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.push("/employee/login"); return }
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get("/transport/requests/").then((res) => {
      setRequests(res.data.results || res.data)
    }).finally(() => setLoading(false))
  }, [refreshing])

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("employee_portal")
    router.push("/employee/login")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.employee_name.trim()) return
    setSaving(true)
    try {
      const today = new Date().toLocaleDateString("en-CA")
      await api.post("/transport/requests/", {
        employee_name: form.employee_name.trim(),
        requester_section: form.requester_section || "",
        request_date: today,
        purpose: form.purpose,
        transport_type: form.transport_type,
        destination: form.destination,
        requested_time: form.requested_time || null,
        notes: form.notes,
      })
      setDialogOpen(false)
      setForm({ employee_name: "", requester_section: "", purpose: "", transport_type: "باص", destination: "", requested_time: "", notes: "" })
      setRefreshing((p) => p + 1)
    } catch (err: any) {
      alert(err?.response?.data?.detail || "فشل إرسال الطلب")
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">طلبات المواصلات</h1>
            <p className="text-sm text-zinc-500">البوابة الموحدة للموظفين</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white">
              <Plus className="h-4 w-4 ml-1" />طلب جديد
            </Button>
            <Button variant="outline" onClick={logout} className="border-zinc-700 text-zinc-400">
              <LogOut className="h-4 w-4 ml-1" />خروج
            </Button>
          </div>
        </div>

        {/* Hint */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Bus className="h-6 w-6 text-amber-500" />
            </div>
            <div className="text-sm text-zinc-400">
              بوابة طلبات المواصلات - يرجى إدخال اسمك كاملاً مع بيانات الطلب ليتم معالجته من قبل المشرف
            </div>
          </CardContent>
        </Card>

        {/* Requests list */}
        {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
        : requests.length === 0
          ? <Card className="bg-zinc-900 border-zinc-800"><CardContent className="text-center py-8 text-zinc-500">لا توجد طلبات</CardContent></Card>
          : <div className="space-y-3">
              {requests.map((r) => (
                <Card key={r.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-1 text-sm">
                        <p className="text-zinc-100 font-medium">{r.employee_name || r.employee_id}</p>
                        <p className="text-xs text-zinc-400">{r.purpose}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                            <span>النوع: {r.transport_type}</span>
                          {r.destination && <span>الجهة: {r.destination}</span>}
                          {r.requester_section && <span>القسم: {r.requester_section}</span>}
                          {r.requested_time && <span>الزمن: {r.requested_time?.slice(0,5)}</span>}
                          {r.assigned_driver_name && <span>السائق: {r.assigned_driver_name}</span>}
                          {r.assigned_vehicle_plate && <span>المركبة: {r.assigned_vehicle_plate}</span>}
                          {r.fuel_consumed && <span>الوقود: {r.fuel_consumed} لتر</span>}
                        </div>
                        {r.notes && <p className="text-xs text-zinc-600 mt-1">{r.notes}</p>}
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] ${statusColors[r.status] || "bg-zinc-500/10 text-zinc-400"}`}>
                        <Clock className="h-3 w-3" />
                        {statusLabels[r.status] || r.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }

        {/* New request dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg">
            <DialogHeader><DialogTitle className="text-zinc-100">طلب مواصلات جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-sm py-4">
              <div className="col-span-2">
                <Label className="text-zinc-400">الاسم *</Label>
                <Input required value={form.employee_name} onChange={(e) => setForm((p) => ({ ...p, employee_name: e.target.value }))}
                  placeholder="أدخل اسمك كاملاً"
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-zinc-400">جهة الطالب / القسم</Label>
                <Input value={form.requester_section} onChange={(e) => setForm((p) => ({ ...p, requester_section: e.target.value }))}
                  placeholder="القسم أو الإدارة"
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">الغرض *</Label>
                <Input required value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                  placeholder="سبب الطلب"
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">نوع المواصلات</Label>
                <select value={form.transport_type} onChange={(e) => setForm((p) => ({ ...p, transport_type: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 mt-1">
                  <option value="باص">باص</option>
                  <option value="سيارة">سيارة</option>
                  <option value="دراجة">دراجة</option>
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">الجهة</Label>
                <Input value={form.destination} onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
                  placeholder="الوجهة"
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">الزمن</Label>
                <Input type="time" value={form.requested_time} onChange={(e) => setForm((p) => ({ ...p, requested_time: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-zinc-400">ملاحظات</Label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 mt-1" rows={2} />
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700 text-zinc-400">إلغاء</Button>
                <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">{saving ? "..." : "إرسال الطلب"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
