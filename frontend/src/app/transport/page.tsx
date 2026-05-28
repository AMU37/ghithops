"use client"

import { useState, useEffect, Fragment } from "react"
import { Play, CheckCircle, XCircle, Plus, Pencil, Trash2, Search, FileSpreadsheet, FileText, Filter, Undo2, Fuel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import CrudDataTable, { CrudField } from "@/components/ui/crud-data-table"
import ColumnSelector from "@/components/ui/column-selector"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import api from "@/lib/api"
import { exportCSV, exportPDF } from "@/lib/export-utils"

const statusLabels: Record<string, string> = {
  scheduled: "مجدولة", in_progress: "قيد التنفيذ", completed: "مكتملة", cancelled: "ملغية",
  active: "نشط", inactive: "غير نشط", available: "متاح", on_trip: "في رحلة",
  off_duty: "في إجازة", maintenance: "صيانة", out_of_service: "خارج الخدمة", suspended: "موقوف",
}
const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400", in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-400", cancelled: "bg-red-500/10 text-red-400",
  active: "bg-emerald-500/10 text-emerald-400", inactive: "bg-red-500/10 text-red-400",
  available: "bg-emerald-500/10 text-emerald-400", on_trip: "bg-amber-500/10 text-amber-400",
  off_duty: "bg-zinc-500/10 text-zinc-400", maintenance: "bg-red-500/10 text-red-400",
  out_of_service: "bg-red-500/10 text-red-400", suspended: "bg-red-500/10 text-red-400",
}

