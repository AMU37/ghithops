"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LogOut, Truck, MapPin, Clock, CalendarDays, Play, CheckCircle, UserPlus, ScanLine } from "lucide-react"
import api from "@/lib/api"

const statusLabels: Record<string, string> = {
  scheduled: "مجدولة", in_progress: "قيد التنفيذ", completed: "مكتملة", cancelled: "ملغية",
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400", in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-400", cancelled: "bg-red-500/10 text-red-400",
}

const manifestStatusColors: Record<string, string> = {
  "مطابق": "bg-emerald-500/10 text-emerald-400",
  "مطابق (استثناء)": "bg-amber-500/10 text-amber-400",
  "لم يصعد": "bg-red-500/10 text-red-400",
  "مضاف": "bg-blue-500/10 text-blue-400",
}

export default function DriverDashboard() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)
  const [manifest, setManifest] = useState<any[]>([])
  const [manifestLoading, setManifestLoading] = useState(false)
  const [boardCode, setBoardCode] = useState("")
  const [boardMsg, setBoardMsg] = useState("")
  const [boardError, setBoardError] = useState("")
  const [notFoundCode, setNotFoundCode] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", position: "", company: "", notes: "" })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("driver") || "{}")
      if (!d.id) { router.push("/driver/login"); return }
      setDriver(d)
      const today = new Date().toISOString().slice(0, 10)
      api.get(`/transport/drivers/${d.id}/schedule/`).then((res) => {
        setTrips(res.data || [])
      }).finally(() => setLoading(false))
    } catch { router.push("/driver/login") }
  }, [])

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("driver")
    router.push("/driver/login")
  }

  const loadManifest = async (trip: any) => {
    setSelectedTrip(trip)
    setManifestLoading(true)
    setBoardCode("")
    setBoardMsg("")
    setBoardError("")
    try {
      const res = await api.get(`/transport/trips/${trip.id}/manifest/`)
      setManifest(res.data.manifest || [])
    } catch { setManifest([]) }
    setManifestLoading(false)
  }

  const updateTripStatus = async (tripId: string, action: string) => {
    await api.post(`/transport/trips/${tripId}/${action}/`)
    const today = new Date().toISOString().slice(0, 10)
    const res = await api.get(`/transport/drivers/${driver.id}/schedule/`)
    setTrips(res.data || [])
    if (selectedTrip?.id === tripId) loadManifest(res.data.find((t: any) => t.id === tripId))
  }

  const handleBoard = async () => {
    if (!boardCode.trim() || !selectedTrip) return
    setBoardError("")
    setBoardMsg("")
    try {
      const res = await api.post("/transport/ride-logs/board_by_code/", {
        trip_id: selectedTrip.id, code: boardCode.trim(), action: "board"
      })
      setBoardMsg(res.data.message || "تم التسجيل")
      setBoardCode("")
      loadManifest(selectedTrip)
    } catch (err: any) {
      if (err?.response?.data?.not_found) {
        setNotFoundCode(err.response.data.code || boardCode.trim())
        setAddForm({ name: "", position: "", company: "", notes: "" })
        setShowAddForm(true)
      } else {
        setBoardError(err?.response?.data?.error || "فشل التسجيل")
      }
    }
  }

  const handleAddManual = async () => {
    if (!addForm.name.trim() || !selectedTrip) return
    setAdding(true)
    try {
      await api.post("/transport/ride-logs/add_manual/", {
        trip_id: selectedTrip.id, name: addForm.name.trim(),
        position: addForm.position.trim(), company: addForm.company.trim(),
        notes: addForm.notes.trim(), action: "board",
      })
      setShowAddForm(false)
      setBoardCode("")
      loadManifest(selectedTrip)
    } catch { setBoardError("فشل إضافة الموظف") }
    setAdding(false)
  }

  const todayTrips = trips.filter(t => t.trip_date === new Date().toISOString().slice(0, 10))

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ direction: "rtl" }}>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6">
        <Truck className="h-5 w-5 text-amber-500" />
        <span className="text-sm font-medium text-zinc-300">لوحة السائق</span>
        <div className="flex-1" />
        <span className="text-sm text-zinc-500">{driver?.name}</span>
        <Button variant="ghost" size="icon" onClick={logout} title="تسجيل خروج">
          <LogOut className="h-4 w-4 text-zinc-400 hover:text-red-400" />
        </Button>
      </header>

      <main className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <CalendarDays className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-sm text-zinc-400">رحلات اليوم</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-zinc-100">{todayTrips.length}</p></CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Play className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-sm text-zinc-400">قيد التنفيذ</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-zinc-100">{trips.filter(t => t.status === "in_progress").length}</p></CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-sm text-zinc-400">مكتملة</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-zinc-100">{trips.filter(t => t.status === "completed").length}</p></CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <MapPin className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-sm text-zinc-400">الكل</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-zinc-100">{trips.length}</p></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-lg text-zinc-100">الرحلات</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-zinc-500 text-center py-4">جاري التحميل...</p>
              : trips.length === 0 ? <p className="text-zinc-500 text-center py-4">لا توجد رحلات</p>
              : <div className="space-y-2">
                  {trips.map((t: any) => (
                    <button key={t.id} onClick={() => loadManifest(t)}
                      className={`w-full text-right rounded-lg border p-3 transition-colors ${
                        selectedTrip?.id === t.id ? "border-amber-500 bg-amber-500/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-zinc-100">{t.route_name || "-"}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusColors[t.status] || "bg-zinc-500/10 text-zinc-400"}`}>{statusLabels[t.status] || t.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span>{t.trip_date}</span>
                        <span>{t.departure_time?.slice(0,5) || "-"} - {t.return_time?.slice(0,5) || "-"}</span>
                        <span>{t.vehicle_plate || "-"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              }
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-zinc-100">
                {selectedTrip ? `كشف الرحلة - ${selectedTrip.route_name || ""}` : "كشف الرحلة"}
              </CardTitle>
              {selectedTrip && selectedTrip.status === "in_progress" && (
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
                        <ScanLine className="h-4 w-4 ml-1" /> تسجيل
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                      <DialogHeader><DialogTitle>{showAddForm ? "إضافة موظف جديد" : "تسجيل صعود موظف"}</DialogTitle></DialogHeader>
                      {showAddForm ? (
                        <div className="space-y-4">
                          <p className="text-sm text-amber-400">الموظف بكود {notFoundCode} غير موجود. قم بإدخال البيانات:</p>
                          <div className="space-y-2">
                            <Label>الاسم <span className="text-red-400">*</span></Label>
                            <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                              className="bg-zinc-900 border-zinc-700 text-zinc-100" autoFocus />
                          </div>
                          <div className="space-y-2">
                            <Label>الوظيفة</Label>
                            <Input value={addForm.position} onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                              className="bg-zinc-900 border-zinc-700 text-zinc-100" />
                          </div>
                          <div className="space-y-2">
                            <Label>القسم / الجهة</Label>
                            <Input value={addForm.company} onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
                              className="bg-zinc-900 border-zinc-700 text-zinc-100" />
                          </div>
                          <div className="space-y-2">
                            <Label>الغرض من الصعود</Label>
                            <Input value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                              className="bg-zinc-900 border-zinc-700 text-zinc-100" />
                          </div>
                          {boardError && <p className="text-sm text-red-400">{boardError}</p>}
                          <div className="flex gap-2">
                            <Button onClick={handleAddManual} disabled={adding || !addForm.name.trim()} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black">
                              {adding ? "جاري..." : "إضافة وتسجيل"}
                            </Button>
                            <Button variant="outline" onClick={() => { setShowAddForm(false); setBoardError("") }} className="border-zinc-700 text-zinc-300">
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>كود الموظف</Label>
                            <Input value={boardCode} onChange={(e) => setBoardCode(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleBoard()}
                              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-center text-lg" autoFocus />
                          </div>
                          {boardMsg && <p className="text-sm text-emerald-400">{boardMsg}</p>}
                          {boardError && <p className="text-sm text-red-400">{boardError}</p>}
                          <Button onClick={handleBoard} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
                            تسجيل
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedTrip ? (
                <p className="text-zinc-500 text-center py-4">اختر رحلة من القائمة</p>
              ) : manifestLoading ? (
                <p className="text-zinc-500 text-center py-4">جاري التحميل...</p>
              ) : manifest.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">لا يوجد موظفون في هذه الرحلة</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {manifest.map((m: any) => (
                    <div key={m.employee_id} className={`rounded-lg border p-3 ${
                      m.is_boarded ? "border-emerald-800 bg-emerald-950/10" : "border-zinc-800 bg-zinc-950"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-zinc-100">{m.employee_name}</span>
                          <span className="text-xs text-zinc-500 mr-2">{m.employee_id}</span>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${manifestStatusColors[m.status] || "bg-zinc-500/10 text-zinc-400"}`}>
                          {m.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span>{m.department}</span>
                        {m.shift_type_name && <span>{m.shift_type_name}</span>}
                        {m.cycle && <span className={`inline-flex rounded-full px-1.5 py-0.5 ${m.cycle.color === "success" ? "bg-emerald-500/10 text-emerald-400" : m.cycle.color === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                          {m.cycle.label} ({m.cycle.position})
                        </span>}
                        {m.arrival_time && <span>وصول: {m.arrival_time}</span>}
                        {m.route_mismatch && <span className="text-amber-400">تباين مسار: {m.original_route}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedTrip && (
                <div className="flex gap-2 mt-4">
                  {selectedTrip.status === "scheduled" && (
                    <Button size="sm" onClick={() => updateTripStatus(selectedTrip.id, "start")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Play className="h-4 w-4 ml-1" /> بدء الرحلة
                    </Button>
                  )}
                  {selectedTrip.status === "in_progress" && !selectedTrip.driver_completed && (
                    <Button size="sm" onClick={() => updateTripStatus(selectedTrip.id, "complete")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="h-4 w-4 ml-1" /> إنهاء الرحلة
                    </Button>
                  )}
                  {selectedTrip.status === "in_progress" && selectedTrip.driver_completed && (
                    <span className="text-emerald-400 text-sm flex items-center gap-1"><CheckCircle className="h-4 w-4" /> تم إنهاء الرحلة - بانتظار المشرف</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
