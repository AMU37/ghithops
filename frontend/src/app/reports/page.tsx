"use client"

import { useState, useEffect } from "react"
import { BarChart3, Truck, Home, Wrench, Sparkles, Sprout, Activity, Clock, Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { aiAPI } from "@/lib/api"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">التقارير والتحليلات</h1>
        <p className="text-sm text-zinc-500 mt-1">إحصائيات وتحليلات متقدمة لجميع أقسام النظام</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="transport">المواصلات</TabsTrigger>
          <TabsTrigger value="housing">السكنات</TabsTrigger>
          <TabsTrigger value="services">الخدمات</TabsTrigger>
          <TabsTrigger value="cleaning">النظافة</TabsTrigger>
          <TabsTrigger value="agriculture">الزراعة</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="transport"><TransportTab /></TabsContent>
        <TabsContent value="housing"><HousingTab /></TabsContent>
        <TabsContent value="services"><ServicesTab /></TabsContent>
        <TabsContent value="cleaning"><CleaningTab /></TabsContent>
        <TabsContent value="agriculture"><AgricultureTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-100">{value ?? "..."}</div>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function OverviewTab() {
  const [data, setData] = useState<any>({})
  useEffect(() => { aiAPI.analytics.overview().then((r) => setData(r.data)) }, [])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="المستخدمين" value={data.users} icon={Users} color="text-blue-400" />
        <StatCard title="رحلات اليوم" value={data.trips_today} icon={Truck} color="text-amber-400" />
        <StatCard title="المركبات النشطة" value={data.active_vehicles} icon={Truck} color="text-green-400" />
        <StatCard title="السائقين المتاحين" value={data.active_drivers} icon={Users} color="text-purple-400" />
        <StatCard title="خطوط السير النشطة" value={data.active_routes} icon={Activity} color="text-cyan-400" />
        <StatCard title="ركاب اليوم" value={data.total_boarded_today} icon={CheckCircle} color="text-emerald-400" />
        <StatCard title="غياب اليوم" value={data.total_absences_today} icon={XCircle} color="text-red-400" />
        <StatCard title="الإشعارات غير المقروءة" value={data.unread_notifications} icon={AlertTriangle} color="text-amber-400" />
      </div>
    </div>
  )
}

function TransportTab() {
  const [data, setData] = useState<any>({})
  const [period, setPeriod] = useState("30")
  useEffect(() => { aiAPI.analytics.transport(period).then((r) => setData(r.data)) }, [period])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <span className="text-sm text-zinc-400">الفترة:</span>
        {["7", "30", "90", "365"].map((d) => (
          <button key={d} onClick={() => setPeriod(d)} className={`rounded-md px-3 py-1 text-sm transition-colors ${period === d ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
            {d === "7" ? "أسبوع" : d === "30" ? "شهر" : d === "90" ? "3 أشهر" : "سنة"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي الرحلات" value={data.total_trips} subtitle={`آخر ${data.period_days} يوم`} icon={Truck} color="text-amber-400" />
        <StatCard title="الرحلات المكتملة" value={data.completed_trips} icon={CheckCircle} color="text-emerald-400" />
        <StatCard title="الرحلات الملغية" value={data.cancelled_trips} icon={XCircle} color="text-red-400" />
        <StatCard title="نسبة الإنجاز" value={data.completion_rate ? `${data.completion_rate}%` : "0%"} icon={Activity} color="text-blue-400" />
        <StatCard title="المخالفات" value={data.total_violations} subtitle={`تم حل ${data.resolved_violations || 0}`} icon={AlertTriangle} color="text-red-400" />
        <StatCard title="إجمالي الركوب" value={data.total_boardings} icon={Users} color="text-green-400" />
      </div>
    </div>
  )
}

function HousingTab() {
  const [data, setData] = useState<any>({})
  useEffect(() => { aiAPI.analytics.housing().then((r) => setData(r.data)) }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="المباني" value={data.buildings} icon={Home} color="text-indigo-400" />
      <StatCard title="إجمالي الغرف" value={data.total_rooms} icon={Home} color="text-purple-400" />
      <StatCard title="الغرف المشغولة" value={data.occupied_rooms} icon={Users} color="text-amber-400" />
      <StatCard title="الغرف المتاحة" value={data.available_rooms} icon={CheckCircle} color="text-emerald-400" />
      <StatCard title="نسبة الإشغال" value={data.occupancy_rate ? `${data.occupancy_rate}%` : "0%"} icon={BarChart3} color="text-cyan-400" />
      <StatCard title="المقيمين حالياً" value={data.active_occupants} icon={Users} color="text-blue-400" />
    </div>
  )
}

function ServicesTab() {
  const [data, setData] = useState<any>({})
  useEffect(() => { aiAPI.analytics.services().then((r) => setData(r.data)) }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="إجمالي الطلبات" value={data.total_requests} icon={Wrench} color="text-cyan-400" />
      <StatCard title="قيد الانتظار" value={data.pending} icon={Clock} color="text-amber-400" />
      <StatCard title="قيد التنفيذ" value={data.in_progress} icon={Activity} color="text-blue-400" />
      <StatCard title="مكتملة" value={data.completed} icon={CheckCircle} color="text-emerald-400" />
      <StatCard title="طلبات عاجلة" value={data.urgent} icon={AlertTriangle} color="text-red-400" />
      <StatCard title="أوامر عمل نشطة" value={data.active_work_orders} icon={Wrench} color="text-purple-400" />
    </div>
  )
}

function CleaningTab() {
  const [data, setData] = useState<any>({})
  useEffect(() => { aiAPI.analytics.cleaning().then((r) => setData(r.data)) }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="إجمالي المهام" value={data.total_tasks} icon={Sparkles} color="text-pink-400" />
      <StatCard title="قيد الانتظار" value={data.pending} icon={Clock} color="text-amber-400" />
      <StatCard title="قيد التنفيذ" value={data.in_progress} icon={Activity} color="text-blue-400" />
      <StatCard title="مكتملة" value={data.completed} icon={CheckCircle} color="text-emerald-400" />
      <StatCard title="عدد التفتيشات" value={data.total_inspections} icon={ClipboardIcon} color="text-purple-400" />
      <StatCard title="متوسط النتيجة" value={data.average_score} icon={BarChart3} color="text-cyan-400" />
    </div>
  )
}

function ClipboardIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>}

function AgricultureTab() {
  const [data, setData] = useState<any>({})
  useEffect(() => { aiAPI.analytics.agriculture().then((r) => setData(r.data)) }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard title="المزارع" value={data.farms} icon={Sprout} color="text-emerald-400" />
      <StatCard title="المحاصيل" value={data.crops} icon={Sprout} color="text-lime-400" />
      <StatCard title="خطط الري" value={data.irrigation_plans} icon={Activity} color="text-cyan-400" />
    </div>
  )
}