function renderStatus(status: string) {
  const color = statusColors[status] || "bg-zinc-500/10 text-zinc-400"
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${color}`}>{statusLabels[status] || status || "-"}</span>
}

const shiftFields: CrudField[] = [
  { name: "name", label: "الاسم", type: "text", required: true },
  { name: "description", label: "الوصف", type: "textarea" },
  { name: "work_days", label: "أيام الدوام", type: "number", default: 6 },
  { name: "vacation_days", label: "أيام الإجازة", type: "number", default: 1 },
  { name: "status", label: "الحالة", type: "select", options: [{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }], default: "active" },
]

const vehicleFields: CrudField[] = [
  { name: "plate_number", label: "رقم اللوحة", type: "text", required: true },
  { name: "bus_number", label: "رقم الباص", type: "text" },
  { name: "vehicle_type", label: "النوع", type: "select", options: [
    { value: "باص", label: "باص" }, { value: "دينة", label: "دينة" }, { value: "سيارة", label: "سيارة" },
    { value: "دراجة", label: "دراجة" }, { value: "شاحنة", label: "شاحنة" }, { value: "أخرى", label: "أخرى" },
  ], default: "باص" },
  { name: "vehicle_purpose", label: "الغرض", type: "select", options: [
    { value: "توصيل الموظفين", label: "توصيل الموظفين" },
    { value: "توصيل مشتريات", label: "توصيل مشتريات" },
    { value: "توصيل خدمات", label: "توصيل خدمات" },
    { value: "توصيل مخلفات", label: "توصيل مخلفات" },
    { value: "سيارة نقل صغير", label: "سيارة نقل صغير" },
    { value: "اسعاف", label: "اسعاف" },
    { value: "اطفاء", label: "اطفاء" },
    { value: "توصيل خياطات", label: "توصيل خياطات" },
  ] },
  { name: "capacity", label: "السعة", type: "number", default: 30 },
  { name: "model", label: "الموديل", type: "text" },
  { name: "color", label: "اللون", type: "text" },
  { name: "fuel_efficiency", label: "معدل الاستهلاك (كم/لتر)", type: "number" },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "active", label: "نشط" }, { value: "maintenance", label: "صيانة" }, { value: "out_of_service", label: "خارج الخدمة" }
  ], default: "active" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

const driverFields: CrudField[] = [
  { name: "name", label: "الاسم", type: "text", required: true },
  { name: "phone", label: "الجوال", type: "text" },
  { name: "employee_id", label: "كود الدخول", type: "text", required: true },
  { name: "pin", label: "الرمز السري", type: "text", inputType: "password" },
  { name: "license_number", label: "الرخصة", type: "text" },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "available", label: "متاح" }, { value: "on_trip", label: "في رحلة" },
    { value: "off_duty", label: "في إجازة" }, { value: "inactive", label: "غير نشط" }
  ], default: "available" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

const routeFields: CrudField[] = [
  { name: "name", label: "الاسم", type: "text", required: true },
  { name: "area", label: "المنطقة", type: "text" },
  { name: "departure_time", label: "وقت الانطلاق", type: "time" },
  { name: "return_time", label: "وقت العودة", type: "time" },
  { name: "shift_type", label: "نوع الدوام", type: "select", fkEndpoint: "/transport/shift-types/", fkLabel: "name" },
  { name: "default_vehicle", label: "المركبة", type: "select", fkEndpoint: "/transport/vehicles/", fkLabel: "plate_number" },
  { name: "default_driver", label: "السائق", type: "select", fkEndpoint: "/transport/drivers/", fkLabel: "name" },
  { name: "status", label: "الحالة", type: "select", options: [{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }], default: "active" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

const violationFields: CrudField[] = [
  { name: "employee_id", label: "كود الموظف", type: "text", required: true },
  { name: "employee_name", label: "الاسم", type: "text" },
  { name: "violation_type", label: "نوع المخالفة", type: "select", options: [
    { value: "متأخر", label: "متأخر" }, { value: "غائب", label: "غائب" },
    { value: "مخالفة مرورية", label: "مخالفة مرورية" }, { value: "سلوك غير لائق", label: "سلوك غير لائق" },
    { value: "أخرى", label: "أخرى" },
  ], required: true },
  { name: "description", label: "الوصف", type: "textarea" },
  { name: "date", label: "التاريخ", type: "date", required: true },
  { name: "trip", label: "الرحلة", type: "select", fkEndpoint: "/transport/trips/", fkLabel: "trip_date" },
]

const rideLogFields: CrudField[] = [
  { name: "employee_id", label: "كود الموظف", type: "text", required: true },
  { name: "employee_name", label: "الاسم", type: "text" },
  { name: "trip", label: "الرحلة", type: "select", fkEndpoint: "/transport/trips/", fkLabel: "trip_date", required: true },
  { name: "action", label: "الإجراء", type: "select", options: [
    { value: "board", label: "ركوب" }, { value: "disembark", label: "نزول" },
    { value: "assigned", label: "تعيين" }, { value: "absent", label: "غياب" }
  ], required: true },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "on_time", label: "في الوقت" }, { value: "late", label: "متأخر" },
  ], default: "on_time" },
  { name: "method", label: "الطريقة", type: "select", options: [
    { value: "manual", label: "يدوي" }, { value: "qr", label: "QR" },
  ], default: "manual" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

function crudRender(col: string, row: any) {
  if (col === "status") return renderStatus(row[col])
  return <span className="text-zinc-100">{row[col] ?? "-"}</span>
}

function TripForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ route: "", vehicle: "", driver: "", trip_date: "", departure_time: "", return_time: "", status: "scheduled" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post("/transport/trips/", form)
    setForm({ route: "", vehicle: "", driver: "", trip_date: "", departure_time: "", return_time: "", status: "scheduled" })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-zinc-300">التاريخ</Label>
        <Input type="date" value={form.trip_date} onChange={(e) => setForm({ ...form, trip_date: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" required />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">خط السير</Label>
        <FkSelect endpoint="/transport/routes/" labelKey="name" value={form.route} onChange={(v) => setForm({ ...form, route: v })} />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">المركبة</Label>
        <FkSelect endpoint="/transport/vehicles/" labelKey="plate_number" value={form.vehicle} onChange={(v) => setForm({ ...form, vehicle: v })} />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">السائق</Label>
        <FkSelect endpoint="/transport/drivers/" labelKey="name" value={form.driver} onChange={(v) => setForm({ ...form, driver: v })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-300">وقت الانطلاق</Label>
          <Input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-300">وقت العودة</Label>
          <Input type="time" value={form.return_time} onChange={(e) => setForm({ ...form, return_time: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
        </div>
      </div>
      <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black">إضافة</Button>
    </form>
  )
}

function FkSelect({ endpoint, labelKey, value, onChange }: { endpoint: string; labelKey: string; value: string; onChange: (v: string) => void }) {
  const [options, setOptions] = useState<any[]>([])
  useEffect(() => { api.get(endpoint).then((r) => setOptions(r.data.results || r.data)).catch(() => {}) }, [endpoint])
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
      <option value="">---</option>
      {options.map((o: any) => <option key={o.id} value={o.id}>{o[labelKey] || o.id}</option>)}
    </select>
  )
}

const empAllColumns = [
  { key: "employee_id", label: "الكود" },
  { key: "full_name", label: "الاسم" },
  { key: "department_name", label: "القسم" },
  { key: "phone", label: "الجوال" },
  { key: "position", label: "المسمى" },
  { key: "shift_type_name", label: "نوع الدوام" },
  { key: "route_name", label: "خط السير" },
  { key: "assembly_point_name", label: "نقطة التجمع" },
  { key: "city", label: "المدينة" },
  { key: "arrival_time", label: "الوصول" },
  { key: "departure_time", label: "الانصراف" },
  { key: "residence_location", label: "مكان السكن" },
  { key: "transport_type", label: "نوع النقل" },
  { key: "cycle_status", label: "الحالة الدورية" },
  { key: "shift_start_date", label: "تاريخ بداية الدوام" },
  { key: "work_date", label: "اليوم" },
  { key: "cycle_start_date", label: "بداية الدورة" },
  { key: "vacation_end", label: "تاريخ نهاية الإجازة" },
]

function EmployeesTab() {
  const [employees, setEmployees] = useState<any[]>([])
  const [transportMap, setTransportMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  const [fkOptions, setFkOptions] = useState<Record<string, any[]>>({})
  const [empVisibleCols, setEmpVisibleCols] = useState<string[]>(
    ["employee_id", "full_name", "department_name", "phone", "position", "shift_type_name", "route_name", "assembly_point_name", "city", "arrival_time", "departure_time", "residence_location", "transport_type", "shift_start_date", "work_date", "cycle_start_date", "vacation_end", "cycle_status"]
  )

  const centralFields = [
    { name: "employee_id", label: "كود الموظف", required: true },
    { name: "full_name", label: "الاسم", required: true },
    { name: "phone", label: "الجوال" },
    { name: "position", label: "المسمى" },
  ]

  const transportExtraFields = [
    { name: "shift_type", label: "نوع الدوام", fkEndpoint: "/transport/shift-types/", fkLabel: "name" },
    { name: "route", label: "خط السير", fkEndpoint: "/transport/routes/", fkLabel: "name" },
    { name: "assembly_point", label: "نقطة التجمع", fkEndpoint: "/transport/assembly-points/", fkLabel: "name" },
    { name: "city", label: "المدينة" },
    { name: "arrival_time", label: "وقت الوصول", type: "time" },
    { name: "departure_time", label: "وقت الانصراف", type: "time" },
    { name: "residence_location", label: "مكان السكن" },
    { name: "transport_type", label: "نوع النقل" },
    { name: "shift_start_date", label: "تاريخ بداية الدوام", type: "date" },
  ]

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get("/employees/"),
      api.get("/transport/employee-infos/"),
    ]).then(([empRes, infoRes]) => {
      const emps = empRes.data.results || empRes.data
      const infos = infoRes.data.results || infoRes.data
      const map: Record<string, any> = {}
      infos.forEach((info: any) => { map[info.employee_id] = info })
      setEmployees(emps)
      setTransportMap(map)
    }).finally(() => setLoading(false))
    // load FK options
    api.get("/transport/shift-types/").then((r) => setFkOptions((p) => ({ ...p, shift_type: r.data.results || r.data }))).catch(() => {})
    api.get("/transport/routes/").then((r) => setFkOptions((p) => ({ ...p, route: r.data.results || r.data }))).catch(() => {})
    api.get("/transport/assembly-points/").then((r) => setFkOptions((p) => ({ ...p, assembly_point: r.data.results || r.data }))).catch(() => {})
  }, [])

  const resetForm = () => {
    setForm({ employee_id: "", full_name: "", phone: "", position: "", shift_type: "", route: "", assembly_point: "", city: "", arrival_time: "", departure_time: "", residence_location: "", transport_type: "ورديات", shift_start_date: "" })
    setFormError("")
  }

  const openAdd = () => {
    setEditItem(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (emp: any) => {
    const ti = transportMap[emp.employee_id] || {}
    setEditItem(emp)
    setForm({
      employee_id: emp.employee_id || "",
      full_name: emp.full_name || "",
      phone: emp.phone || "",
      position: emp.position || "",
      shift_type: ti.shift_type || "",
      route: ti.route || "",
      assembly_point: ti.assembly_point || "",
      city: ti.city || "",
      arrival_time: ti.arrival_time || "",
      departure_time: ti.departure_time || "",
      residence_location: ti.residence_location || "",
      transport_type: ti.transport_type || "ورديات",
      shift_start_date: ti.shift_start_date || "",
    })
    setFormError("")
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError("")
    try {
      const empId = form.employee_id

      const tiPayload: Record<string, any> = {
        employee_id: empId,
        employee_name: form.full_name,
        shift_type: form.shift_type || null,
        route: form.route || null,
        assembly_point: form.assembly_point || null,
        city: form.city,
        arrival_time: form.arrival_time || null,
        departure_time: form.departure_time || null,
        residence_location: form.residence_location,
        transport_type: form.transport_type || "ورديات",
        shift_start_date: form.shift_start_date || null,
      }
      const existingTi = transportMap[empId]
      if (existingTi) {
        await api.put(`/transport/employee-infos/${existingTi.id}/`, tiPayload)
      } else {
        await api.post("/transport/employee-infos/", tiPayload)
      }

      setDialogOpen(false)
    } catch (err: any) {
      if (err.response?.data) {
        const msgs = typeof err.response.data === "string" ? err.response.data
          : Object.entries(err.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
        setFormError(msgs || "خطأ في التحقق من البيانات")
      } else {
        setFormError(err.message || "حدث خطأ")
      }
    } finally {
      try {
        const [empRes, infoRes] = await Promise.all([
          api.get("/employees/"),
          api.get("/transport/employee-infos/"),
        ])
        setEmployees(empRes.data.results || empRes.data)
        const map: Record<string, any> = {}
        ;(infoRes.data.results || infoRes.data).forEach((info: any) => { map[info.employee_id] = info })
        setTransportMap(map)
      } catch {}
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return
    try {
      await api.delete(`/employees/${id}/`)
      setEmployees((prev) => prev.filter((e) => e.id !== id))
    } catch (err) { console.error(err) }
  }

  const filtered = search ? employees.filter((e) =>
    [e.employee_id, e.full_name, e.phone, (e.department_name || "")].some((v) => v?.includes(search))
  ) : employees

  const cycleColorMap: Record<string, string> = {
    arriving: "bg-blue-500/10 text-blue-400",
    working: "bg-emerald-500/10 text-emerald-400",
    departing: "bg-amber-500/10 text-amber-400",
    vacation: "bg-purple-500/10 text-purple-400",
    transport_arrange: "bg-cyan-500/10 text-cyan-400",
  }

  const renderFormField = (name: string, label: string, opts?: { type?: string; fkEndpoint?: string; fkLabel?: string; required?: boolean }) => {
    const val = form[name] ?? ""
    const setVal = (v: any) => setForm((p) => ({ ...p, [name]: v }))
    const { type = "text", fkEndpoint, fkLabel, required } = opts || {}

    if (fkEndpoint) {
      const options = fkOptions[name] || []
      return (
        <select value={val} onChange={(e) => setVal(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
          <option value="">---</option>
          {options.map((o: any) => <option key={o.id} value={o.id}>{fkLabel ? o[fkLabel] : o.name}</option>)}
        </select>
      )
    }
    if (type === "time") {
      return <Input type="time" value={val} onChange={(e) => setVal(e.target.value)} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
    }
    return <Input type={type} value={val} onChange={(e) => setVal(e.target.value)} className="bg-zinc-900 border-zinc-700 text-zinc-100" required={required} />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg text-zinc-100">الموظفين</CardTitle>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="w-48 pr-9 bg-zinc-900 border-zinc-700 text-zinc-100" />
          </div>
          <ColumnSelector storageKey="transport_employees" columns={empAllColumns} defaultVisible={empVisibleCols} onChange={setEmpVisibleCols} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="bg-amber-500 hover:bg-amber-600 text-black"><Plus className="h-4 w-4 ml-1" /> إضافة</Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader><DialogTitle>إضافة موظف</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">{formError}</div>}
                <div className="grid grid-cols-2 gap-4">
                  {centralFields.map((f) => (
                    <div key={f.name} className="space-y-2">
                      <Label className="text-zinc-300">{f.label}</Label>
                      {renderFormField(f.name, f.label, { required: f.required })}
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-sm text-zinc-400 mb-3">بيانات النقل الإضافية</p>
                  <div className="grid grid-cols-2 gap-4">
                    {transportExtraFields.map((f) => (
                      <div key={f.name} className="space-y-2">
                        <Label className="text-zinc-300">{f.label}</Label>
                        {renderFormField(f.name, f.label, {
                          type: (f as any).type,
                          fkEndpoint: (f as any).fkEndpoint,
                          fkLabel: (f as any).fkLabel,
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
                  {saving ? "جاري الحفظ..." : (editItem ? "تحديث" : "إضافة")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ direction: "rtl" }}>
            <thead>
              <tr className="border-b border-zinc-800">
                {empVisibleCols.map((col) => {
                  const found = empAllColumns.find((c) => c.key === col)
                  return <th key={col} className="text-right py-3 px-4 text-zinc-400 font-medium">{found?.label || col}</th>
                })}
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={empVisibleCols.length + 1} className="text-center py-8 text-zinc-500">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={empVisibleCols.length + 1} className="text-center py-8 text-zinc-500">لا يوجد موظفين</td></tr>
              ) : filtered.map((emp: any) => {
                const ti = transportMap[emp.employee_id]
                const cs = ti?.cycle_status
                return (
                  <tr key={emp.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    {empVisibleCols.map((col) => {
                      let content: React.ReactNode = null
                      if (col === "employee_id") content = <span className="text-zinc-100">{emp.employee_id}</span>
                      else if (col === "full_name") content = <span className="text-zinc-100">{emp.full_name}</span>
                      else if (col === "department_name") content = <span className="text-zinc-400">{emp.department_name || "-"}</span>
                      else if (col === "phone") content = <span className="text-zinc-400">{emp.phone || "-"}</span>
                      else if (col === "position") content = <span className="text-zinc-400">{emp.position || "-"}</span>
                      else if (col === "shift_type_name") content = <span className="text-zinc-400">{ti?.shift_type_name || "-"}</span>
                      else if (col === "route_name") content = <span className="text-zinc-400">{ti?.route_name || "-"}</span>
                      else if (col === "assembly_point_name") content = <span className="text-zinc-400">{ti?.assembly_point_name || "-"}</span>
                      else if (col === "city") content = <span className="text-zinc-400">{ti?.city || "-"}</span>
                      else if (col === "arrival_time") content = <span className="text-zinc-400">{ti?.arrival_time?.slice(0, 5) || "-"}</span>
                      else if (col === "departure_time") content = <span className="text-zinc-400">{ti?.departure_time?.slice(0, 5) || "-"}</span>
                      else if (col === "residence_location") content = <span className="text-zinc-400">{ti?.residence_location || "-"}</span>
                      else if (col === "transport_type") content = <span className="text-zinc-400">{ti?.transport_type || "-"}</span>
                      else if (col === "shift_start_date") content = <span className="text-zinc-400">{ti?.shift_start_date || "-"}</span>
                      else if (col === "work_date") {
                        let text = "-"
                        if (cs?.cycle_start) {
                          try {
                            const [y, m, d] = cs.cycle_start.split("-").map(Number)
                            text = new Intl.DateTimeFormat("ar-SA", { weekday: "long" }).format(new Date(y, m - 1, d))
                          } catch {}
                        }
                        content = <span className="text-zinc-400">{text}</span>
                      }
                      else if (col === "cycle_start_date") content = <span className="text-zinc-400">{cs?.cycle_start || "-"}</span>
                      else if (col === "vacation_end") content = <span className="text-zinc-400">{cs?.vacation_end || "-"}</span>
                      else if (col === "cycle_status") {
                        content = cs ? (
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs ${cycleColorMap[cs.status] || "bg-zinc-500/10 text-zinc-400"}`}>{cs.label}</span>
                        ) : <span className="text-zinc-500">-</span>
                      }
                      return <td key={col} className="py-3 px-4">{content}</td>
                    })}
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} title="تعديل"><Pencil className="h-4 w-4 text-amber-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} title="حذف"><Trash2 className="h-4 w-4 text-red-400" /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function RideLogsReport() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [vehicles, setVehicles] = useState<Record<string, any>>({})

  useEffect(() => {
    api.get("/transport/vehicles/").then((r) => {
      const map: Record<string, any> = {}
      ;(r.data.results || r.data).forEach((v: any) => { map[v.id] = v })
      setVehicles(map)
    }).catch(() => {})
  }, [])

  const fetchReport = () => {
    setLoading(true)
    api.get(`/transport/trips/?date=${date}`).then((res) => {
      setTrips(res.data.results || res.data)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchReport() }, [date])

  // cross-trip employee map: employee_id → { plannedTripIds: Set, boardedTripIds: Set }
  const empMap = new Map<string, { plannedTripIds: Set<number>, boardedTripIds: Set<number> }>()
  for (const t of trips) {
    for (const r of (t.riders || [])) {
      if (!empMap.has(r.employee_id)) empMap.set(r.employee_id, { plannedTripIds: new Set(), boardedTripIds: new Set() })
      const entry = empMap.get(r.employee_id)!
      if (r.was_assigned) entry.plannedTripIds.add(t.id)
      if (r.action === 'board') entry.boardedTripIds.add(t.id)
    }
  }

  const totalPlanned = trips.reduce((s, t) => s + (t.planned_count || 0), 0)
  const totalBoarded = trips.reduce((s, t) => s + (t.rider_count || 0), 0)
  const totalCapacity = trips.reduce((s, t) => s + (vehicles[t.vehicle]?.capacity || 0), 0)
  const absentCount = trips.reduce((s, t) => {
    if (t.status !== "completed") return s
    const planned = (t.riders || []).filter((r: any) => r.action === 'assigned')
    const boarded = (t.riders || []).filter((r: any) => r.action === 'board')
    return s + planned.filter((p: any) => {
      if (boarded.find((b: any) => b.employee_id === p.employee_id)) return false
      const entry = empMap.get(p.employee_id)
      return !(entry && [...entry.boardedTripIds].some(id => id !== t.id))
    }).length
  }, 0)
  const extraCount = trips.reduce((s, t) => {
    return s + (t.riders || []).filter((r: any) => !r.was_assigned).filter((r: any) => { const e = empMap.get(r.employee_id); return !e || e.plannedTripIds.size === 0 }).length
  }, 0)
  const occupancyPct = totalCapacity ? Math.round((totalBoarded / totalCapacity) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg text-zinc-100">تقرير سجل الركوب</CardTitle>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-zinc-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
        : trips.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد رحلات في هذا التاريخ</p>
        : <div className="space-y-6">
            {trips.map((t) => {
              const v = vehicles[t.vehicle]
              const planned = t.planned_count || 0
              const boarded = t.rider_count || 0
              const isCompleted = t.status === "completed"
              const plannedRiders = (t.riders || []).filter((r: any) => r.action === 'assigned')
              const boardRiders = (t.riders || []).filter((r: any) => r.action === 'board')
              const matchedRiders = boardRiders.filter((b: any) => b.was_assigned)
              const matched = matchedRiders.length
              const fromOtherLine = boardRiders.filter((b: any) => !b.was_assigned).filter((b: any) => { const e = empMap.get(b.employee_id); return e && e.plannedTripIds.size > 0 }).length
              const manualAdd = boardRiders.filter((b: any) => /^(TEMP-|MANUAL-)/.test(String(b.employee_id))).length
              const violators = boardRiders.filter((b: any) => !b.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(b.employee_id))).filter((b: any) => { const e = empMap.get(b.employee_id); return !e || e.plannedTripIds.size === 0 }).length
              const allPlanned = [...plannedRiders, ...matchedRiders]
              const absentList = plannedRiders.filter((p: any) => {
                if (boardRiders.find((b: any) => b.employee_id === p.employee_id)) return false
                const entry = empMap.get(p.employee_id)
                return !(entry && [...entry.boardedTripIds].some(id => id !== t.id))
              })
              const absent = isCompleted ? absentList.length : 0
              const extra = boardRiders.filter((b: any) => !b.was_assigned).filter((b: any) => { const e = empMap.get(b.employee_id); return !e || e.plannedTripIds.size === 0 }).length
              const capacity = v?.capacity || 0
              const pct = capacity ? Math.round((boarded / capacity) * 100) : 0
              return (
                <div key={t.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="bg-zinc-900/80 px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-zinc-400">🚌 {t.vehicle_plate || "-"} <span className="text-zinc-600">({capacity} مقعد)</span></span>
                      <span className="text-zinc-400">👤 {t.driver_name || "-"}</span>
                      <span className="text-zinc-200 font-medium">📍 {Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "-")}</span>
                      <span className="text-zinc-400">📌 {t.assembly_point_name || "-"}</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-zinc-300">مطابق: {matched}</span>
                      <span className="text-amber-400">من خط آخر: {fromOtherLine}</span>
                      <span className="text-blue-400">مضاف: {manualAdd}</span>
                      <span className="text-red-400">مخالف: {violators}</span>
                      <span className="text-emerald-400">صاعد: {boarded}</span>
                      <span className="text-amber-400">مخطط: {planned}</span>
                      <span className="text-red-400">غائب: {absent}</span>
                      <span className="text-purple-400">السعة: {boarded}/{capacity} ({pct}%)</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-xs text-zinc-500 font-medium mb-2">الموظفون المخططون</h4>
                      {allPlanned.length === 0 ? <p className="text-xs text-zinc-600">لا يوجد</p>
                      : <table className="w-full text-xs" style={{ direction: "rtl" }}>
                          <thead><tr className="border-b border-zinc-700">
                            <th className="text-right py-1 px-2 text-zinc-500">الكود</th>
                            <th className="text-right py-1 px-2 text-zinc-500">الاسم</th>
                            <th className="text-right py-1 px-2 text-zinc-500">القسم</th>
                            <th className="text-right py-1 px-2 text-zinc-500">نقطة التجمع</th>
                            <th className="text-right py-1 px-2 text-zinc-500">الحالة</th>
                          </tr></thead>
                          <tbody>
                             {allPlanned.map((r: any, i: number) => {
                              const isMatched = r.was_assigned && r.action === 'board'
                              const boardedSame = boardRiders.find((b: any) => b.employee_id === r.employee_id && b.was_assigned)
                              const entry = empMap.get(r.employee_id)
                              const boardedElsewhere = entry && [...entry.boardedTripIds].some(id => id !== t.id)
                              let statusText = 'لم يتم'
                              let statusColor = 'text-zinc-500'
                              if (isMatched) { statusText = 'مطابق'; statusColor = 'text-emerald-400' }
                              else if (boardedSame) { statusText = 'صعد'; statusColor = 'text-emerald-400' }
                              else if (boardedElsewhere) { statusText = 'صعد من خط آخر'; statusColor = 'text-amber-400' }
                              else if (isCompleted) { statusText = 'غائب'; statusColor = 'text-red-400' }
                              return (
                                <tr key={i} className="border-b border-zinc-800/30">
                                  <td className="py-1 px-2 text-zinc-300">{r.employee_id}</td>
                                  <td className="py-1 px-2 text-zinc-100">{r.employee_name}</td>
                                  <td className="py-1 px-2 text-zinc-400">{r.department || "-"}</td>
                                  <td className="py-1 px-2 text-zinc-400">{r.assembly_point || "-"}</td>
                                  <td className="py-1 px-2">
                                    <span className={`text-[10px] ${statusColor}`}>{statusText}</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>}
                    </div>
                    {extra > 0 && <div>
                      <h4 className="text-xs text-zinc-500 font-medium mb-2">موظفون إضافيون</h4>
                      <table className="w-full text-xs" style={{ direction: "rtl" }}>
                        <thead><tr className="border-b border-zinc-700">
                          <th className="text-right py-1 px-2 text-zinc-500">الكود</th>
                          <th className="text-right py-1 px-2 text-zinc-500">الاسم</th>
                          <th className="text-right py-1 px-2 text-zinc-500">القسم</th>
                          <th className="text-right py-1 px-2 text-zinc-500">نقطة التجمع</th>
                          <th className="text-right py-1 px-2 text-zinc-500">النوع</th>
                        </tr></thead>
                        <tbody>
                          {boardRiders.filter((b: any) => !b.was_assigned).map((r: any, i: number) => {
                            const isManualOrTemp = /^(TEMP-|MANUAL-)/.test(String(r.employee_id))
                            const entry = empMap.get(r.employee_id)
                            const plannedElsewhere = entry && entry.plannedTripIds.size > 0
                            let extraType: string, typeColor: string
                            if (isManualOrTemp) { extraType = 'مضاف يدوي'; typeColor = 'text-blue-400' }
                            else if (plannedElsewhere) { extraType = 'صعد من خط آخر'; typeColor = 'text-amber-400' }
                            else { extraType = 'مخالف'; typeColor = 'text-red-400' }
                            return (
                              <tr key={i} className="border-b border-zinc-800/30">
                                <td className="py-1 px-2 text-zinc-300">{r.employee_id}</td>
                                <td className="py-1 px-2 text-zinc-100">{r.employee_name}</td>
                                <td className="py-1 px-2 text-zinc-400">{r.department || "-"}</td>
                                <td className="py-1 px-2 text-zinc-400">{r.assembly_point || "-"}</td>
                                <td className="py-1 px-2"><span className={`text-[10px] ${typeColor}`}>{extraType}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {boardRiders.filter((b: any) => !b.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(b.employee_id))).filter((b: any) => { const e = empMap.get(b.employee_id); return e && e.plannedTripIds.size === 0 }).length > 0 && <div className="text-xs text-red-400 bg-red-500/5 px-3 py-2 rounded mt-2">⚠️ يوجد موظفون مخالفون بدون تخطيط مسبق، يوصى بمراجعة بياناتهم ونوع الدوام</div>}
                      {boardRiders.filter((b: any) => !b.was_assigned).filter((b: any) => { const e = empMap.get(b.employee_id); return e && e.plannedTripIds.size > 0 }).length > 0 && <div className="text-xs text-amber-400 bg-amber-500/5 px-3 py-2 rounded mt-2">⚠️ يوجد موظفون صعدوا من خط آخر، يوصى بالتأكد من تغيير موقع السكن</div>}
                    </div>}
                    {t.status === "cancelled" && <div className="text-xs text-red-400 bg-red-500/5 px-3 py-2 rounded">⚠️ تم إلغاء هذه الرحلة</div>}
                    {capacity > 0 && boarded > capacity && <div className="text-xs text-red-400 bg-red-500/5 px-3 py-2 rounded">⚠️ تجاوز السعة الاستيعابية بمقدار {boarded - capacity}</div>}
                    {isCompleted && absent > 0 && <div className="text-xs text-amber-400 bg-amber-500/5 px-3 py-2 rounded">⚠️ {absent} موظف من المخطط لهم لم يصعدوا</div>}
                    {!isCompleted && allPlanned.filter((r: any) => !r.was_assigned).length > 0 && boarded === 0 && <div className="text-xs text-zinc-500 bg-zinc-800/30 px-3 py-2 rounded">⏳ الرحلة لم تكتمل بعد</div>}
                  </div>
                </div>
              )
            })}

            {/* الإجمالي الكلي والتوصيات */}
            <div className="border border-amber-800/50 bg-amber-950/10 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-amber-400">📊 إجمالي التحليل</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-zinc-900 rounded-lg p-3 text-center">
                  <div className="text-amber-400 text-lg font-bold">{totalPlanned}</div>
                  <div className="text-zinc-500 text-xs">إجمالي المخطط</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 text-center">
                  <div className="text-emerald-400 text-lg font-bold">{totalBoarded}</div>
                  <div className="text-zinc-500 text-xs">إجمالي الصاعد</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 text-center">
                  <div className="text-red-400 text-lg font-bold">{absentCount}</div>
                  <div className="text-zinc-500 text-xs">إجمالي الغائبين</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 text-center">
                  <div className="text-blue-400 text-lg font-bold">{extraCount}</div>
                  <div className="text-zinc-500 text-xs">إضافيين</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-zinc-900 rounded-lg p-3 text-center">
                  <div className="text-purple-400 text-lg font-bold">{totalCapacity}</div>
                  <div className="text-zinc-500 text-xs">إجمالي السعة</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 text-center">
                  <div className="text-purple-400 text-lg font-bold">{occupancyPct}%</div>
                  <div className="text-zinc-500 text-xs">نسبة الإشغال</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 text-center">
                  <div className="text-zinc-100 text-lg font-bold">{trips.length}</div>
                  <div className="text-zinc-500 text-xs">عدد الرحلات</div>
                </div>
              </div>

              {/* التوصيات */}
              <div className="space-y-1">
                <h4 className="text-xs text-zinc-400 font-medium mt-3">💡 التوصيات والتحسينات</h4>
                <ul className="text-xs text-zinc-300 space-y-1 pr-4">
                  {absentCount > 0 && <li className="list-disc">• يوجد {absentCount} موظف غائب عن الرحلات المكتملة، يوصى بمتابعة أسباب الغياب.</li>}
                  {extraCount > 0 && <li className="list-disc">• يوجد {extraCount} موظف إضافي، يوصى بتحديث خطة التوزيع.</li>}
                  {trips.filter((t) => {
                    const v = vehicles[t.vehicle]
                    return v?.capacity && t.rider_count > v.capacity
                  }).length > 0 && <li className="list-disc">• توجد رحلات تجاوزت السعة الاستيعابية، يوصى بتوفير باصات إضافية.</li>}
                  {trips.filter((t) => t.status === "completed" && (t.riders || []).filter((r: any) => r.action === 'assigned').length > 0 && t.rider_count === 0).length > 0 && <li className="list-disc">• توجد رحلات مكتملة مخطط لها ولم يصعد أي موظف، يوصى بمراجعة جدولة الرحلات.</li>}
                  {trips.filter((t) => t.status !== "completed" && t.planned_count > 0 && t.rider_count === 0).length > 0 && <li className="list-disc">• توجد رحلات لم تكتمل بعد ولم يصعد أي موظف، يوصى بمتابعة السائقين.</li>}
                  {trips.reduce((s, t) => s + (t.riders || []).filter((r: any) => !r.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(r.employee_id))).filter((r: any) => { const e = empMap.get(r.employee_id); return e && e.plannedTripIds.size === 0 }).length, 0) > 0 && <li className="list-disc">• يوجد موظفون مخالفون بدون تخطيط مسبق، يوصى بمراجعة بياناتهم للتأكد من تغيير نوع الدوام.</li>}
                  {trips.reduce((s, t) => s + (t.riders || []).filter((r: any) => /^(TEMP-|MANUAL-)/.test(String(r.employee_id))).length, 0) > 0 && <li className="list-disc">• يوجد موظفون مضافون يدوياً غير مسجلين في بيانات المواصلات، يوصى بإضافة بياناتهم.</li>}
                  {occupancyPct < 50 && <li className="list-disc">• نسبة الإشغال أقل من 50%، يوصى بدمج بعض الرحلات لتحسين الكفاءة.</li>}
                  {occupancyPct > 90 && <li className="list-disc">• نسبة الإشغال مرتفعة جداً، يوصى بزيادة عدد الرحلات أو سعة الباصات.</li>}
                  <li className="list-disc">• إجمالي الرحلات: {trips.length}، يوصى بتوحيد نقاط التجمع لتقليل زمن الرحلات.</li>
                </ul>
              </div>
            </div>
          </div>
        }
      </CardContent>
    </Card>
  )
}

function TripSummaryReport() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [vehicles, setVehicles] = useState<Record<string, any>>({})

  useEffect(() => {
    api.get("/transport/vehicles/").then((r) => {
      const map: Record<string, any> = {}
      ;(r.data.results || r.data).forEach((v: any) => { map[v.id] = v })
      setVehicles(map)
    }).catch(() => {})
  }, [])

  const fetchReport = () => {
    setLoading(true)
    api.get(`/transport/trips/?date=${date}`).then((res) => {
      setTrips(res.data.results || res.data)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchReport() }, [date])

  const empMap = new Map<string, { plannedTripIds: Set<number>, boardedTripIds: Set<number> }>()
  for (const t of trips) {
    for (const r of (t.riders || [])) {
      if (!empMap.has(r.employee_id)) empMap.set(r.employee_id, { plannedTripIds: new Set(), boardedTripIds: new Set() })
      const entry = empMap.get(r.employee_id)!
      if (r.was_assigned) entry.plannedTripIds.add(t.id)
      if (r.action === 'board') entry.boardedTripIds.add(t.id)
    }
  }

  const tripRows = trips.map((t) => {
    const v = vehicles[t.vehicle]
    const plannedOnly = (t.riders || []).filter((r: any) => r.action === 'assigned')
    const boarders = (t.riders || []).filter((r: any) => r.action === 'board')
    const matched = boarders.filter((r: any) => r.was_assigned).length
    const fromOtherLine = boarders.filter((r: any) => !r.was_assigned).filter((r: any) => { const e = empMap.get(r.employee_id); return e && e.plannedTripIds.size > 0 }).length
    const violators = boarders.filter((r: any) => !r.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(r.employee_id))).filter((r: any) => { const e = empMap.get(r.employee_id); return !e || e.plannedTripIds.size === 0 }).length
    const manualAdd = boarders.filter((r: any) => /^(TEMP-|MANUAL-)/.test(String(r.employee_id))).length
    const absent = plannedOnly.filter((p: any) => { const e = empMap.get(p.employee_id); return !(e && [...e.boardedTripIds].some(id => id !== t.id)) }).length
    const planned = t.planned_count || 0
    const boarded = t.rider_count || 0
    const capacity = v?.capacity || 0
    const pct = capacity ? Math.round((boarded / capacity) * 100) : 0
    return { id: t.id, vehicle_plate: t.vehicle_plate || "-", driver_name: t.driver_name || "-", route_names: t.route_names, assembly_point_name: t.assembly_point_name, status: t.status, capacity, planned, boarded, matched, fromOtherLine, violators, manualAdd, absent, pct }
  })

  const totals = tripRows.reduce((s, r) => ({
    planned: s.planned + r.planned, boarded: s.boarded + r.boarded, matched: s.matched + r.matched,
    fromOtherLine: s.fromOtherLine + r.fromOtherLine, violators: s.violators + r.violators,
    manualAdd: s.manualAdd + r.manualAdd, absent: s.absent + r.absent,
    capacity: s.capacity + r.capacity, trips: s.trips + 1,
  }), { planned: 0, boarded: 0, matched: 0, fromOtherLine: 0, violators: 0, manualAdd: 0, absent: 0, capacity: 0, trips: 0 })
  const occupancyPct = totals.capacity ? Math.round((totals.boarded / totals.capacity) * 100) : 0

  const typeColor = (type: string) => {
    const colors: Record<string, string> = { matched: 'text-emerald-400', fromOtherLine: 'text-amber-400', violators: 'text-red-400', manualAdd: 'text-blue-400', absent: 'text-red-400' }
    return colors[type] || 'text-zinc-300'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg text-zinc-100">تقرير الرحلات</CardTitle>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-zinc-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
        : tripRows.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد رحلات في هذا التاريخ</p>
        : <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ direction: "rtl" }}>
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">الرحلة</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">المركبة</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">السائق</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">الخط</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">نقطة التجمع</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">السعة</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">المخطط</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">الصاعد</th>
                    <th className={`text-right py-2 px-2 whitespace-nowrap ${typeColor('matched')}`}>مطابق</th>
                    <th className={`text-right py-2 px-2 whitespace-nowrap ${typeColor('fromOtherLine')}`}>من خط آخر</th>
                    <th className={`text-right py-2 px-2 whitespace-nowrap ${typeColor('violators')}`}>مخالف</th>
                    <th className={`text-right py-2 px-2 whitespace-nowrap ${typeColor('manualAdd')}`}>مضاف يدوي</th>
                    <th className={`text-right py-2 px-2 whitespace-nowrap ${typeColor('absent')}`}>غائب</th>
                    <th className="text-right py-2 px-2 text-zinc-500 whitespace-nowrap">الإشغال</th>
                  </tr>
                </thead>
                <tbody>
                  {tripRows.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                      <td className="py-2 px-2 text-zinc-300">{r.id}</td>
                      <td className="py-2 px-2 text-zinc-100">{r.vehicle_plate}</td>
                      <td className="py-2 px-2 text-zinc-300">{r.driver_name}</td>
                      <td className="py-2 px-2 text-zinc-200">{Array.isArray(r.route_names) ? r.route_names.join(" + ") : (r.route_names || "-")}</td>
                      <td className="py-2 px-2 text-zinc-400">{r.assembly_point_name || "-"}</td>
                      <td className="py-2 px-2 text-purple-400">{r.capacity}</td>
                      <td className="py-2 px-2 text-amber-400">{r.planned}</td>
                      <td className="py-2 px-2 text-emerald-400">{r.boarded}</td>
                      <td className={`py-2 px-2 ${typeColor('matched')}`}>{r.matched}</td>
                      <td className={`py-2 px-2 ${typeColor('fromOtherLine')}`}>{r.fromOtherLine}</td>
                      <td className={`py-2 px-2 ${typeColor('violators')}`}>{r.violators}</td>
                      <td className={`py-2 px-2 ${typeColor('manualAdd')}`}>{r.manualAdd}</td>
                      <td className={`py-2 px-2 ${typeColor('absent')}`}>{r.absent}</td>
                      <td className="py-2 px-2 text-purple-400">{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-amber-800/50 bg-amber-950/10 font-medium">
                    <td className="py-3 px-2 text-amber-400" colSpan={5}>الإجمالي الكلي</td>
                    <td className="py-3 px-2 text-purple-400">{totals.capacity}</td>
                    <td className="py-3 px-2 text-amber-400">{totals.planned}</td>
                    <td className="py-3 px-2 text-emerald-400">{totals.boarded}</td>
                    <td className={`py-3 px-2 ${typeColor('matched')}`}>{totals.matched}</td>
                    <td className={`py-3 px-2 ${typeColor('fromOtherLine')}`}>{totals.fromOtherLine}</td>
                    <td className={`py-3 px-2 ${typeColor('violators')}`}>{totals.violators}</td>
                    <td className={`py-3 px-2 ${typeColor('manualAdd')}`}>{totals.manualAdd}</td>
                    <td className={`py-3 px-2 ${typeColor('absent')}`}>{totals.absent}</td>
                    <td className="py-3 px-2 text-purple-400">{occupancyPct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* بطاقات إضافية */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-zinc-100 text-lg font-bold">{totals.trips}</div>
                <div className="text-zinc-500 text-xs">عدد الرحلات</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-amber-400 text-lg font-bold">{totals.planned}</div>
                <div className="text-zinc-500 text-xs">إجمالي المخطط</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-emerald-400 text-lg font-bold">{totals.boarded}</div>
                <div className="text-zinc-500 text-xs">إجمالي الصاعد</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-red-400 text-lg font-bold">{totals.absent}</div>
                <div className="text-zinc-500 text-xs">إجمالي الغائبين</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-purple-400 text-lg font-bold">{totals.capacity}</div>
                <div className="text-zinc-500 text-xs">إجمالي السعة</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-purple-400 text-lg font-bold">{occupancyPct}%</div>
                <div className="text-zinc-500 text-xs">نسبة الإشغال</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className={`text-lg font-bold ${totals.fromOtherLine > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>{totals.fromOtherLine}</div>
                <div className="text-zinc-500 text-xs">من خط آخر</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className={`text-lg font-bold ${totals.violators > 0 ? 'text-red-400' : 'text-zinc-500'}`}>{totals.violators}</div>
                <div className="text-zinc-500 text-xs">مخالف</div>
              </div>
            </div>

            {/* التوصيات */}
            <div className="border border-amber-800/50 bg-amber-950/10 rounded-lg p-4 space-y-1">
              <h4 className="text-xs text-zinc-400 font-medium mb-2">💡 التوصيات والتحسينات</h4>
              <ul className="text-xs text-zinc-300 space-y-1 pr-4">
                {totals.absent > 0 && <li className="list-disc">• يوجد {totals.absent} موظف غائب عن الرحلات المكتملة، يوصى بمتابعة أسباب الغياب.</li>}
                {totals.fromOtherLine > 0 && <li className="list-disc">• يوجد {totals.fromOtherLine} موظف صعدوا من خط آخر، يوصى بالتأكد من تغيير موقع سكنهم.</li>}
                {totals.violators > 0 && <li className="list-disc">• يوجد {totals.violators} موظف مخالف بدون تخطيط مسبق، يوصى بمراجعة بياناتهم للتأكد من تغيير نوع الدوام.</li>}
                {totals.manualAdd > 0 && <li className="list-disc">• يوجد {totals.manualAdd} موظف مضاف يدوياً غير مسجلين في بيانات المواصلات، يوصى بإضافة بياناتهم.</li>}
                {tripRows.filter((r) => r.boarded > r.capacity).length > 0 && <li className="list-disc">• توجد رحلات تجاوزت السعة الاستيعابية، يوصى بتوفير باصات إضافية.</li>}
                {occupancyPct < 50 && <li className="list-disc">• نسبة الإشغال الإجمالية {occupancyPct}% وهي أقل من 50%، يوصى بدمج بعض الرحلات لتحسين الكفاءة.</li>}
                {occupancyPct > 90 && <li className="list-disc">• نسبة الإشغال الإجمالية {occupancyPct}% وهي مرتفعة جداً، يوصى بزيادة عدد الرحلات أو سعة الباصات.</li>}
                <li className="list-disc">• إجمالي الرحلات: {totals.trips}.</li>
              </ul>
            </div>
          </div>
        }
      </CardContent>
    </Card>
  )
}

function ViolationsPanel() {
  const [trips, setTrips] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [routes, setRoutes] = useState<any[]>([])
  const [shiftTypes, setShiftTypes] = useState<any[]>([])
  const [assemblyPoints, setAssemblyPoints] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [existingViolations, setExistingViolations] = useState<any[]>([])
  const [editDialog, setEditDialog] = useState(false)
  const [addDialog, setAddDialog] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [editEmpId, setEditEmpId] = useState("")
  const [currentViolation, setCurrentViolation] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(0)

  useEffect(() => {
    api.get("/transport/vehicles/").then((r) => {
      const map: Record<string, any> = {}
      ;(r.data.results || r.data).forEach((v: any) => { map[v.id] = v })
      setVehicles(map)
    }).catch(() => {})
    api.get("/transport/routes/").then((r) => setRoutes(r.data.results || r.data)).catch(() => {})
    api.get("/transport/shift-types/").then((r) => setShiftTypes(r.data.results || r.data)).catch(() => {})
    api.get("/transport/assembly-points/").then((r) => setAssemblyPoints(r.data.results || r.data)).catch(() => {})
  }, [])

  const fetchExistingViolations = () => {
    api.get(`/transport/violations/?date=${date}`).then((res) => {
      setExistingViolations(res.data.results || res.data)
    }).catch(() => {})
  }

  const getViolationStatus = (empId: string, type: string) => {
    const existing = existingViolations.find((v) => v.employee_id === empId && v.violation_type === type)
    return existing ? (existing.resolved ? 'محلول' : 'معلق') : 'جديد'
  }

  const fetchData = () => {
    setLoading(true)
    fetchExistingViolations()
    api.get(`/transport/trips/?date=${date}`).then((res) => {
      const tripsData = res.data.results || res.data
      setTrips(tripsData)
      const empMap = new Map<string, { plannedTripIds: Set<number>, boardedTripIds: Set<number>, plannedRoute: string, boardedRoute: string }>()
      for (const t of tripsData) {
        for (const r of (t.riders || [])) {
          if (!empMap.has(r.employee_id)) empMap.set(r.employee_id, { plannedTripIds: new Set(), boardedTripIds: new Set(), plannedRoute: "", boardedRoute: "" })
          const entry = empMap.get(r.employee_id)!
          if (r.was_assigned) { entry.plannedTripIds.add(t.id); entry.plannedRoute = Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "") }
          if (r.action === 'board') { entry.boardedTripIds.add(t.id); entry.boardedRoute = Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "") }
        }
      }
      const list: any[] = []
      for (const t of tripsData) {
        for (const r of (t.riders || [])) {
          if (r.action !== 'board') continue
          const entry = empMap.get(r.employee_id)
          const isManualOrTemp = /^(TEMP-|MANUAL-)/.test(String(r.employee_id))
          if (isManualOrTemp) {
            list.push({ type: 'manual_add', label: 'مضاف يدوي', employee_id: r.employee_id, employee_name: r.employee_name, department: r.department || "-", assembly_point: r.assembly_point || "-", detail: "غير مسجل في بيانات المواصلات", tripId: t.id, route: Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "") })
          } else if (!r.was_assigned && entry && entry.plannedTripIds.size > 0) {
            list.push({ type: 'from_other_line', label: 'صعد من خط آخر', employee_id: r.employee_id, employee_name: r.employee_name, department: r.department || "-", assembly_point: r.assembly_point || "-", detail: `مخطط لـ ${entry.plannedRoute} / صعد مع ${Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "")}`, tripId: t.id, route: entry.plannedRoute, boardedRoute: Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "") })
          } else if (!r.was_assigned && entry && entry.plannedTripIds.size === 0) {
            list.push({ type: 'violator', label: 'مخالف', employee_id: r.employee_id, employee_name: r.employee_name, department: r.department || "-", assembly_point: r.assembly_point || "-", detail: "بدون تخطيط مسبق", tripId: t.id, route: Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "") })
          }
        }
      }
      const seen = new Set()
      setViolations(list.filter((v) => { if (seen.has(v.employee_id)) return false; seen.add(v.employee_id); return true }))
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchData() }, [date, refreshing])

  const openEditRoute = (v: any) => {
    setCurrentViolation(v)
    setEditEmpId(v.employee_id)
    api.get(`/transport/employee-infos/?employee_id=${v.employee_id}`).then((res) => {
      const items = res.data.results || res.data
      const info = items.length > 0 ? items[0] : {}
      setEditForm({
        employee_id: v.employee_id,
        employee_name: v.employee_name,
        route: info.route || "",
        shift_type: info.shift_type || "",
        assembly_point: info.assembly_point || "",
        city: info.city || "",
        arrival_time: info.arrival_time || "",
        departure_time: info.departure_time || "",
        residence_location: info.residence_location || "",
        transport_type: info.transport_type || "ورديات",
        shift_start_date: info.shift_start_date || "",
      })
      setEditDialog(true)
    }).catch(() => { setEditDialog(true) })
  }

  const openAddEmployee = (v: any) => {
    setCurrentViolation(v)
    setEditEmpId(v.employee_id)
    setEditForm({
      employee_id: v.employee_id,
      employee_name: v.employee_name,
      route: "",
      shift_type: "",
      assembly_point: "",
      city: "",
      arrival_time: "",
      departure_time: "",
      residence_location: "",
      transport_type: "ورديات",
      shift_start_date: "",
    })
    setAddDialog(true)
  }

  const createOrResolveViolation = async (empId: string, empName: string, type: string, resolved: boolean, notes: string = "") => {
    try {
      const existing = existingViolations.find((v) => v.employee_id === empId && v.violation_type === type)
      if (existing) {
        if (resolved) {
          await api.post(`/transport/violations/${existing.id}/resolve/`, { notes })
        }
      } else {
        await api.post("/transport/violations/", {
          employee_id: empId,
          employee_name: empName,
          violation_type: type,
          description: notes,
          date: date,
          resolved: resolved,
        })
      }
    } catch (e) {
      console.error("فشل في تسجيل المخالفة", e)
    }
  }

  const handleEditSave = async () => {
    setSaving(true)
    try {
      const res = await api.get(`/transport/employee-infos/?employee_id=${editForm.employee_id}`)
      const items = res.data.results || res.data
      const payload = { ...editForm, route: editForm.route || null, shift_type: editForm.shift_type || null, assembly_point: editForm.assembly_point || null, city: editForm.city || null }
      if (items.length > 0) {
        await api.put(`/transport/employee-infos/${items[0].id}/`, payload)
      } else {
        await api.post("/transport/employee-infos/", payload)
      }
      // تسجيل المخالفة كمحلول
      if (currentViolation) {
        const vType = currentViolation.type === 'from_other_line' ? 'صعد من خط آخر' : 'مخالف'
        await createOrResolveViolation(editForm.employee_id, editForm.employee_name, vType, true, currentViolation.detail)
      }
      setEditDialog(false)
      setCurrentViolation(null)
      setRefreshing((p) => p + 1)
    } catch (e: any) {
      alert(e?.response?.data?.detail || "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const handleAddSave = async () => {
    setSaving(true)
    try {
      const payload = { ...editForm, route: editForm.route || null, shift_type: editForm.shift_type || null, assembly_point: editForm.assembly_point || null, city: editForm.city || null }
      await api.post("/transport/employee-infos/", payload)
      // تسجيل المخالفة كمحلول
      if (currentViolation) {
        await createOrResolveViolation(editForm.employee_id, editForm.employee_name, 'مضاف يدوي', true, currentViolation.detail)
      }
      setAddDialog(false)
      setCurrentViolation(null)
      setRefreshing((p) => p + 1)
    } catch (e: any) {
      alert(e?.response?.data?.detail || "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg text-zinc-100">المخالفات المرصودة</CardTitle>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-zinc-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100" />
            <Button variant="outline" size="sm" onClick={() => setRefreshing((p) => p + 1)} className="border-zinc-700 text-zinc-400">تحديث</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
        : violations.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد مخالفات في هذا التاريخ</p>
        : <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ direction: "rtl" }}>
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-right py-2 px-2 text-zinc-500">الكود</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الاسم</th>
                  <th className="text-right py-2 px-2 text-zinc-500">القسم</th>
                  <th className="text-right py-2 px-2 text-zinc-500">نقطة التجمع</th>
                  <th className="text-right py-2 px-2 text-zinc-500">نوع المخالفة</th>
                  <th className="text-right py-2 px-2 text-zinc-500">التفاصيل</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الحالة</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v, i) => (
                  <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                    <td className="py-2 px-2 text-zinc-300">{v.employee_id}</td>
                    <td className="py-2 px-2 text-zinc-100">{v.employee_name}</td>
                    <td className="py-2 px-2 text-zinc-400">{v.department}</td>
                    <td className="py-2 px-2 text-zinc-400">{v.assembly_point}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                        v.type === 'from_other_line' ? 'bg-amber-500/10 text-amber-400'
                        : v.type === 'violator' ? 'bg-red-500/10 text-red-400'
                        : 'bg-blue-500/10 text-blue-400'
                      }`}>{v.label}</span>
                    </td>
                    <td className="py-2 px-2 text-zinc-400">{v.detail}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                        getViolationStatus(v.employee_id, v.label) === 'محلول' ? 'bg-emerald-500/10 text-emerald-400'
                        : getViolationStatus(v.employee_id, v.label) === 'معلق' ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-zinc-500/10 text-zinc-400'
                      }`}>{getViolationStatus(v.employee_id, v.label)}</span>
                    </td>
                    <td className="py-2 px-2">
                      {v.type === 'from_other_line' && (
                        <Button variant="outline" size="sm" onClick={() => openEditRoute(v)} className="border-amber-700 text-amber-400 hover:bg-amber-950 text-[10px] h-7 px-2">
                          تعديل
                        </Button>
                      )}
                      {v.type === 'violator' && (
                        <div className="flex gap-1 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => openEditRoute(v)} className="border-red-700 text-red-400 hover:bg-red-950 text-[10px] h-7 px-2">
                            تغيير نوع الدوام
                          </Button>
                        </div>
                      )}
                      {v.type === 'manual_add' && (
                        <Button variant="outline" size="sm" onClick={() => openAddEmployee(v)} className="border-blue-700 text-blue-400 hover:bg-blue-950 text-[10px] h-7 px-2">
                          إضافة موظف
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="bg-zinc-950 border-zinc-800 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">تعديل بيانات الموظف {editEmpId}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm py-4">
              <div>
                <Label className="text-zinc-400">خط السير</Label>
                <select value={editForm.route || ""} onChange={(e) => setEditForm((p) => ({ ...p, route: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">نوع الدوام</Label>
                <select value={editForm.shift_type || ""} onChange={(e) => setEditForm((p) => ({ ...p, shift_type: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {shiftTypes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">نقطة التجمع</Label>
                <select value={editForm.assembly_point || ""} onChange={(e) => setEditForm((p) => ({ ...p, assembly_point: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {assemblyPoints.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">المدينة</Label>
                <input type="text" value={editForm.city || ""} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">وقت الوصول</Label>
                <input type="time" value={editForm.arrival_time || ""} onChange={(e) => setEditForm((p) => ({ ...p, arrival_time: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">وقت الانصراف</Label>
                <input type="time" value={editForm.departure_time || ""} onChange={(e) => setEditForm((p) => ({ ...p, departure_time: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">مكان السكن</Label>
                <input type="text" value={editForm.residence_location || ""} onChange={(e) => setEditForm((p) => ({ ...p, residence_location: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">نوع النقل</Label>
                <input type="text" value={editForm.transport_type || ""} onChange={(e) => setEditForm((p) => ({ ...p, transport_type: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">تاريخ بداية الدوام</Label>
                <input type="date" value={editForm.shift_start_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, shift_start_date: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialog(false)} className="border-zinc-700 text-zinc-400">إلغاء</Button>
              <Button onClick={handleEditSave} disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Employee Dialog */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent className="bg-zinc-950 border-zinc-800 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">إضافة موظف جديد للنقل</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm py-4">
              <div>
                <Label className="text-zinc-400">الكود</Label>
                <input type="text" value={editForm.employee_id || ""} disabled className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-500 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">الاسم</Label>
                <input type="text" value={editForm.employee_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, employee_name: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">خط السير</Label>
                <select value={editForm.route || ""} onChange={(e) => setEditForm((p) => ({ ...p, route: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">نوع الدوام</Label>
                <select value={editForm.shift_type || ""} onChange={(e) => setEditForm((p) => ({ ...p, shift_type: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {shiftTypes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">نقطة التجمع</Label>
                <select value={editForm.assembly_point || ""} onChange={(e) => setEditForm((p) => ({ ...p, assembly_point: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {assemblyPoints.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">المدينة</Label>
                <input type="text" value={editForm.city || ""} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">وقت الوصول</Label>
                <input type="time" value={editForm.arrival_time || ""} onChange={(e) => setEditForm((p) => ({ ...p, arrival_time: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">وقت الانصراف</Label>
                <input type="time" value={editForm.departure_time || ""} onChange={(e) => setEditForm((p) => ({ ...p, departure_time: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">مكان السكن</Label>
                <input type="text" value={editForm.residence_location || ""} onChange={(e) => setEditForm((p) => ({ ...p, residence_location: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">نوع النقل</Label>
                <input type="text" value={editForm.transport_type || ""} onChange={(e) => setEditForm((p) => ({ ...p, transport_type: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-zinc-400">تاريخ بداية الدوام</Label>
                <input type="date" value={editForm.shift_start_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, shift_start_date: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialog(false)} className="border-zinc-700 text-zinc-400">إلغاء</Button>
              <Button onClick={handleAddSave} disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">{saving ? "جاري الحفظ..." : "إضافة"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function TripEvaluation() {
  const [trips, setTrips] = useState<any[]>([])
  const [violations, setViolations] = useState<Record<string, number>>({})
  const [vehicles, setVehicles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [empMap, setEmpMap] = useState<Map<string, { plannedTripIds: Set<number>, boardedTripIds: Set<number> }>>(new Map())
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"))

  useEffect(() => {
    api.get("/transport/vehicles/").then((r) => {
      const map: Record<string, any> = {}
      ;(r.data.results || r.data).forEach((v: any) => { map[v.id] = v })
      setVehicles(map)
    }).catch(() => {})
  }, [])

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get(`/transport/trips/?date=${date}`),
      api.get(`/transport/violations/?date=${date}`),
    ]).then(([tripsRes, violRes]) => {
      const tripsData = tripsRes.data.results || tripsRes.data
      setTrips(tripsData)
      const vMap: Record<string, number> = {}
      ;(violRes.data.results || violRes.data).forEach((v: any) => {
        const tid = v.trip || "-"
        vMap[tid] = (vMap[tid] || 0) + 1
      })
      setViolations(vMap)
      // Build empMap matching TripSummaryReport
      const empMap = new Map<string, { plannedTripIds: Set<number>, boardedTripIds: Set<number> }>()
      for (const t of tripsData) {
        for (const r of (t.riders || [])) {
          if (!empMap.has(r.employee_id)) empMap.set(r.employee_id, { plannedTripIds: new Set(), boardedTripIds: new Set() })
          const entry = empMap.get(r.employee_id)!
          if (r.was_assigned) entry.plannedTripIds.add(t.id)
          if (r.action === 'board') entry.boardedTripIds.add(t.id)
        }
      }
      setEmpMap(empMap)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchData() }, [date])

  const evalRows = trips.filter((t) => t.status === "completed").map((t) => {
    const v = vehicles[t.vehicle]
    const capacity = v?.capacity || 0
    const violCount = violations[t.id] || 0
    const plannedRiders = (t.riders || []).filter((r: any) => r.action === 'assigned')
    const boardRiders = (t.riders || []).filter((r: any) => r.action === 'board')
    const planned = t.planned_count || 0
    const boarded = t.rider_count || 0
    const pct = capacity ? Math.round((boarded / capacity) * 100) : 0
    const absentCount = plannedRiders.length
    const matched = boardRiders.filter((b: any) => b.was_assigned).length
    const fromOtherLine = boardRiders.filter((b: any) => !b.was_assigned).filter((b: any) => { const e = empMap.get(b.employee_id); return e && e.plannedTripIds.size > 0 }).length
    const manualAdd = boardRiders.filter((b: any) => /^(TEMP-|MANUAL-)/.test(String(b.employee_id))).length
    const violators = boardRiders.filter((b: any) => !b.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(b.employee_id))).filter((b: any) => { const e = empMap.get(b.employee_id); return !e || e.plannedTripIds.size === 0 }).length

    let expectedEnd = null
    if (t.return_time) {
      const [rh, rm] = t.return_time.split(":").map(Number)
      expectedEnd = rh * 60 + rm
    }
    let delayMin = 0
    if (t.completed_at && expectedEnd !== null) {
      const comp = new Date(t.completed_at)
      const actualEnd = comp.getHours() * 60 + comp.getMinutes()
      delayMin = Math.max(0, actualEnd - expectedEnd)
    }

    // score: 0-100
    let score = 100
    if (violators > 0) score -= violators * 10
    if (delayMin > 5) score -= Math.min(30, Math.floor((delayMin - 5) / 5) * 5)
    if (absentCount > 0 && planned > 0) score -= Math.min(20, Math.round((absentCount / planned) * 40))
    if (fromOtherLine > 0) score -= Math.min(10, fromOtherLine * 5)
    if (boarded > capacity && capacity > 0) score -= 15
    score = Math.max(0, score)

    const grade = score >= 90 ? 'ممتاز' : score >= 75 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف'
    const gradeColor = score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-blue-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'

    return { id: t.id, vehicle_plate: t.vehicle_plate || "-", driver_name: t.driver_name || "-", route_names: t.route_names, capacity, planned, boarded, absentCount, matched, fromOtherLine, manualAdd, violators, violCount, durationMin: 0, delayMin, expectedMin: 0, pct, score, grade, gradeColor, status: t.status }
  })

  const avgScore = evalRows.length ? Math.round(evalRows.reduce((s, r) => s + r.score, 0) / evalRows.length) : 0
  const totalGrade = avgScore >= 90 ? 'ممتاز' : avgScore >= 75 ? 'جيد' : avgScore >= 50 ? 'متوسط' : 'ضعيف'
  const totalGradeColor = avgScore >= 90 ? 'text-emerald-400' : avgScore >= 75 ? 'text-blue-400' : avgScore >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg text-zinc-100">تقييم الرحلات</CardTitle>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
        : evalRows.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد رحلات في هذا التاريخ</p>
        : <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ direction: "rtl" }}>
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-right py-2 px-2 text-zinc-500">المركبة</th>
                    <th className="text-right py-2 px-2 text-zinc-500">السائق</th>
                    <th className="text-right py-2 px-2 text-zinc-500">الخط</th>
                    <th className="text-right py-2 px-2 text-zinc-500">السعة</th>
                    <th className="text-right py-2 px-2 text-zinc-500">المخطط</th>
                    <th className="text-right py-2 px-2 text-zinc-500">الصاعد</th>
                    <th className="text-right py-2 px-2 text-zinc-400">مطابق</th>
                    <th className="text-right py-2 px-2 text-amber-400">من خط آخر</th>
                    <th className="text-right py-2 px-2 text-blue-400">مضاف يدوي</th>
                    <th className="text-right py-2 px-2 text-red-400">مخالف</th>
                    <th className="text-right py-2 px-2 text-red-400">غائب</th>
                    <th className="text-right py-2 px-2 text-zinc-500">المدة</th>
                    <th className="text-right py-2 px-2 text-zinc-500">تأخير</th>
                    <th className="text-right py-2 px-2 text-zinc-500">الإشغال</th>
                    <th className="text-right py-2 px-2 text-zinc-500">التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {evalRows.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                      <td className="py-2 px-2 text-zinc-100">{r.vehicle_plate}</td>
                      <td className="py-2 px-2 text-zinc-300">{r.driver_name}</td>
                      <td className="py-2 px-2 text-zinc-200">{Array.isArray(r.route_names) ? r.route_names.join(" + ") : (r.route_names || "-")}</td>
                      <td className="py-2 px-2 text-purple-400">{r.capacity}</td>
                      <td className="py-2 px-2 text-amber-400">{r.planned}</td>
                      <td className="py-2 px-2 text-emerald-400">{r.boarded}</td>
                      <td className="py-2 px-2 text-zinc-300">{r.matched}</td>
                      <td className="py-2 px-2 text-amber-400">{r.fromOtherLine}</td>
                      <td className="py-2 px-2 text-blue-400">{r.manualAdd}</td>
                      <td className="py-2 px-2 text-red-400">{r.violators}</td>
                      <td className="py-2 px-2 text-red-400">{r.absentCount}</td>
                    <td className="py-2 px-2 text-zinc-300">{r.durationMin > 0 ? `${r.durationMin} د` : "-"}</td>
                    <td className={`py-2 px-2 ${r.delayMin > 5 ? 'text-red-400 font-medium' : 'text-amber-400'}`}>{r.delayMin > 0 ? `${r.delayMin} د` : "-"}</td>
                      <td className="py-2 px-2 text-purple-400">{r.pct}%</td>
                      <td className={`py-2 px-2 font-bold ${r.gradeColor}`}>{r.score} - {r.grade}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-amber-800/50 bg-amber-950/10 font-medium">
                    <td className="py-3 px-2 text-amber-400" colSpan={14}>متوسط التقييم العام</td>
                    <td className={`py-3 px-2 font-bold ${totalGradeColor}`}>{avgScore} - {totalGrade}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-zinc-100 text-lg font-bold">{evalRows.length}</div>
                <div className="text-zinc-500 text-xs">عدد الرحلات</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className={`text-lg font-bold ${totalGradeColor}`}>{avgScore}</div>
                <div className="text-zinc-500 text-xs">متوسط التقييم</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-400">{evalRows.filter((r) => r.score >= 75).length}</div>
                <div className="text-zinc-500 text-xs">رحلات جيدة +</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-400">{evalRows.filter((r) => r.score < 50).length}</div>
                <div className="text-zinc-500 text-xs">رحلات ضعيفة</div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="border border-amber-800/50 bg-amber-950/10 rounded-lg p-4">
              <h4 className="text-xs text-zinc-400 font-medium mb-2">💡 التوصيات والتحسينات</h4>
              <ul className="text-xs text-zinc-300 space-y-1 pr-4">
                {evalRows.filter((r) => r.delayMin > 5).length > 0 && <li className="list-disc">• يوجد {evalRows.filter((r) => r.delayMin > 5).length} رحلة متأخرة (أكثر من 5 دقائق عن زمن العودة)، يوصى بمتابعة السائقين.</li>}
                {evalRows.filter((r) => r.violators > 0).length > 0 && <li className="list-disc">• يوجد {evalRows.filter((r) => r.violators > 0).length} رحلة بها مخالفات، يوصى بمراجعة أسباب المخالفات.</li>}
                {evalRows.filter((r) => r.absentCount > 0).length > 0 && <li className="list-disc">• يوجد غياب في {evalRows.filter((r) => r.absentCount > 0).length} رحلة، يوصى بمتابعة الموظفين الغائبين.</li>}
                {evalRows.reduce((s, r) => s + r.fromOtherLine + r.manualAdd + r.violators, 0) > 0 && <li className="list-disc">• يوجد {evalRows.reduce((s, r) => s + r.fromOtherLine + r.manualAdd + r.violators, 0)} موظف إضافي، يوصى بتحديث خطة التوزيع.</li>}
                {evalRows.filter((r) => r.score < 50).length > 0 && <li className="list-disc">• يوجد {evalRows.filter((r) => r.score < 50).length} رحلة تقييمها ضعيف، يوصى بمراجعة شاملة.</li>}
              </ul>
            </div>
          </div>
        }
      </CardContent>
    </Card>
  )
}

function TransportRequestsTab() {
  const [requests, setRequests] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [completeDialog, setCompleteDialog] = useState(false)
  const [completeForm, setCompleteForm] = useState<Record<string, any>>({})
  const [managerDialog, setManagerDialog] = useState(false)
  const [managerForm, setManagerForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(0)
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    api.get("/transport/drivers/").then((r) => setDrivers(r.data.results || r.data)).catch(() => {})
    api.get("/transport/vehicles/").then((r) => setVehicles(r.data.results || r.data)).catch(() => {})
  }, [])

  const fetchRequests = () => {
    setLoading(true)
    const params = new URLSearchParams({ request_date: date })
    if (filterStatus) params.set("status", filterStatus)
    api.get(`/transport/requests/?${params.toString()}`).then((res) => {
      setRequests(res.data.results || res.data)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchRequests() }, [date, filterStatus, refreshing])

  const resetForm = () => {
    setForm({ employee_id: "", employee_name: "", requester_section: "", purpose: "", transport_type: "باص", destination: "", requested_time: "", notes: "" })
  }

  const openAdd = () => {
    setEditItem(null)
    resetForm()
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, request_date: date }
      if (editItem) {
        await api.put(`/transport/requests/${editItem.id}/`, payload)
      } else {
        await api.post("/transport/requests/", payload)
      }
      setDialogOpen(false)
      setRefreshing((p) => p + 1)
    } catch (err: any) {
      alert(err?.response?.data?.detail || "فشل الحفظ")
    } finally { setSaving(false) }
  }

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

  const doAction = async (id: string, action: string, data?: any) => {
    try {
      await api.post(`/transport/requests/${id}/${action}/`, data || {})
      setRefreshing((p) => p + 1)
    } catch (err: any) { alert("فشل العملية") }
  }

  const openComplete = (req: any) => {
    setEditItem(req)
    const now = new Date().toISOString().slice(0, 16)
    setCompleteForm({ return_time: now, fuel_consumed: "", distance_traveled: "", notes: "" })
    setCompleteDialog(true)
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      await api.post(`/transport/requests/${editItem.id}/complete/`, completeForm)
      setCompleteDialog(false)
      setRefreshing((p) => p + 1)
    } catch (err: any) { alert("فشل إكمال الطلب") }
    finally { setSaving(false) }
  }

  const openAssignDriver = (req: any) => {
    setEditItem(req)
    const now = new Date().toISOString().slice(0, 16)
    setManagerForm({ assigned_driver: "", assigned_vehicle: "", departure_time: now })
    setManagerDialog(true)
  }

  const handleAssignDriver = async () => {
    setSaving(true)
    try {
      await api.post(`/transport/requests/${editItem.id}/assign_to_progress/`, managerForm)
      setManagerDialog(false)
      setRefreshing((p) => p + 1)
    } catch (err: any) { alert("فشل تعيين السائق") }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg text-zinc-100">طلبات المواصلات</CardTitle>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100">
              <option value="">كل الطلبات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="manager_pending">بانتظار المدير</option>
              <option value="in_progress">تحت التنفيذ</option>
              <option value="completed">مكتملة</option>
              <option value="rejected">مرفوضة</option>
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100" />
            <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white text-sm h-8"><Plus className="h-4 w-4 ml-1" />طلب جديد</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
        : requests.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد طلبات</p>
        : <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ direction: "rtl" }}>
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-right py-2 px-2 text-zinc-500">الموظف</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الغرض</th>
                  <th className="text-right py-2 px-2 text-zinc-500">النوع</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الجهة</th>
                  <th className="text-right py-2 px-2 text-zinc-500">القسم</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الزمن</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الحالة</th>
                  <th className="text-right py-2 px-2 text-zinc-500">السائق</th>
                  <th className="text-right py-2 px-2 text-zinc-500">المركبة</th>
                  <th className="text-right py-2 px-2 text-zinc-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                    <td className="py-2 px-2 text-zinc-100">{r.employee_name || r.employee_id}</td>
                    <td className="py-2 px-2 text-zinc-200">{r.purpose}</td>
                    <td className="py-2 px-2 text-zinc-300">{r.transport_type}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.destination || "-"}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.requester_section || "-"}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.requested_time?.slice(0,5) || "-"}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${statusColors[r.status] || "bg-zinc-500/10 text-zinc-400"}`}>{statusLabels[r.status] || r.status}</span>
                    </td>
                    <td className="py-2 px-2 text-zinc-400">{r.assigned_driver_name || "-"}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.assigned_vehicle_plate || "-"}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1 flex-wrap">
                        {r.status === 'pending' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openAssignDriver(r)} className="border-emerald-700 text-emerald-400 hover:bg-emerald-950 text-[10px] h-7 px-2">اعتماد</Button>
                            <Button variant="outline" size="sm" onClick={() => doAction(r.id, "escalate_to_manager")} className="border-blue-700 text-blue-400 hover:bg-blue-950 text-[10px] h-7 px-2">تصعيد</Button>
                            <Button variant="outline" size="sm" onClick={() => doAction(r.id, "reject")} className="border-red-700 text-red-400 hover:bg-red-950 text-[10px] h-7 px-2">رفض</Button>
                          </>
                        )}
                        {r.status === 'manager_pending' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => doAction(r.id, "approve_manager")} className="border-emerald-700 text-emerald-400 hover:bg-emerald-950 text-[10px] h-7 px-2">اعتماد</Button>
                            <Button variant="outline" size="sm" onClick={() => doAction(r.id, "reject")} className="border-red-700 text-red-400 hover:bg-red-950 text-[10px] h-7 px-2">رفض</Button>
                          </>
                        )}
                        {r.status === 'in_progress' && !r.assigned_driver && (
                          <Button variant="outline" size="sm" onClick={() => openAssignDriver(r)} className="border-purple-700 text-purple-400 hover:bg-purple-950 text-[10px] h-7 px-2">تعيين سائق</Button>
                        )}
                        {r.status === 'in_progress' && r.assigned_driver && (
                          <Button variant="outline" size="sm" onClick={() => openComplete(r)} className="border-emerald-700 text-emerald-400 hover:bg-emerald-950 text-[10px] h-7 px-2">إكمال</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800">
            <DialogHeader><DialogTitle className="text-zinc-100">{editItem ? "تعديل" : "طلب مواصلات جديد"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-sm py-4">
              <div className="col-span-2">
                <Label className="text-zinc-400">اسم الموظف</Label>
                <input required value={form.employee_name || ""} onChange={(e) => setForm((p) => ({ ...p, employee_name: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-zinc-400">جهة الطالب / القسم</Label>
                <input value={form.requester_section || ""} onChange={(e) => setForm((p) => ({ ...p, requester_section: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">الغرض</Label>
                <input required value={form.purpose || ""} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">نوع المواصلات</Label>
                <select value={form.transport_type || "باص"} onChange={(e) => setForm((p) => ({ ...p, transport_type: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="باص">باص</option>
                  <option value="سيارة">سيارة</option>
                  <option value="دراجة">دراجة</option>
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">الجهة</Label>
                <input value={form.destination || ""} onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">الزمن</Label>
                <input type="time" value={form.requested_time || ""} onChange={(e) => setForm((p) => ({ ...p, requested_time: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-zinc-400">ملاحظات</Label>
                <textarea value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" rows={2} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700 text-zinc-400">إلغاء</Button>
                <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">{saving ? "..." : "حفظ"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign Driver Dialog (supervisor assigns driver/vehicle/departure time) */}
        <Dialog open={managerDialog} onOpenChange={setManagerDialog}>
          <DialogContent className="bg-zinc-950 border-zinc-800">
            <DialogHeader><DialogTitle className="text-zinc-100">تعيين السائق والمركبة</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm py-4">
              <div>
                <Label className="text-zinc-400">السائق</Label>
                <select value={managerForm.assigned_driver || ""} onChange={(e) => setManagerForm((p) => ({ ...p, assigned_driver: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400">المركبة</Label>
                <select value={managerForm.assigned_vehicle || ""} onChange={(e) => setManagerForm((p) => ({ ...p, assigned_vehicle: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1">
                  <option value="">-- اختر --</option>
                  {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label className="text-zinc-400">زمن التحرك</Label>
                <input type="datetime-local" value={managerForm.departure_time || ""} onChange={(e) => setManagerForm((p) => ({ ...p, departure_time: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManagerDialog(false)} className="border-zinc-700 text-zinc-400">إلغاء</Button>
                <Button onClick={handleAssignDriver} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white">{saving ? "..." : "تعيين وبدء التنفيذ"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Complete Dialog (return time, fuel, notes) */}
        <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
          <DialogContent className="bg-zinc-950 border-zinc-800">
            <DialogHeader><DialogTitle className="text-zinc-100">إغلاق الطلب - تسجيل العودة</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm py-4">
              <div>
                <Label className="text-zinc-400">زمن العودة</Label>
                <input type="datetime-local" value={completeForm.return_time || ""} onChange={(e) => setCompleteForm((p) => ({ ...p, return_time: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">الوقود المستهلك (لتر)</Label>
                <input type="number" value={completeForm.fuel_consumed || ""} onChange={(e) => setCompleteForm((p) => ({ ...p, fuel_consumed: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">المسافة المقطوعة (كم)</Label>
                <input type="number" value={completeForm.distance_traveled || ""} onChange={(e) => setCompleteForm((p) => ({ ...p, distance_traveled: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-zinc-400">ملاحظات</Label>
                <textarea value={completeForm.notes || ""} onChange={(e) => setCompleteForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 mt-1" rows={2} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCompleteDialog(false)} className="border-zinc-700 text-zinc-400">إلغاء</Button>
                <Button onClick={handleComplete} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white">{saving ? "..." : "إغلاق"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function RequestsReportTab() {
  const [allRequests, setAllRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState("request_date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [filterText, setFilterText] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [summaryGroupBy, setSummaryGroupBy] = useState("assigned_vehicle_plate")

  useEffect(() => {
    setLoading(true)
    api.get("/transport/requests/").then((res) => {
      setAllRequests(res.data.results || res.data)
    }).finally(() => setLoading(false))
  }, [refresh])

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const sorted = [...allRequests]
    .filter((r) => {
      if (filterText) {
        const q = filterText.toLowerCase()
        const match = (v: any) => String(v || "").toLowerCase().includes(q)
        if (!match(r.employee_name) && !match(r.requester_section) && !match(r.purpose) && !match(r.destination) && !match(r.assigned_driver_name) && !match(r.assigned_vehicle_plate) && !match(r.transport_type)) return false
      }
      if (dateFrom && r.request_date < dateFrom) return false
      if (dateTo && r.request_date > dateTo) return false
      return true
    })
    .sort((a, b) => {
      const getVal = (obj: any, key: string) => {
        if (key === "duration") {
          if (!a.departure_time || !a.return_time) return 0
          return new Date(a.return_time).getTime() - new Date(a.departure_time).getTime()
        }
        return obj[key] ?? ""
      }
      const va = getVal(a, sortKey)
      const vb = getVal(b, sortKey)
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })

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

  const SortHeader = ({ k, label }: { k: string; label: string }) => (
    <th className="text-right py-2 px-2 text-zinc-500 cursor-pointer select-none hover:text-zinc-300" onClick={() => toggleSort(k)}>
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  )

  const calcDuration = (r: any) => {
    if (!r.departure_time || !r.return_time) return "-"
    const diff = new Date(r.return_time).getTime() - new Date(r.departure_time).getTime()
    if (diff < 0) return "-"
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return `${hours} ساعة ${mins} دقيقة`
  }

  const exportColumns = ["request_date", "employee_name", "requester_section", "purpose", "transport_type", "destination", "assigned_driver_name", "assigned_vehicle_plate", "departure_time", "duration", "return_time", "fuel_consumed", "distance_traveled", "status"]
  const exportLabels: Record<string, string> = {
    request_date: "التاريخ", employee_name: "الموظف", requester_section: "القسم", purpose: "الغرض",
    transport_type: "النوع", destination: "الجهة", assigned_driver_name: "السائق", assigned_vehicle_plate: "المركبة",
    departure_time: "التحرك", duration: "المدة", return_time: "العودة", fuel_consumed: "الوقود",
    distance_traveled: "المسافة", status: "الحالة",
  }

  const exportRequestsCSV = () => {
    const rows = sorted.map((r) => ({
      ...r,
      duration: calcDuration(r),
      departure_time: r.departure_time ? r.departure_time.slice(11, 16) : "-",
      return_time: r.return_time ? r.return_time.slice(11, 16) : "-",
      fuel_consumed: r.fuel_consumed ? `${r.fuel_consumed} لتر` : "-",
      distance_traveled: r.distance_traveled ? `${r.distance_traveled} كم` : "-",
      status: statusLabels[r.status] || r.status,
    }))
    exportCSV(rows, exportColumns, exportLabels, `تقرير_الطلبات_${new Date().toLocaleDateString("en-CA")}`)
  }

  const exportRequestsPDF = () => {
    const completed = sorted.filter((r) => r.status === "completed")
    const totalFuel = completed.reduce((s, r) => s + (parseFloat(r.fuel_consumed) || 0), 0)
    const totalDist = completed.reduce((s, r) => s + (parseFloat(r.distance_traveled) || 0), 0)
    const rowsHtml = sorted.map((r) => `<tr>
      <td>${r.request_date}</td>
      <td>${r.employee_name || "-"}</td>
      <td>${r.requester_section || "-"}</td>
      <td>${r.purpose}</td>
      <td>${r.transport_type}</td>
      <td>${r.destination || "-"}</td>
      <td>${r.assigned_driver_name || "-"}</td>
      <td>${r.assigned_vehicle_plate || "-"}</td>
      <td>${r.departure_time ? r.departure_time.slice(11, 16) : "-"}</td>
      <td>${calcDuration(r)}</td>
      <td>${r.return_time ? r.return_time.slice(11, 16) : "-"}</td>
      <td>${r.fuel_consumed || "-"}</td>
      <td>${r.distance_traveled || "-"}</td>
      <td>${statusLabels[r.status] || r.status}</td>
    </tr>`).join("")

    // Per-vehicle table
    const byVehicle: Record<string, { count: number; fuel: number; dist: number }> = {}
    ;[...completed, ...sorted.filter((r) => r.status === "in_progress")].forEach((r) => {
      const key = r.assigned_vehicle_plate || "بدون مركبة"
      if (!byVehicle[key]) byVehicle[key] = { count: 0, fuel: 0, dist: 0 }
      byVehicle[key].count++
      byVehicle[key].fuel += parseFloat(r.fuel_consumed) || 0
      byVehicle[key].dist += parseFloat(r.distance_traveled) || 0
    })
    const vehicleRows = Object.entries(byVehicle).sort(([, a], [, b]) => b.count - a.count)
      .map(([plate, d]) => `<tr><td>${plate}</td><td>${d.count}</td><td>${d.fuel.toFixed(2)}</td><td>${d.dist.toFixed(2)}</td><td>${d.fuel > 0 ? (d.dist / d.fuel).toFixed(2) : "-"}</td></tr>`).join("")

    const styles = `
      <style>
        body { font-family: 'Segoe UI', sans-serif; direction: rtl; padding: 20px; color: #222; }
        h1 { text-align: center; color: #d97706; font-size: 22px; margin-bottom: 5px; }
        h2 { color: #333; font-size: 16px; margin-top: 20px; border-bottom: 2px solid #d97706; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: center; }
        th { background: #d97706; color: #fff; font-weight: 600; }
        tr:nth-child(even) { background: #f9f9f9; }
        .summary { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
        .summary-item { border: 1px solid #ddd; border-radius: 6px; padding: 8px 14px; text-align: center; min-width: 80px; }
        .summary-item .num { font-size: 18px; font-weight: bold; color: #d97706; }
        .summary-item .lbl { font-size: 10px; color: #666; }
        .totals { background: #f0f0f0; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin: 8px 0; }
        .totals span { margin-left: 16px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
      </style>`

    const html = `<!DOCTYPE html><html dir="rtl"><head>${styles}</head><body>
      <h1>تقرير الطلبات</h1>
      <p style="text-align:center;color:#666;font-size:12px">${new Date().toLocaleDateString("ar-SA")}</p>
      <h2>جدول الطلبات</h2>
      <table><thead><tr>
        <th>التاريخ</th><th>الموظف</th><th>القسم</th><th>الغرض</th><th>النوع</th><th>الجهة</th>
        <th>السائق</th><th>المركبة</th><th>التحرك</th><th>المدة</th><th>العودة</th>
        <th>الوقود</th><th>المسافة</th><th>الحالة</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      <p style="text-align:left;font-size:11px;color:#666">إجمالي الطلبات: ${sorted.length}</p>
      <h2>ملخص الحالات</h2>
      <div class="summary">
        ${[
          ["المجموع", sorted.length], ["مكتملة", completed.length],
          ["تحت التنفيذ", sorted.filter(r => r.status === "in_progress").length],
          ["بانتظار المدير", sorted.filter(r => r.status === "manager_pending").length],
          ["قيد الانتظار", sorted.filter(r => r.status === "pending").length],
          ["مرفوضة", sorted.filter(r => r.status === "rejected").length],
        ].map(([l, c]) => `<div class="summary-item"><div class="num">${c}</div><div class="lbl">${l}</div></div>`).join("")}
      </div>
      <div class="totals">
        <span><b>إجمالي الوقود:</b> ${totalFuel.toFixed(2)} لتر</span>
        <span><b>إجمالي المسافة:</b> ${totalDist.toFixed(2)} كم</span>
        <span><b>متوسط الوقود:</b> ${completed.length ? (totalFuel / completed.length).toFixed(2) : "0"} لتر</span>
        <span><b>متوسط المسافة:</b> ${completed.length ? (totalDist / completed.length).toFixed(2) : "0"} كم</span>
        ${totalFuel > 0 ? `<span><b>معدل الاستهلاك:</b> ${(totalDist / totalFuel).toFixed(2)} كم/لتر</span>` : ""}
      </div>
      ${Object.keys(byVehicle).length > 0 ? `
        <h2>ملخص حسب المركبة</h2>
        <table><thead><tr><th>المركبة</th><th>عدد الطلبات</th><th>الوقود (لتر)</th><th>المسافة (كم)</th><th>معدل (كم/لتر)</th></tr></thead><tbody>${vehicleRows}</tbody></table>
      ` : ""}
      <div class="footer">تم الإنشاء في ${new Date().toLocaleString("ar-SA")}</div>
    </body></html>`

    const win = window.open("", "_blank")
    if (win) { win.document.write(html); win.document.close(); win.focus(); win.print() }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-zinc-100">تقرير الطلبات</CardTitle>
        <div className="flex flex-wrap gap-3 items-center mt-2">
          <Input placeholder="بحث..." value={filterText} onChange={(e) => setFilterText(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-xs h-8 text-sm" />
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <span>من</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 text-xs" />
            <span>إلى</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 text-xs" />
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setRefresh((p) => p + 1)}
              className="border-zinc-700 text-zinc-400 text-xs h-8">تحديث</Button>
            <Button variant="outline" size="sm" onClick={() => exportRequestsCSV()}
              className="border-zinc-700 text-zinc-400 text-xs h-8"><FileSpreadsheet className="h-3.5 w-3.5 ml-1" />إكسل</Button>
            <Button variant="outline" size="sm" onClick={() => exportRequestsPDF()}
              className="border-zinc-700 text-zinc-400 text-xs h-8"><FileText className="h-3.5 w-3.5 ml-1" />PDF</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
        : sorted.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد طلبات</p>
        : <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ direction: "rtl" }}>
              <thead>
                <tr className="border-b border-zinc-700">
                  <SortHeader k="request_date" label="التاريخ" />
                  <SortHeader k="employee_name" label="الموظف" />
                  <SortHeader k="requester_section" label="القسم" />
                  <SortHeader k="purpose" label="الغرض" />
                  <SortHeader k="transport_type" label="النوع" />
                  <SortHeader k="destination" label="الجهة" />
                  <SortHeader k="assigned_driver_name" label="السائق" />
                  <SortHeader k="assigned_vehicle_plate" label="المركبة" />
                  <SortHeader k="departure_time" label="التحرك" />
                  <th className="text-right py-2 px-2 text-zinc-500">المدة</th>
                  <SortHeader k="return_time" label="العودة" />
                  <SortHeader k="fuel_consumed" label="الوقود" />
                  <SortHeader k="distance_traveled" label="المسافة" />
                  <th className="text-right py-2 px-2 text-zinc-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                    <td className="py-2 px-2 text-zinc-300">{r.request_date}</td>
                    <td className="py-2 px-2 text-zinc-100">{r.employee_name || "-"}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.requester_section || "-"}</td>
                    <td className="py-2 px-2 text-zinc-200 max-w-[120px] truncate" title={r.purpose}>{r.purpose}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.transport_type}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.destination || "-"}</td>
                    <td className="py-2 px-2 text-zinc-300">{r.assigned_driver_name || "-"}</td>
                    <td className="py-2 px-2 text-zinc-300">{r.assigned_vehicle_plate || "-"}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.departure_time ? r.departure_time.slice(11, 16) : "-"}</td>
                    <td className="py-2 px-2 text-zinc-400">{calcDuration(r)}</td>
                    <td className="py-2 px-2 text-zinc-400">{r.return_time ? r.return_time.slice(11, 16) : "-"}</td>
                    <td className="py-2 px-2 text-zinc-300">{r.fuel_consumed ? `${r.fuel_consumed} لتر` : "-"}</td>
                    <td className="py-2 px-2 text-zinc-300">{r.distance_traveled ? `${r.distance_traveled} كم` : "-"}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${statusColors[r.status] || "bg-zinc-500/10 text-zinc-400"}`}>
                        {statusLabels[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-zinc-600 mt-3">إجمالي الطلبات: {sorted.length}</p>
          </div>
        }

        {/* Statistics Summary */}
        {(() => {
          const completed = sorted.filter((r) => r.status === "completed")
          const inProgress = sorted.filter((r) => r.status === "in_progress")
          const pending = sorted.filter((r) => r.status === "pending")
          const managerPending = sorted.filter((r) => r.status === "manager_pending")
          const rejected = sorted.filter((r) => r.status === "rejected")
          const totalFuel = completed.reduce((s, r) => s + (parseFloat(r.fuel_consumed) || 0), 0)
          const totalDist = completed.reduce((s, r) => s + (parseFloat(r.distance_traveled) || 0), 0)

          // Per vehicle aggregation
          const byVehicle: Record<string, { count: number; fuel: number; dist: number }> = {}
          ;[...completed, ...inProgress].forEach((r) => {
            const key = r.assigned_vehicle_plate || "بدون مركبة"
            if (!byVehicle[key]) byVehicle[key] = { count: 0, fuel: 0, dist: 0 }
            byVehicle[key].count++
            byVehicle[key].fuel += parseFloat(r.fuel_consumed) || 0
            byVehicle[key].dist += parseFloat(r.distance_traveled) || 0
          })

          return (
            <div className="mt-6 space-y-4 border-t border-zinc-800 pt-4">
              {/* Status counts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { label: "المجموع", count: sorted.length, color: "text-zinc-100", bg: "bg-zinc-800/50" },
                  { label: "مكتملة", count: completed.length, color: "text-emerald-400", bg: "bg-emerald-950/30" },
                  { label: "تحت التنفيذ", count: inProgress.length, color: "text-purple-400", bg: "bg-purple-950/30" },
                  { label: "بانتظار المدير", count: managerPending.length, color: "text-blue-400", bg: "bg-blue-950/30" },
                  { label: "قيد الانتظار", count: pending.length, color: "text-amber-400", bg: "bg-amber-950/30" },
                  { label: "مرفوضة", count: rejected.length, color: "text-red-400", bg: "bg-red-950/30" },
                ].map((s) => (
                  <Card key={s.label} className={`${s.bg} border-zinc-800`}>
                    <CardContent className="py-3 text-center">
                      <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-[10px] text-zinc-500">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Totals row */}
              <div className="flex flex-wrap gap-4 text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                <span><strong className="text-zinc-200">إجمالي الوقود المستهلك:</strong> {totalFuel.toFixed(2)} لتر</span>
                <span><strong className="text-zinc-200">إجمالي المسافة المقطوعة:</strong> {totalDist.toFixed(2)} كم</span>
                <span><strong className="text-zinc-200">متوسط الوقود لكل طلب:</strong> {completed.length ? (totalFuel / completed.length).toFixed(2) : "0"} لتر</span>
                <span><strong className="text-zinc-200">متوسط المسافة لكل طلب:</strong> {completed.length ? (totalDist / completed.length).toFixed(2) : "0"} كم</span>
                {totalFuel > 0 && <span><strong className="text-zinc-200">معدل الاستهلاك:</strong> {(totalDist / totalFuel).toFixed(2)} كم/لتر</span>}
              </div>

              {/* Dynamic grouping summary */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs text-zinc-500">تجميع حسب:</span>
                  {[
                    { key: "assigned_vehicle_plate", label: "المركبة" },
                    { key: "destination", label: "الجهة" },
                    { key: "employee_name", label: "الموظف" },
                    { key: "assigned_driver_name", label: "السائق" },
                    { key: "purpose", label: "الغرض" },
                    { key: "status", label: "الحالة" },
                    { key: "request_date", label: "التاريخ" },
                    { key: "requester_section", label: "القسم" },
                    { key: "transport_type", label: "نوع المواصلات" },
                  ].map((opt) => (
                    <button key={opt.key} onClick={() => setSummaryGroupBy(opt.key)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        summaryGroupBy === opt.key
                          ? "bg-amber-600/20 border-amber-600 text-amber-400"
                          : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                      }`}>{opt.label}</button>
                  ))}
                </div>
                {(() => {
                  const groupKey = summaryGroupBy
                  const groups: Record<string, { count: number; fuel: number; dist: number; items: any[] }> = {}
                  sorted.forEach((r) => {
                    const key = r[groupKey] || "غير محدد"
                    if (!groups[key]) groups[key] = { count: 0, fuel: 0, dist: 0, items: [] }
                    groups[key].count++
                    groups[key].fuel += parseFloat(r.fuel_consumed) || 0
                    groups[key].dist += parseFloat(r.distance_traveled) || 0
                    groups[key].items.push(r)
                  })
                  const entries = Object.entries(groups).sort(([, a], [, b]) => b.count - a.count)
                  const groupLabel = summaryGroupBy === "assigned_vehicle_plate" ? "المركبة"
                    : summaryGroupBy === "destination" ? "الجهة"
                    : summaryGroupBy === "employee_name" ? "الموظف"
                    : summaryGroupBy === "assigned_driver_name" ? "السائق"
                    : summaryGroupBy === "purpose" ? "الغرض"
                    : summaryGroupBy === "status" ? "الحالة"
                    : summaryGroupBy === "request_date" ? "التاريخ"
                    : summaryGroupBy === "requester_section" ? "القسم"
                    : summaryGroupBy === "transport_type" ? "النوع"
                    : summaryGroupBy
                  return entries.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ direction: "rtl" }}>
                        <thead>
                          <tr className="border-b border-zinc-700">
                            <th className="text-right py-2 px-2 text-zinc-500">{groupLabel}</th>
                            <th className="text-right py-2 px-2 text-zinc-500">عدد الطلبات</th>
                            <th className="text-right py-2 px-2 text-zinc-500">الوقود (لتر)</th>
                            <th className="text-right py-2 px-2 text-zinc-500">المسافة (كم)</th>
                            <th className="text-right py-2 px-2 text-zinc-500">معدل (كم/لتر)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map(([key, data]) => (
                            <tr key={key} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                              <td className="py-2 px-2 text-zinc-200">{key}</td>
                              <td className="py-2 px-2 text-zinc-300">{data.count}</td>
                              <td className="py-2 px-2 text-zinc-300">{data.fuel.toFixed(2)}</td>
                              <td className="py-2 px-2 text-zinc-300">{data.dist.toFixed(2)}</td>
                              <td className="py-2 px-2 text-zinc-300">{data.fuel > 0 ? (data.dist / data.fuel).toFixed(2) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null
                })()}
              </div>

              {/* Suggestions section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-medium text-amber-500">المقترحات والتحسينات</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(() => {
                    const tips: { title: string; text: string }[] = []
                    tips.push({ title: "تخطيط الطلبات", text: "هذه الطلبات خارج المخطط اليومي للرحلات. يُنصح بتخصيص مركبة احتياطية للطلبات الطارئة." })

                    // Same destination / same day grouping potential
                    const destGroups: Record<string, any[]> = {}
                    sorted.filter(r => r.destination).forEach(r => {
                      const key = `${r.request_date}|${r.destination}`
                      if (!destGroups[key]) destGroups[key] = []
                      destGroups[key].push(r)
                    })
                    Object.values(destGroups).forEach(group => {
                      if (group.length > 1) {
                        tips.push({
                          title: `توحيد الوجهات - ${group[0].destination}`,
                          text: `يوجد ${group.length} طلبات لنفس الجهة "${group[0].destination}" في تاريخ ${group[0].request_date}. يُفضل دمجها في رحلة واحدة.`
                        })
                      }
                    })

                    // Same departure time
                    const timeGroups: Record<string, any[]> = {}
                    sorted.filter(r => r.departure_time).forEach(r => {
                      const key = r.departure_time.slice(0, 16)
                      if (!timeGroups[key]) timeGroups[key] = []
                      timeGroups[key].push(r)
                    })
                    Object.values(timeGroups).forEach(group => {
                      if (group.length > 1) {
                        tips.push({
                          title: `تزامن مواعيد التحرك`,
                          text: `الطلبات في ${group[0].departure_time.slice(11, 16)} لنفس التوقيت (${group.map(r => r.employee_name).join('، ')}). كان يمكن ترتيبها معاً في رحلة موحدة.`
                        })
                      }
                    })

                    // Overlapping times for same vehicle
                    const vehicleTimes: Record<string, any[]> = {}
                    sorted.filter(r => r.assigned_vehicle_plate && r.departure_time && r.return_time).forEach(r => {
                      if (!vehicleTimes[r.assigned_vehicle_plate]) vehicleTimes[r.assigned_vehicle_plate] = []
                      vehicleTimes[r.assigned_vehicle_plate].push(r)
                    })
                    Object.entries(vehicleTimes).forEach(([plate, trips]) => {
                      for (let i = 0; i < trips.length; i++) {
                        for (let j = i + 1; j < trips.length; j++) {
                          const a = new Date(trips[i].departure_time).getTime()
                          const b = new Date(trips[i].return_time).getTime()
                          const c = new Date(trips[j].departure_time).getTime()
                          const d = new Date(trips[j].return_time).getTime()
                          if (a < d && c < b) {
                            tips.push({
                              title: `تداخل أوقات المركبة ${plate}`,
                              text: `المركبة "${plate}" لديها طلبان متداخلان: "${trips[i].employee_name}" (${trips[i].departure_time.slice(11,16)}-${trips[i].return_time.slice(11,16)}) و "${trips[j].employee_name}" (${trips[j].departure_time.slice(11,16)}-${trips[j].return_time.slice(11,16)}).`
                            })
                            break
                          }
                        }
                        if (tips.length > 0 && tips[tips.length - 1].title.includes(plate)) break
                      }
                    })

                    // Low km per liter (high consumption)
                    completed.filter(r => r.fuel_consumed && r.distance_traveled && parseFloat(r.fuel_consumed) > 0).forEach(r => {
                      const kmPerLiter = parseFloat(r.distance_traveled) / parseFloat(r.fuel_consumed)
                      if (kmPerLiter < 2) {
                        tips.push({
                          title: `استهلاك مرتفع`,
                          text: `الطلب "${r.employee_name}" قطع ${r.distance_traveled} كم باستهلاك ${r.fuel_consumed} لتر (معدل ${kmPerLiter.toFixed(2)} كم/لتر). قد يكون هناك مشكلة في المركبة أو تسرب وقود.`
                        })
                      }
                    })

                    if (tips.length > 3) tips.splice(3, tips.length - 3, { title: "ملاحظة", text: `يوجد ${tips.length - 1} تحسينات إضافية. راجع البيانات أعلاه للتفاصيل.` })

                    return tips.map(tip => (
                      <Card key={tip.title} className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="py-3 text-xs text-zinc-400 space-y-1">
                          <p className="text-zinc-200 font-medium mb-1">{tip.title}</p>
                          <p>{tip.text}</p>
                        </CardContent>
                      </Card>
                    ))
                  })()}
                </div>
              </div>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

function AssignmentsTab({ onTripsChanged }: { onTripsChanged?: () => void }) {
  const [employees, setEmployees] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [shiftTypes, setShiftTypes] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [assemblyPoints, setAssemblyPoints] = useState<any[]>([])
  const [shiftType, setShiftType] = useState("")
  const [routeId, setRouteId] = useState("")
  const [assemblyPointId, setAssemblyPointId] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [message, setMessage] = useState("")
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())
  const today = new Date().toLocaleDateString("en-CA")

  const fetchEmployees = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (shiftType) params.set("shift_type", shiftType)
    if (routeId) params.set("route_id", routeId)
    if (statusFilter) params.set("today_status", statusFilter)
    if (assemblyPointId) params.set("assembly_point", assemblyPointId)
    api.get(`/transport/employee-infos/?${params.toString()}`).then((res) => {
      const emps = res.data.results || res.data
      setEmployees(emps)
      setSelected(new Set())
      const groups: Record<string, any[]> = {}
      emps.forEach((e: any) => {
        const r = e.route_name || "بدون خط"
        if (!groups[r]) groups[r] = []
        groups[r].push(e)
      })
      setExpandedRoutes(new Set(Object.keys(groups)))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchEmployees() }, [shiftType, routeId, statusFilter, assemblyPointId])

  useEffect(() => {
    api.get("/transport/shift-types/").then((r) => setShiftTypes(r.data.results || r.data)).catch(() => {})
    api.get("/transport/routes/").then((r) => setRoutes(r.data.results || r.data)).catch(() => {})
    api.get("/transport/assembly-points/").then((r) => setAssemblyPoints(r.data.results || r.data)).catch(() => {})
  }, [])

  const toggleSelectAll = () => {
    if (selected.size === employees.length) setSelected(new Set())
    else setSelected(new Set(employees.map((e) => e.id)))
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const toggleRoute = (route: string) => {
    const next = new Set(expandedRoutes)
    if (next.has(route)) next.delete(route); else next.add(route)
    setExpandedRoutes(next)
  }

  const groups: Record<string, any[]> = {}
  employees.forEach((e) => {
    const r = e.route_name || "بدون خط"
    if (!groups[r]) groups[r] = []
    groups[r].push(e)
  })

  const transferToTrips = async () => {
    if (selected.size === 0) return
    setTransferring(true)
    setMessage("")
    try {
      const rows = employees.filter((e) => selected.has(e.id)).map((e) =>
        `${e.employee_id}|${e.employee_name || ""}|${e.route_name || ""}`
      )
      const res = await api.post("/transport/employee-infos/transfer_to_trips/", { rows, date: today })
      setMessage(res.data.message)
      setSelected(new Set())
      onTripsChanged?.()
    } catch { setMessage("فشل الترحيل") } finally { setTransferring(false) }
  }

  const transferAllByRoute = async () => {
    if (employees.length === 0) return
    setTransferring(true)
    setMessage("")
    try {
      const rows = employees.map((e) =>
        `${e.employee_id}|${e.employee_name || ""}|${e.route_name || ""}`
      )
      const res = await api.post("/transport/employee-infos/transfer_to_trips/", { rows, date: today })
      setMessage(res.data.message)
      onTripsChanged?.()
    } catch { setMessage("فشل الترحيل") } finally { setTransferring(false) }
  }

  const transferAllMerged = async () => {
    if (employees.length === 0) return
    setTransferring(true)
    setMessage("")
    try {
      const rows = employees.map((e) =>
        `${e.employee_id}|${e.employee_name || ""}|${e.route_name || ""}`
      )
      const res = await api.post("/transport/employee-infos/transfer_to_trips/", { rows, date: today, merge: true })
      setMessage(res.data.message)
      onTripsChanged?.()
    } catch { setMessage("فشل الترحيل") } finally { setTransferring(false) }
  }

  const statusOptions = [
    { value: "", label: "الكل" },
    { value: "arriving", label: "قادم" },
    { value: "working", label: "مداوم" },
    { value: "departing", label: "مغادر" },
    { value: "vacation", label: "إجازة" },
    { value: "transport_arrange", label: "ترتيب مواصلات" },
  ]

  const cycleColorMap: Record<string, string> = {
    arriving: "bg-blue-500/10 text-blue-400",
    working: "bg-emerald-500/10 text-emerald-400",
    departing: "bg-amber-500/10 text-amber-400",
    vacation: "bg-purple-500/10 text-purple-400",
    transport_arrange: "bg-cyan-500/10 text-cyan-400",
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg text-zinc-100">
            التعيينات
            <span className="mr-2 text-sm text-zinc-500 font-normal">({loading ? "..." : employees.length})</span>
          </CardTitle>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100">
              <option value="">كل أنواع الدوام</option>
              {shiftTypes.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100">
              <option value="">كل الخطوط</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={assemblyPointId} onChange={(e) => setAssemblyPointId(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100">
              <option value="">كل النقاط</option>
              {assemblyPoints.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100">
              {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Button onClick={transferToTrips} disabled={selected.size === 0 || transferring} className="bg-amber-500 hover:bg-amber-600 text-black">
              {transferring ? "جاري..." : `ترحيل المحدد (${selected.size})`}
            </Button>
            <Button onClick={transferAllByRoute} disabled={employees.length === 0 || transferring} variant="outline" className="border-zinc-700 text-zinc-300 hover:text-zinc-100">
              {transferring ? "جاري..." : `ترحيل الكل حسب الخط (${employees.length})`}
            </Button>
            <Button onClick={transferAllMerged} disabled={employees.length === 0 || transferring} variant="outline" className="border-zinc-700 text-zinc-300 hover:text-zinc-100">
              {transferring ? "جاري..." : `ترحيل الكل رحلة واحدة (${employees.length})`}
            </Button>
          </div>
        </div>
        {message && <p className={`text-sm mt-2 ${message.includes("فشل") ? "text-red-400" : "text-emerald-400"}`}>{message}</p>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ direction: "rtl" }}>
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-3 px-4"><input type="checkbox" checked={selected.size === employees.length && employees.length > 0} onChange={toggleSelectAll} className="rounded border-zinc-600" /></th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">الكود</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">الاسم</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">القسم</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">نوع الدوام</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">خط السير</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">الحالة الدورية</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">الوصول</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">الانصراف</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-zinc-500">جاري التحميل...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-zinc-500">لا يوجد موظفين</td></tr>
              ) : Object.entries(groups).map(([route, emps]) => {
                const open = expandedRoutes.has(route)
                const routeSelected = emps.every((e) => selected.has(e.id))
                return (
                  <Fragment key={route}>
                    <tr className="border-b border-zinc-700 bg-zinc-900/80 cursor-pointer hover:bg-zinc-800/80" onClick={() => toggleRoute(route)}>
                      <td className="py-2 px-4" colSpan={9}>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-xs">{open ? "▼" : "▶"}</span>
                          <span className="text-zinc-200 font-medium">{route}</span>
                          <span className="text-zinc-500 text-xs">({emps.length})</span>
                        </div>
                      </td>
                    </tr>
                    {open && emps.map((emp: any) => (
                      <tr key={emp.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                        <td className="py-3 px-4"><input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded border-zinc-600" /></td>
                        <td className="py-3 px-4 text-zinc-100">{emp.employee_id}</td>
                        <td className="py-3 px-4 text-zinc-100">{emp.employee_full_name || emp.employee_name || "-"}</td>
                        <td className="py-3 px-4 text-zinc-400">{emp.employee_department_name || emp.department || "-"}</td>
                        <td className="py-3 px-4 text-zinc-400">{emp.shift_type_name || "-"}</td>
                        <td className="py-3 px-4 text-zinc-400">{emp.route_name || "-"}</td>
                        <td className="py-3 px-4">
                          {emp.cycle_status ? (
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs ${cycleColorMap[emp.cycle_status.status] || "bg-zinc-500/10 text-zinc-400"}`}>
                              {emp.cycle_status.label}
                            </span>
                          ) : <span className="text-zinc-500">-</span>}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{emp.arrival_time?.slice(0, 5) || "-"}</td>
                        <td className="py-3 px-4 text-zinc-400">{emp.departure_time?.slice(0, 5) || "-"}</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

const CHART_COLORS = ["#f59e0b", "#06b6d4", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"]

function FuelReport() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toLocaleDateString("en-CA")
  })
  const [to, setTo] = useState(() => new Date().toLocaleDateString("en-CA"))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = () => {
    setLoading(true)
    api.get(`/transport/trips/fuel_report/?from=${from}&to=${to}`).then((res) => {
      setData(res.data)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchReport() }, [from, to])

  if (loading) return <Card><CardContent className="py-12 text-center text-zinc-500">جاري تحميل التقرير...</CardContent></Card>
  if (!data) return <Card><CardContent className="py-12 text-center text-zinc-500">لا توجد بيانات</CardContent></Card>

  const { by_purpose: byPurpose, total_fuel: totalFuel, total_trips: totalTrips, total_requests: totalRequests, total_vehicles: totalVehicles, recommendations } = data

  const pieData = byPurpose.map((p: any) => ({ name: p.purpose, value: p.total_fuel }))

  const barData = byPurpose.map((p: any) => ({
    purpose: p.purpose.length > 12 ? p.purpose.slice(0, 12) + "..." : p.purpose,
    fullName: p.purpose, fuel: p.total_fuel,
  }))

  const handleExportCSV = () => {
    const rows: any[] = []
    byPurpose.forEach((p: any) => {
      p.vehicles.forEach((v: any) => {
        rows.push({ purpose: p.purpose, bus_number: v.bus_number, plate_number: v.plate_number, fuel: v.fuel, trips: v.trips, requests: v.requests, efficiency: v.fuel_efficiency > 0 ? `${v.fuel_efficiency} كم/لتر` : "-" })
      })
    })
    exportCSV(rows, ["purpose", "bus_number", "plate_number", "fuel", "trips", "requests", "efficiency"], { purpose: "الغرض", bus_number: "رقم الباص", plate_number: "رقم اللوحة", fuel: "الوقود (لتر)", trips: "عدد الرحلات", requests: "عدد الطلبات", efficiency: "كفاءة الوقود" }, `تقرير_الوقود_${from}_${to}`)
  }

  return (
    <div className="space-y-6">
      {/* filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg text-zinc-100 flex items-center gap-2"><Fuel className="h-5 w-5 text-amber-500" /> تقرير استهلاك الوقود</CardTitle>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">من</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">إلى</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100" />
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV} title="تصدير CSV">
                <FileSpreadsheet className="h-4 w-4 ml-1" />تصدير
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-900/20 to-amber-950/10 border border-amber-800/30 rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-amber-400">{totalFuel.toFixed(1)}</div>
          <div className="text-xs text-zinc-400 mt-1">إجمالي الوقود (لتر)</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-950/10 border border-emerald-800/30 rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-emerald-400">{totalTrips}</div>
          <div className="text-xs text-zinc-400 mt-1">رحلات الموظفين</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/10 border border-blue-800/30 rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-blue-400">{totalRequests}</div>
          <div className="text-xs text-zinc-400 mt-1">طلبات النقل</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-950/10 border border-purple-800/30 rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-purple-400">{totalVehicles}</div>
          <div className="text-xs text-zinc-400 mt-1">المركبات المستخدمة</div>
        </div>
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm text-zinc-100">توزيع الوقود حسب الغرض</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد بيانات</p>
            : <div className="grid grid-cols-2 gap-3">
                {pieData.map((item: any, i: number) => (
                  <div key={i} className="bg-zinc-900/50 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-400 truncate">{item.name}</div>
                      <div className="text-sm font-bold text-zinc-100">{item.value.toFixed(1)} <span className="text-xs font-normal text-zinc-500">لتر</span></div>
                      <div className="text-[10px] text-zinc-500">{totalFuel > 0 ? ((item.value / totalFuel) * 100).toFixed(1) : 0}%</div>
                    </div>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm text-zinc-100">مقارنة استهلاك الوقود</CardTitle></CardHeader>
          <CardContent>
            {barData.length === 0 ? <p className="text-center py-8 text-zinc-500">لا توجد بيانات</p>
            : <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <XAxis dataKey="purpose" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#e4e4e7' }} />
                  <Bar dataKey="fuel" name="الوقود (لتر)" radius={[4, 4, 0, 0]} fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>}
          </CardContent>
        </Card>
      </div>

      {/* per-purpose vehicle breakdown */}
      {byPurpose.map((p: any, pi: number) => (
        <Card key={pi}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-zinc-100 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS[pi % CHART_COLORS.length] }} />
                {p.purpose}
              </CardTitle>
              <span className="text-xs text-zinc-500">{p.total_fuel.toFixed(1)} لتر | {p.vehicle_count} مركبة</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ direction: "rtl" }}>
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-right py-2 px-2 text-zinc-500">رقم الباص</th>
                    <th className="text-right py-2 px-2 text-zinc-500">رقم اللوحة</th>
                    <th className="text-right py-2 px-2 text-zinc-500">الوقود (لتر)</th>
                    <th className="text-right py-2 px-2 text-zinc-500">عدد الرحلات</th>
                    <th className="text-right py-2 px-2 text-zinc-500">عدد الطلبات</th>
                    <th className="text-right py-2 px-2 text-zinc-500">كفاءة الوقود</th>
                  </tr>
                </thead>
                <tbody>
                  {p.vehicles.map((v: any, vi: number) => (
                    <tr key={vi} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                      <td className="py-2 px-2 text-zinc-100">{v.bus_number || "-"}</td>
                      <td className="py-2 px-2 text-zinc-300">{v.plate_number || "-"}</td>
                      <td className="py-2 px-2 text-amber-400 font-medium">{v.fuel.toFixed(1)}</td>
                      <td className="py-2 px-2 text-emerald-400">{v.trips}</td>
                      <td className="py-2 px-2 text-blue-400">{v.requests}</td>
                      <td className="py-2 px-2 text-zinc-400">{v.fuel_efficiency > 0 ? `${v.fuel_efficiency} كم/لتر` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="border border-amber-800/50 bg-gradient-to-br from-amber-950/20 to-zinc-950/30 rounded-xl p-5">
          <h4 className="text-sm text-amber-400 font-medium mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> التوصيات والتحسينات</h4>
          <ul className="text-xs text-zinc-300 space-y-2 pr-4">
            {recommendations.map((r: string, i: number) => <li key={i} className="list-disc leading-5">{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function TransportPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [tripSearch, setTripSearch] = useState("")
  const [tripDialogOpen, setTripDialogOpen] = useState(false)
  const [tripRouteFilter, setTripRouteFilter] = useState("")
  const [routes, setRoutes] = useState<any[]>([])
  const [tripsRefreshKey, setTripsRefreshKey] = useState(0)
  const [tripRiderExpanded, setTripRiderExpanded] = useState<Set<string>>(new Set())
  const [routeEmployees, setRouteEmployees] = useState<Record<string, any[]>>({})
  const [completeTripDialog, setCompleteTripDialog] = useState<any>(null)
  const [completeTripFuel, setCompleteTripFuel] = useState("")
  const [completeTripReturnTime, setCompleteTripReturnTime] = useState("")
  const [completeTripNote, setCompleteTripNote] = useState("")

  const refreshTrips = () => setTripsRefreshKey((k) => k + 1)

  const toggleTripRiders = (tripId: string) => {
    const next = new Set(tripRiderExpanded)
    if (next.has(tripId)) next.delete(tripId); else next.add(tripId)
    setTripRiderExpanded(next)
  }

  const fetchTrips = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("date", date)
    if (tripRouteFilter) params.set("route", tripRouteFilter)
    Promise.all([
      api.get(`/transport/trips/?${params.toString()}`),
      api.get("/transport/assignments/"),
    ]).then(([tripsRes, assignRes]) => {
      setTrips(tripsRes.data.results || tripsRes.data)
      const assignments = assignRes.data.results || assignRes.data
      const byRoute: Record<string, any[]> = {}
      assignments.forEach((a: any) => {
        const key = a.route_name?.trim() || "بدون خط"
        if (!byRoute[key]) byRoute[key] = []
        if (!byRoute[key].find((e: any) => e.employee_id === a.employee_id)) {
          byRoute[key].push(a)
        }
      })
      setRouteEmployees(byRoute)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchTrips() }, [date, tripRouteFilter, tripsRefreshKey])

  useEffect(() => {
    api.get("/transport/routes/").then((r) => setRoutes(r.data.results || r.data)).catch(() => {})
  }, [])

  const [assignDialogTrip, setAssignDialogTrip] = useState<any>(null)
  const [assignDriverId, setAssignDriverId] = useState("")
  const [assignVehicleId, setAssignVehicleId] = useState("")
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])

  useEffect(() => {
    if (assignDialogTrip) {
      Promise.all([
        api.get("/transport/drivers/"),
        api.get("/transport/vehicles/"),
        api.get(`/transport/trips/?date=${date}`),
      ]).then(([driversRes, vehiclesRes, tripsRes]) => {
        const allDrivers = driversRes.data.results || driversRes.data
        const allVehicles = vehiclesRes.data.results || vehiclesRes.data
        const todayTrips = (tripsRes.data.results || tripsRes.data).filter((t: any) => t.id !== assignDialogTrip.id)

        const usedDriverIds = new Set(todayTrips.filter((t: any) => t.driver_id).map((t: any) => t.driver_id))
        const usedVehicleIds = new Set(todayTrips.filter((t: any) => t.vehicle_id).map((t: any) => t.vehicle_id))

        setDrivers(allDrivers.filter((d: any) => !usedDriverIds.has(d.id)))
        setVehicles(allVehicles.filter((v: any) => !usedVehicleIds.has(v.id)))
      }).catch(() => {})
    }
  }, [assignDialogTrip])

  const handleAssignResources = async () => {
    if (!assignDialogTrip) return
    await api.post(`/transport/trips/${assignDialogTrip.id}/assign_resources/`, {
      driver_id: assignDriverId || undefined,
      vehicle_id: assignVehicleId || undefined,
    })
    setAssignDialogTrip(null)
    setAssignDriverId("")
    setAssignVehicleId("")
    fetchTrips()
  }

  const updateStatus = async (id: string, action: string) => {
    await api.post(`/transport/trips/${id}/${action}/`)
    fetchTrips()
  }

  const openSupervisorComplete = (trip: any) => {
    setCompleteTripDialog(trip)
    setCompleteTripFuel("")
    setCompleteTripReturnTime(new Date().toISOString().slice(0, 16))
    setCompleteTripNote("")
  }

  const handleSupervisorComplete = async () => {
    if (!completeTripDialog) return
    await api.post(`/transport/trips/${completeTripDialog.id}/supervisor_complete/`, {
      fuel_consumed: completeTripFuel,
      actual_return_time: completeTripReturnTime,
      return_note: completeTripNote,
    })
    setCompleteTripDialog(null)
    fetchTrips()
  }

  const filteredTrips = tripSearch ? trips.filter((t) =>
    [t.vehicle_plate, t.driver_name, t.route_name].some((v) => v?.includes(tripSearch))
  ) : trips
  const tripColumns = ["vehicle_plate", "driver_name", "route_names", "assembly_point_name", "departure_time", "return_time", "planned_count", "rider_count", "status"]

  const tripLabels: Record<string, string> = { vehicle_plate: "المركبة", driver_name: "السائق", route_names: "الخط", assembly_point_name: "نقطة التجمع", departure_time: "الانطلاق", return_time: "العودة", planned_count: "المخطط", rider_count: "الصاعدون", status: "الحالة" }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">المواصلات</h1>
        <p className="text-sm text-zinc-500 mt-1">إدارة الرحلات والمركبات والسائقين وخطوط السير والموظفين</p>
      </div>

      <Tabs defaultValue="trips" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="trips">الرحلات</TabsTrigger>
          <TabsTrigger value="vehicles">المركبات</TabsTrigger>
          <TabsTrigger value="drivers">السائقين</TabsTrigger>
          <TabsTrigger value="routes">خطوط السير</TabsTrigger>
          <TabsTrigger value="shift-types">أنواع الدوام</TabsTrigger>
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
          <TabsTrigger value="assignments">التعيينات</TabsTrigger>
          <TabsTrigger value="ride-logs">سجل الركوب</TabsTrigger>
          <TabsTrigger value="trip-report">تقرير الرحلات</TabsTrigger>
          <TabsTrigger value="assembly-points">نقاط التجمع</TabsTrigger>
          <TabsTrigger value="violations">المخالفات</TabsTrigger>
          <TabsTrigger value="observed-violations">المخالفات المرصودة</TabsTrigger>
          <TabsTrigger value="trip-evaluation">تقييم الرحلات</TabsTrigger>
          <TabsTrigger value="transport-requests">طلبات المواصلات</TabsTrigger>
          <TabsTrigger value="requests-report">تقرير الطلبات</TabsTrigger>
          <TabsTrigger value="fuel-report">تقارير المصروفات</TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg text-zinc-100">الرحلات</CardTitle>
              <div className="flex gap-2 flex-wrap items-center">
                <Filter className="h-4 w-4 text-zinc-500" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100" />
                <select value={tripRouteFilter} onChange={(e) => setTripRouteFilter(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100">
                  <option value="">كل الخطوط</option>
                  {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input value={tripSearch} onChange={(e) => setTripSearch(e.target.value)} placeholder="بحث..." className="w-48 pr-9 bg-zinc-900 border-zinc-700 text-zinc-100" />
                </div>
                <Button variant="outline" size="icon" onClick={() => {
                  const exportData = filteredTrips.map((t: any) => ({
                    ...t, planned: t.planned_count || 0,
                    riders_text: (t.riders || []).map((r: any) => `${r.employee_name} (${r.action === 'board' ? 'صاعد' : 'مخطط'})`).join(" | ")
                  }))
                  const exportCols = [...tripColumns, "riders_text"]
                  const exportLabels = { ...tripLabels, planned: "المخطط", riders_text: "الموظفون" }
                  exportCSV(exportData, exportCols, exportLabels, "الرحلات")
                }} title="تصدير CSV" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => {
                  const styles = `
                    <style>
                      body { font-family: sans-serif; direction: rtl; padding: 20px; }
                      .trip-section { border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid; }
                      .trip-header { background: #f59e0b; color: #000; padding: 10px 16px; border-radius: 6px; margin-bottom: 12px; font-size: 14px; display: flex; gap: 20px; flex-wrap: wrap; }
                      .trip-header span { font-weight: bold; }
                      table { width: 100%; border-collapse: collapse; font-size: 12px; }
                      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: right; }
                      th { background: #f3f4f6; color: #111; font-weight: 600; }
                      h1 { text-align: center; color: #333; font-size: 20px; margin-bottom: 24px; }
                    </style>
                  `
                  const sections = filteredTrips.map((t: any) => `
                    <div class="trip-section">
                      <div class="trip-header">
                        <span>🚌 ${t.vehicle_plate || "-"}</span>
                        <span>👤 ${t.driver_name || "-"}</span>
                        <span>📍 ${t.route_names ? (Array.isArray(t.route_names) ? t.route_names.join(" + ") : t.route_names) : t.route_name || "-"}</span>
                        <span>📌 ${t.assembly_point_name || "-"}</span>
                        <span>⏰ ${t.departure_time?.slice(0,5) || "-"} → ${t.return_time?.slice(0,5) || "-"}</span>
                        <span>📊 ${t.status === "scheduled" ? "مجدولة" : t.status === "in_progress" ? "قيد التنفيذ" : t.status === "completed" ? "مكتملة" : "ملغاة"}</span>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>الكود</th>
                            <th>الاسم</th>
                            <th>القسم</th>
                            <th>نقطة التجمع</th>
                            <th>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${(t.riders || []).map((r: any) => `
                            <tr>
                              <td>${r.employee_id}</td>
                              <td>${r.employee_name}</td>
                              <td>${r.department || "-"}</td>
                              <td>${r.assembly_point || "-"}</td>
                              <td>${r.action === 'board' ? 'صاعد' : 'مخطط'}</td>
                            </tr>
                          `).join("")}
                        </tbody>
                      </table>
                    </div>
                  `).join("")
                  const html = `<!DOCTYPE html><html dir="rtl"><head>${styles}</head><body><h1>الرحلات</h1>${sections}</body></html>`
                  const win = window.open("", "_blank")
                  if (win) { win.document.write(html); win.document.close(); win.focus(); win.print() }
                }} title="تصدير PDF" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
                  <FileText className="h-4 w-4" />
                </Button>
                <Dialog open={tripDialogOpen} onOpenChange={setTripDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black"><Plus className="h-4 w-4 ml-1" /> إضافة</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader><DialogTitle>إضافة رحلة</DialogTitle></DialogHeader>
                    <TripForm onSuccess={() => { setTripDialogOpen(false); fetchTrips() }} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ direction: "rtl" }}>
                  <thead><tr className="border-b border-zinc-800">
                    {tripColumns.map((c) => <th key={c} className="text-right py-3 px-4 text-zinc-400 font-medium">{tripLabels[c]}</th>)}
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الإجراءات</th>
                  </tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan={10} className="text-center py-8 text-zinc-500">جاري التحميل...</td></tr>
                    : filteredTrips.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-zinc-500">لا توجد رحلات</td></tr>
                    : (() => {
                        const tripGroups: Record<string, any[]> = {}
                        filteredTrips.forEach((t) => {
                          const rn = Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "بدون خط")
                          const key = rn.trim()
                          if (!tripGroups[key]) tripGroups[key] = []
                          tripGroups[key].push(t)
                        })
                        return Object.entries(tripGroups).flatMap(([route, trips]) => {
                          const tripRows = trips.flatMap((t: any) => {
                            const riderOpen = tripRiderExpanded.has(t.id)
                            return [
                              <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                                <td className="py-3 px-4 text-zinc-100">{t.vehicle_plate || "-"}</td>
                                <td className="py-3 px-4 text-zinc-400">{t.driver_name || "-"}</td>
                                <td className="py-3 px-4 text-zinc-400">{Array.isArray(t.route_names) ? t.route_names.join(" + ") : (t.route_names || t.route_name || "-")}</td>
                                <td className="py-3 px-4 text-zinc-400">{t.assembly_point_name || "-"}</td>
                                <td className="py-3 px-4 text-zinc-400">{t.departure_time?.slice(0,5) || "-"}</td>
                                <td className="py-3 px-4 text-zinc-400">{t.return_time?.slice(0,5) || "-"}</td>
                                <td className="py-3 px-4">
                                  <button onClick={() => toggleTripRiders(t.id)} className="text-amber-400 hover:text-amber-300 underline cursor-pointer">
                                    {riderOpen ? `▼ ${t.planned_count || 0}` : `${t.planned_count || 0}`}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-zinc-400">{t.rider_count || 0}</td>
                                <td className="py-3 px-4">{renderStatus(t.status)}</td>
                                  <td className="py-3 px-4">
                                  <div className="flex gap-1">
                                    {t.status === "scheduled" && <Button variant="ghost" size="icon" onClick={() => updateStatus(t.id, "start")} title="بدء"><Play className="h-4 w-4 text-emerald-400" /></Button>}
                                    {t.status === "in_progress" && !t.driver_completed && <span className="text-[10px] text-zinc-500 px-1">بانتظار السائق</span>}
                                    {t.status === "in_progress" && t.driver_completed && <Button variant="ghost" size="icon" onClick={() => openSupervisorComplete(t)} title="إكمال المشرف"><CheckCircle className="h-4 w-4 text-amber-400" /></Button>}
                                    {(t.status === "scheduled" || t.status === "in_progress") && <Button variant="ghost" size="icon" onClick={() => updateStatus(t.id, "cancel")} title="إلغاء"><XCircle className="h-4 w-4 text-red-400" /></Button>}
                                    {t.status === "scheduled" && <Button variant="ghost" size="icon" onClick={() => { setAssignDialogTrip(t); setAssignDriverId(t.driver_id || ""); setAssignVehicleId(t.vehicle_id || "") }} title="تعيين موارد"><Plus className="h-4 w-4 text-amber-400" /></Button>}
                                    {["in_progress", "cancelled"].includes(t.status) && <Button variant="ghost" size="icon" onClick={() => updateStatus(t.id, "reopen")} title="سحب الرحلة"><Undo2 className="h-4 w-4 text-blue-400" /></Button>}
                                  </div>
                                </td>
                              </tr>,
                              ...(riderOpen && t.riders?.length ? [
                                <tr key={`${t.id}-riders`} className="bg-zinc-900/30">
                                  <td colSpan={10} className="py-2 px-8">
                                    <div className="bg-zinc-800/50 rounded-t-md px-3 py-2 mb-2 flex flex-wrap gap-4 text-xs text-zinc-300">
                                      <span>🚌 <b className="text-zinc-100">{t.vehicle_plate || "-"}</b></span>
                                      <span>👤 <b className="text-zinc-100">{t.driver_name || "-"}</b></span>
                                    </div>
                                    <div className="space-y-2">
                                      {(() => {
                                        const groups: Record<string, any[]> = {}
                                        t.riders.forEach((r: any) => {
                                          const key = r.assembly_point || "بدون نقطة"
                                          if (!groups[key]) groups[key] = []
                                          groups[key].push(r)
                                        })
                                        return Object.entries(groups).map(([ap, emps]) => (
                                          <div key={ap}>
                                            <div className="text-amber-400 text-[11px] font-medium mb-1">📍 {ap}</div>
                                            <table className="w-full text-xs" style={{ direction: "rtl" }}>
                                              <thead>
                                                <tr className="border-b border-zinc-700">
                                                  <th className="text-right py-1 px-2 text-zinc-500 font-medium">الكود</th>
                                                  <th className="text-right py-1 px-2 text-zinc-500 font-medium">الاسم</th>
                                                  <th className="text-right py-1 px-2 text-zinc-500 font-medium">القسم</th>
                                                  <th className="text-right py-1 px-2 text-zinc-500 font-medium">الحالة</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {emps.map((r: any, i: number) => (
                                                  <tr key={i} className="border-b border-zinc-800/30">
                                                    <td className="py-1 px-2 text-zinc-300">{r.employee_id}</td>
                                                    <td className="py-1 px-2 text-zinc-100">{r.employee_name}</td>
                                                    <td className="py-1 px-2 text-zinc-400">{r.department || "-"}</td>
                                                    <td className="py-1 px-2">
                                                      <span className={`text-[10px] ${r.action === 'board' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {r.action === 'board' ? 'صاعد' : 'مخطط'}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ))
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              ] : []),
                            ]
                          })
                          const empRows = routeEmployees[route]?.length ? [
                            <tr key={`${route}-emps`} className="bg-amber-950/10 border-b border-zinc-800">
                              <td colSpan={10} className="py-1.5 px-8">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-amber-400 text-xs font-medium ml-1">الموظفون:</span>
                                  {routeEmployees[route].map((e: any, i: number) => (
                                    <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{e.employee_name || e.employee_id}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>,
                          ] : []
                          return [
                            <tr key={`g-${route}`} className="border-b border-zinc-700 bg-zinc-900/80">
                              <td className="py-2 px-4" colSpan={10}>
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-200 font-medium">{route}</span>
                                  <span className="text-zinc-500 text-xs">({trips.length})</span>
                                </div>
                              </td>
                            </tr>,
                            ...empRows,
                            ...tripRows,
                          ]
                        })
                      })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!assignDialogTrip} onOpenChange={(o) => { if (!o) setAssignDialogTrip(null) }}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
              <DialogHeader><DialogTitle>تعيين موارد للرحلة - {assignDialogTrip?.trip_date}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">السائق</Label>
                  <select value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
                    <option value="">---</option>
                    {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">الباص</Label>
                  <select value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
                    <option value="">---</option>
                    {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                  </select>
                </div>
                <Button onClick={handleAssignResources} className="w-full bg-amber-500 hover:bg-amber-600 text-black">حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Supervisor complete dialog */}
          <Dialog open={!!completeTripDialog} onOpenChange={(o) => { if (!o) setCompleteTripDialog(null) }}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
              <DialogHeader><DialogTitle>إكمال الرحلة - {completeTripDialog?.vehicle_plate || ""}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">الوقود المستهلك (لتر)</Label>
                  <input type="number" value={completeTripFuel} onChange={(e) => setCompleteTripFuel(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">وقت الوصول الفعلي</Label>
                  <input type="datetime-local" value={completeTripReturnTime} onChange={(e) => setCompleteTripReturnTime(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">ملاحظات العودة</Label>
                  <textarea value={completeTripNote} onChange={(e) => setCompleteTripNote(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" rows={3} />
                </div>
                <Button onClick={handleSupervisorComplete} className="w-full bg-amber-500 hover:bg-amber-600 text-black">إكمال الرحلة</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="vehicles">
          <CrudDataTable title="المركبات" endpoint="/transport/vehicles/"
            columns={["plate_number", "bus_number", "vehicle_type", "vehicle_purpose", "model", "capacity", "fuel_efficiency", "status"]}
            labels={{ plate_number: "رقم اللوحة", bus_number: "رقم الباص", vehicle_type: "النوع", vehicle_purpose: "الغرض", model: "الموديل", capacity: "السعة", fuel_efficiency: "الاستهلاك (كم/لتر)", status: "الحالة" }}
            fields={vehicleFields} renderCell={crudRender} filename="المركبات" />
        </TabsContent>

        <TabsContent value="drivers">
          <CrudDataTable title="السائقين" endpoint="/transport/drivers/"
            columns={["employee_id", "name", "phone", "license_number", "status"]}
            labels={{ employee_id: "الكود", name: "الاسم", phone: "الجوال", license_number: "الرخصة", status: "الحالة" }}
            fields={driverFields} renderCell={crudRender} filename="السائقين" />
        </TabsContent>

        <TabsContent value="routes">
          <CrudDataTable title="خطوط السير" endpoint="/transport/routes/"
            columns={["name", "area", "departure_time", "return_time", "shift_type_name", "default_vehicle_plate", "default_driver_name", "status"]}
            labels={{ name: "الاسم", area: "المنطقة", departure_time: "وقت الانطلاق", return_time: "وقت العودة", shift_type_name: "نوع الدوام", default_vehicle_plate: "المركبة", default_driver_name: "السائق", status: "الحالة" }}
            fields={routeFields} renderCell={crudRender} filename="خطوط_السير" />
        </TabsContent>

        <TabsContent value="shift-types">
          <CrudDataTable title="أنواع الدوام" endpoint="/transport/shift-types/"
            columns={["name", "work_days", "vacation_days", "status"]}
            labels={{ name: "الاسم", work_days: "أيام الدوام", vacation_days: "أيام الإجازة", status: "الحالة" }}
            fields={shiftFields} renderCell={crudRender} filename="انواع_الدوام" />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeesTab />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab onTripsChanged={refreshTrips} />
        </TabsContent>

        <TabsContent value="ride-logs">
          <RideLogsReport />
        </TabsContent>
        <TabsContent value="trip-report">
          <TripSummaryReport />
        </TabsContent>

        <TabsContent value="assembly-points">
          <CrudDataTable title="نقاط التجمع" endpoint="/transport/assembly-points/"
            columns={["name", "area", "route_name", "status"]}
            labels={{ name: "الاسم", area: "المنطقة", route_name: "خط السير", status: "الحالة" }}
            fields={[
              { name: "name", label: "الاسم", type: "text", required: true },
              { name: "area", label: "المنطقة", type: "text" },
              { name: "route", label: "خط السير", type: "select", fkEndpoint: "/transport/routes/", fkLabel: "name" },
              { name: "status", label: "الحالة", type: "select", options: [{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }], default: "active" },
              { name: "notes", label: "ملاحظات", type: "textarea" },
            ]}
            renderCell={crudRender} filename="نقاط_التجمع" />
        </TabsContent>

        <TabsContent value="violations">
          <CrudDataTable title="المخالفات" endpoint="/transport/violations/"
            columns={["employee_name", "violation_type", "date", "description", "resolved"]}
            labels={{ employee_name: "الموظف", violation_type: "النوع", date: "التاريخ", description: "الوصف", resolved: "الحالة" }}
            fields={violationFields}
            renderCell={(col, row) => {
              if (col === "violation_type") return <span className="inline-flex rounded-full px-2 py-1 text-xs bg-red-500/10 text-red-400">{row.violation_type}</span>
              if (col === "resolved") return row.resolved
                ? <span className="inline-flex rounded-full px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400">محلول</span>
                : <span className="inline-flex rounded-full px-2 py-1 text-xs bg-red-500/10 text-red-400">غير محلول</span>
              return <span className="text-zinc-100">{row[col] ?? "-"}</span>
            }}
            filename="المخالفات" />
        </TabsContent>
        <TabsContent value="observed-violations">
          <ViolationsPanel />
        </TabsContent>
        <TabsContent value="trip-evaluation">
          <TripEvaluation />
        </TabsContent>
        <TabsContent value="transport-requests">
          <TransportRequestsTab />
        </TabsContent>
        <TabsContent value="requests-report">
          <RequestsReportTab />
        </TabsContent>
        <TabsContent value="fuel-report">
          <FuelReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
