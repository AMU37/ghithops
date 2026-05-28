"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, Truck, Home, Wrench, Sparkles, Sprout, Activity, Bell, Bed, Bus, ClipboardList, AlertTriangle, Gauge, Ban, Clock, CheckCircle, XCircle, Fuel, MapPin, FileText, UserCheck, Route, Map, Lightbulb, Star, AlertOctagon, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { companiesAPI, usersAPI } from "@/lib/api"
import api from "@/lib/api"

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار", manager_pending: "بانتظار المدير", in_progress: "تحت التنفيذ",
  completed: "مكتملة", rejected: "مرفوضة",
}
const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400", manager_pending: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-400", completed: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    companies: 0, users: 0,
    vehicles: 0, drivers: 0, routes: 0, trips_today: 0,
    buildings: 0, rooms: 0,
    service_requests: 0, technicians: 0,
    cleaning_tasks: 0, teams: 0,
    farms: 0, crops: 0,
  })
  const [transportRequests, setTransportRequests] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [todayTrips, setTodayTrips] = useState<any[]>([])
  const [allTrips, setAllTrips] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [shiftTypes, setShiftTypes] = useState<any[]>([])
  const [assemblyPoints, setAssemblyPoints] = useState<any[]>([])
  const [vehiclesList, setVehiclesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState("")
  const [department, setDepartment] = useState("")

  const today = new Date().toLocaleDateString("en-CA")
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA")
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA")

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const r = user.role || ""
      const d = user.department_name || ""
      setRole(r)
      setDepartment(d)
      if (r === "service_requester" || d === "الطلبات") {
        router.replace("/requests")
      }
    } catch {}
  }, [])

  useEffect(() => {
    Promise.all([
      companiesAPI.list().then((r) => r.data.results || r.data).catch(() => []),
      usersAPI.list().then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/vehicles/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/drivers/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/routes/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/trips/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/housing/buildings/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/housing/rooms/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/services/requests/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/services/technicians/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/cleaning/tasks/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/cleaning/teams/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/agriculture/farms/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/agriculture/crops/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/requests/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/violations/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/employee-infos/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/shift-types/").then((r) => r.data.results || r.data).catch(() => []),
      api.get("/transport/assembly-points/").then((r) => r.data.results || r.data).catch(() => []),
    ]).then(([companies, users, vehicles, drivers, routes, trips, buildings, rooms, sreqs, techs, ctasks, cteams, farms, crops, trequests, viols, emps, shifts, aps]) => {
      const vlist = Array.isArray(vehicles) ? vehicles : []
      const tripsData = Array.isArray(trips) ? trips : []
      setStats({
        companies: Array.isArray(companies) ? companies.length : 0,
        users: Array.isArray(users) ? users.length : 0,
        vehicles: vlist.length,
        drivers: Array.isArray(drivers) ? drivers.length : 0,
        routes: Array.isArray(routes) ? routes.length : 0,
        trips_today: tripsData.filter((t: any) => (t.trip_date || "").startsWith(today)).length,
        buildings: Array.isArray(buildings) ? buildings.length : 0,
        rooms: Array.isArray(rooms) ? rooms.length : 0,
        service_requests: Array.isArray(sreqs) ? sreqs.length : 0,
        technicians: Array.isArray(techs) ? techs.length : 0,
        cleaning_tasks: Array.isArray(ctasks) ? ctasks.length : 0,
        teams: Array.isArray(cteams) ? cteams.length : 0,
        farms: Array.isArray(farms) ? farms.length : 0,
        crops: Array.isArray(crops) ? crops.length : 0,
      })
      setTransportRequests(Array.isArray(trequests) ? trequests : [])
      setViolations(Array.isArray(viols) ? viols : [])
      setAllTrips(tripsData)
      setTodayTrips(tripsData.filter((t: any) => (t.trip_date || "").startsWith(today)))
      setEmployees(Array.isArray(emps) ? emps : [])
      setShiftTypes(Array.isArray(shifts) ? shifts : [])
      setAssemblyPoints(Array.isArray(aps) ? aps : [])
      setVehiclesList(vlist)
    }).finally(() => setLoading(false))
  }, [])

  const completedRequests = transportRequests.filter((r) => r.status === "completed")
  const tfuel_total = completedRequests.reduce((s, r) => s + (parseFloat(r.fuel_consumed) || 0), 0) + allTrips.filter(t => t.status === "completed").reduce((s, t) => s + (parseFloat(t.fuel_consumed) || 0), 0)
  const tdist = completedRequests.reduce((s, r) => s + (parseFloat(r.distance_traveled) || 0), 0)
  const activeRequests = transportRequests.filter((r) => r.status === "in_progress").length
  const pendingRequests = transportRequests.filter((r) => r.status === "pending").length
  const managerPendingRequests = transportRequests.filter((r) => r.status === "manager_pending").length

  const vehicleBreakdown: Record<string, number> = {}
  vehiclesList.forEach((v) => { const t = v.vehicle_type || "أخرى"; vehicleBreakdown[t] = (vehicleBreakdown[t] || 0) + 1 })

  // Fuel by vehicle (trips + requests)
  const vehicleFuel: { bus: string; plate: string; fuel: number; trips: number; requests: number }[] = useMemo(() => {
    const map: Record<string, { bus: string; plate: string; fuel: number; trips: number; requests: number }> = {}
    allTrips.filter(t => t.status === "completed" && t.fuel_consumed).forEach(t => {
      const key = t.vehicle_id || t.vehicle || "unknown"
      if (!map[key]) map[key] = { bus: t.vehicle_plate || t.vehicle || "-", plate: t.vehicle_plate || "-", fuel: 0, trips: 0, requests: 0 }
      map[key].fuel += parseFloat(t.fuel_consumed) || 0
      map[key].trips++
    })
    completedRequests.filter(r => r.fuel_consumed && r.assigned_vehicle).forEach(r => {
      const key = r.assigned_vehicle_id || r.assigned_vehicle || "unknown"
      if (!map[key]) map[key] = { bus: r.assigned_vehicle_plate || r.assigned_vehicle || "-", plate: r.assigned_vehicle_plate || "-", fuel: 0, trips: 0, requests: 0 }
      map[key].fuel += parseFloat(r.fuel_consumed) || 0
      map[key].requests++
    })
    return Object.values(map).sort((a, b) => b.fuel - a.fuel)
  }, [allTrips, completedRequests])

  // Today trip status counts
  const todayStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { completed: 0, in_progress: 0, scheduled: 0, cancelled: 0, other: 0 }
    todayTrips.forEach(t => { if (t.status in counts) counts[t.status]++; else counts.other++ })
    return counts
  }, [todayTrips])

  // Ride-log computed violations (from all trips, not just today)
  const rideLogViolations = useMemo(() => {
    const empMap: Record<string, { plannedTripIds: Set<string>; boardedTripIds: Set<string> }> = {}
    // First pass: build empMap across all trips
    allTrips.forEach(t => {
      ;(t.riders || []).forEach((r: any) => {
        if (!empMap[r.employee_id]) {
          empMap[r.employee_id] = { plannedTripIds: new Set(), boardedTripIds: new Set() }
        }
        const entry = empMap[r.employee_id]
        if (r.action === 'assigned') entry.plannedTripIds.add(t.id)
        if (r.action === 'board') entry.boardedTripIds.add(t.id)
      })
    })
    // Second pass: classify each non-matching boarder per trip
    const violators: { employee_id: string; employee_name: string; department: string; type: string; label: string; detail: string; tripId: string; route: string; date: string }[] = []
    allTrips.forEach(t => {
      ;(t.riders || []).forEach((r: any) => {
        if (r.action !== 'board') return
        if (r.was_assigned) return // مطابق
        const isManualOrTemp = /^(TEMP-|MANUAL-)/.test(String(r.employee_id))
        if (isManualOrTemp) {
          violators.push({
            employee_id: r.employee_id,
            employee_name: r.employee_name || r.employee_id,
            department: r.department || "",
            type: 'manual_add',
            label: 'مضاف يدوي',
            detail: 'إضافة يدوية',
            tripId: t.id,
            route: t.route_name || t.route || "-",
            date: t.trip_date || "",
          })
          return
        }
        const entry = empMap[r.employee_id]
        if (entry && entry.plannedTripIds.size > 0) {
          violators.push({
            employee_id: r.employee_id,
            employee_name: r.employee_name || r.employee_id,
            department: r.department || "",
            type: 'from_other_line',
            label: 'من خط آخر',
            detail: 'مخطط على خط آخر',
            tripId: t.id,
            route: t.route_name || t.route || "-",
            date: t.trip_date || "",
          })
        } else {
          violators.push({
            employee_id: r.employee_id,
            employee_name: r.employee_name || r.employee_id,
            department: r.department || "",
            type: 'violator',
            label: 'مخالف',
            detail: 'بدون تخطيط مسبق',
            tripId: t.id,
            route: t.route_name || t.route || "-",
            date: t.trip_date || "",
          })
        }
      })
    })
    // deduplicate by employee per trip
    const seen = new Set<string>()
    return violators.filter(v => {
      const key = `${v.employee_id}|${v.tripId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [allTrips])

  const rideLogViolationCount = rideLogViolations.length
  const unresolvedViolations = violations.filter((v) => !v.resolved).length + rideLogViolationCount

  // Evaluations for recent completed trips
  const recentEvals = useMemo(() => {
    const completed = allTrips.filter(t => t.status === 'completed').slice(-20)
    const empMap: Record<string, { plannedTripIds: Set<string>; boardedTripIds: Set<string> }> = {}
    completed.forEach(t => {
      ;(t.riders || []).forEach((r: any) => {
        if (!empMap[r.employee_id]) empMap[r.employee_id] = { plannedTripIds: new Set(), boardedTripIds: new Set() }
        const entry = empMap[r.employee_id]
        if (r.action === 'assigned') entry.plannedTripIds.add(t.id)
        if (r.action === 'board') entry.boardedTripIds.add(t.id)
      })
    })
    return completed.map((t: any) => {
      const boardRiders = (t.riders || []).filter((r: any) => r.action === 'board')
      const plannedRiders = (t.riders || []).filter((r: any) => r.action === 'assigned')
      const boarded = boardRiders.length
      const planned = plannedRiders.length
      const absentCount = plannedRiders.filter((r: any) => !boardRiders.find((b: any) => b.employee_id === r.employee_id)).length
      const matched = boardRiders.filter((b: any) => b.was_assigned).length
      const fromOtherLine = boardRiders.filter((b: any) => !b.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(b.employee_id))).filter((b: any) => { const e = empMap[b.employee_id]; return e && e.plannedTripIds.size > 0 }).length
      const manualAdd = boardRiders.filter((b: any) => /^(TEMP-|MANUAL-)/.test(String(b.employee_id))).length
      const violators = boardRiders.filter((b: any) => !b.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(b.employee_id))).filter((b: any) => { const e = empMap[b.employee_id]; return !e || e.plannedTripIds.size === 0 }).length

      let delayMin = 0
      if (t.return_time && t.completed_at) {
        const [rh, rm] = t.return_time.split(":").map(Number)
        const expectedEnd = rh * 60 + rm
        const comp = new Date(t.completed_at)
        const actualEnd = comp.getHours() * 60 + comp.getMinutes()
        delayMin = Math.max(0, actualEnd - expectedEnd)
      }

      let score = 100
      if (violators > 0) score -= violators * 10
      if (delayMin > 5) score -= Math.min(30, Math.floor((delayMin - 5) / 5) * 5)
      if (absentCount > 0 && planned > 0) score -= Math.min(20, Math.round((absentCount / planned) * 40))
      if (fromOtherLine > 0) score -= Math.min(10, fromOtherLine * 5)
      if (boarded > 0) { const cap = Math.min(t.vehicle_capacity || 30, 30); if (boarded > cap) score -= 15 }
      score = Math.max(0, score)

      const grade = score >= 90 ? 'ممتاز' : score >= 75 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف'
      const gradeColor = score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-blue-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
      return { id: t.id, route: t.route_name || t.route || "-", date: t.trip_date || "", score, grade, gradeColor, delayMin, matched, fromOtherLine, manualAdd, violators, absentCount, boarded, planned }
    }).sort((a: any, b: any) => b.date.localeCompare(a.date) || a.route.localeCompare(b.route))
  }, [allTrips])

  const avgScore = recentEvals.length ? Math.round(recentEvals.reduce((s, r) => s + r.score, 0) / recentEvals.length) : 0
  const delayedTrips = recentEvals.filter((r: any) => r.delayMin > 5)
  const delayedCount = delayedTrips.length

  // Today's trips enriched with evaluation data
  const todayEvalTrips = useMemo(() => {
    const empMap: Record<string, { plannedTripIds: Set<string>; boardedTripIds: Set<string> }> = {}
    todayTrips.forEach(t => {
      ;(t.riders || []).forEach((r: any) => {
        if (!empMap[r.employee_id]) empMap[r.employee_id] = { plannedTripIds: new Set(), boardedTripIds: new Set() }
        const entry = empMap[r.employee_id]
        if (r.action === 'assigned') entry.plannedTripIds.add(t.id)
        if (r.action === 'board') entry.boardedTripIds.add(t.id)
      })
    })
    return todayTrips.map((t: any) => {
      const boardRiders = (t.riders || []).filter((r: any) => r.action === 'board')
      const plannedRiders = (t.riders || []).filter((r: any) => r.action === 'assigned')
      const boarded = boardRiders.length
      const planned = plannedRiders.length
      const capacity = Math.min(t.vehicle_capacity || 30, 30)
      const pct = capacity > 0 ? Math.round((boarded / capacity) * 100) : 0
      const absentCount = plannedRiders.filter((r: any) => !boardRiders.find((b: any) => b.employee_id === r.employee_id)).length
      const matched = boardRiders.filter((b: any) => b.was_assigned).length
      const fromOtherLine = boardRiders.filter((b: any) => !b.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(b.employee_id))).filter((b: any) => { const e = empMap[b.employee_id]; return e && e.plannedTripIds.size > 0 }).length
      const manualAdd = boardRiders.filter((b: any) => /^(TEMP-|MANUAL-)/.test(String(b.employee_id))).length
      const violators = boardRiders.filter((b: any) => !b.was_assigned && !/^(TEMP-|MANUAL-)/.test(String(b.employee_id))).filter((b: any) => { const e = empMap[b.employee_id]; return !e || e.plannedTripIds.size === 0 }).length

      let delayMin = 0
      if (t.return_time && t.completed_at) {
        const [rh, rm] = t.return_time.split(":").map(Number)
        const expectedEnd = rh * 60 + rm
        const comp = new Date(t.completed_at)
        const actualEnd = comp.getHours() * 60 + comp.getMinutes()
        delayMin = Math.max(0, actualEnd - expectedEnd)
      }

      let score = -1
      let grade = '-'
      let gradeColor = 'text-zinc-500'
      if (t.status === 'completed') {
        score = 100
        if (violators > 0) score -= violators * 10
        if (delayMin > 5) score -= Math.min(30, Math.floor((delayMin - 5) / 5) * 5)
        if (absentCount > 0 && planned > 0) score -= Math.min(20, Math.round((absentCount / planned) * 40))
        if (fromOtherLine > 0) score -= Math.min(10, fromOtherLine * 5)
        if (boarded > capacity) score -= 15
        score = Math.max(0, score)
        grade = score >= 90 ? 'ممتاز' : score >= 75 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف'
        gradeColor = score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-blue-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
      }
      return { id: t.id, route: t.route_name || t.route || "-", status: t.status, vehicle_plate: t.vehicle_plate || "-", driver_name: t.driver_name || "-", capacity, boarded, pct, score, grade, gradeColor, delayMin, matched, fromOtherLine, manualAdd, violators, absentCount }
    })
  }, [todayTrips])

  // Chart toggle
  const [fuelChartMode, setFuelChartMode] = useState<"time" | "vehicle">("vehicle")

  // Fuel chart data (time-based)
  const [fuelPeriod, setFuelPeriod] = useState<"day" | "week" | "month">("day")

  const fuelChartData = useMemo(() => {
    const allCompleted = [
      ...transportRequests.filter((r) => r.status === "completed" && r.fuel_consumed && parseFloat(r.fuel_consumed) > 0),
      ...allTrips.filter((t) => t.status === "completed" && t.fuel_consumed && parseFloat(t.fuel_consumed) > 0),
    ]
    const grouped: Record<string, { fuel: number; count: number }> = {}

    allCompleted.forEach((item: any) => {
      let key: string
      const d = new Date(item.request_date || item.trip_date || item.created_at)
      if (fuelPeriod === "day") key = d.toLocaleDateString("en-CA")
      else if (fuelPeriod === "week") {
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        key = weekStart.toLocaleDateString("en-CA")
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      }
      if (!grouped[key]) grouped[key] = { fuel: 0, count: 0 }
      grouped[key].fuel += parseFloat(item.fuel_consumed) || 0
      grouped[key].count++
    })

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([label, data]) => ({
      label,
      "الوقود (لتر)": Math.round(data.fuel * 100) / 100,
    }))
  }, [transportRequests, allTrips, fuelPeriod])

  // Daily notes generation
  const dailyNotes = useMemo(() => {
    const notes: { icon: any; color: string; text: string; priority: "high" | "medium" | "low" }[] = []

    // Unresolved violations
    violations.filter((v) => !v.resolved).forEach((v) => {
      notes.push({
        icon: AlertTriangle, color: "text-red-400", priority: "high",
        text: `مخالفة غير محلولة: ${v.employee_name || v.employee_id} - ${v.violation_type}`,
      })
    })

    // In_progress transport requests past expected time
    transportRequests.filter((r) => r.status === "in_progress").forEach((r) => {
      notes.push({
        icon: ClipboardList, color: "text-purple-400", priority: "high",
        text: `طلب قيد التنفيذ لم يكتمل: ${r.employee_name} - ${r.purpose}`,
      })
    })

    // Trips still in_progress from yesterday or early today
    const now = new Date()
    allTrips.filter((t) => t.status === "in_progress").forEach((t) => {
      const depTime = t.departure_time ? t.departure_time.slice(0, 5) : "-"
      const tripDate = t.trip_date || ""
      if (tripDate < today || (tripDate === today && depTime < "12:00")) {
        notes.push({
          icon: Clock, color: "text-amber-400", priority: "high",
          text: `رحلة غير مغلقة: ${t.route_name || t.route || "-"} (${tripDate} ${depTime}) للمركبة ${t.vehicle_plate || "-"}`,
        })
      }
    })

    // Pending requests
    pendingRequests > 0 && notes.push({
      icon: ClipboardList, color: "text-amber-400", priority: "high",
      text: `يوجد ${pendingRequests} طلب${pendingRequests > 1 ? "ات" : ""} بانتظار المراجعة`,
    })
    managerPendingRequests > 0 && notes.push({
      icon: Ban, color: "text-blue-400", priority: "high",
      text: `يوجد ${managerPendingRequests} طلب${managerPendingRequests > 1 ? "ات" : ""} بانتظار اعتماد المدير`,
    })

    // Ride log non-matching cases
    if (rideLogViolationCount > 0) {
      const byType: Record<string, number> = {}
      rideLogViolations.forEach(v => { byType[v.label] = (byType[v.label] || 0) + 1 })
      const parts = Object.entries(byType).map(([label, count]) => `${count} ${label}`)
      notes.push({
        icon: AlertTriangle, color: "text-red-400", priority: "high",
        text: `حالات غير مطابقة في سجل الركوب: ${parts.join("، ")}. يوصى بمراجعة البيانات.`,
      })
    }

    // Delayed trips
    if (delayedCount > 0) {
      notes.push({
        icon: Clock, color: "text-red-400", priority: "high",
        text: `يوجد ${delayedCount} رحلة${delayedCount > 1 ? "ات" : ""} متأخرة عن زمن العودة. يوصى بمتابعة السائقين.`,
      })
    }

    // Low evaluation average
    if (recentEvals.length > 0 && avgScore < 75) {
      notes.push({
        icon: Star, color: avgScore < 50 ? "text-red-400" : "text-amber-400", priority: "medium",
        text: `معدل تقييم الرحلات منخفض (${avgScore})، يوصى بمراجعة أداء السائقين والالتزام بالمواعيد.`,
      })
    }

    // Late scheduled trips today
    const nowHour = now.getHours() * 60 + now.getMinutes()
    todayTrips.filter((t) => t.status === "scheduled").forEach((t) => {
      const depParts = (t.departure_time || "").split(":")
      if (depParts.length >= 2) {
        const depMin = parseInt(depParts[0]) * 60 + parseInt(depParts[1])
        if (depMin < nowHour - 30) {
          notes.push({
            icon: AlertOctagon, color: "text-red-400", priority: "high",
            text: `رحلة متأخرة: ${t.route_name || "-"} مقررة ${t.departure_time.slice(0, 5)}`,
          })
        }
      }
    })

    // Yesterday's incomplete trips
    const yesterdayTrips = allTrips.filter((t) => (t.trip_date || "").startsWith(yesterday) && t.status !== "completed")
    yesterdayTrips.forEach((t) => {
      notes.push({
        icon: AlertOctagon, color: "text-red-400", priority: "high",
        text: `رحلة أمس غير مكتملة: ${t.route_name || "-"} (${t.status === "cancelled" ? "ملغية" : t.status === "in_progress" ? "لم تغلق" : t.status})`,
      })
    })

    // Vehicles in maintenance
    vehiclesList.filter((v) => v.status === "maintenance").forEach((v) => {
      notes.push({
        icon: Truck, color: "text-amber-400", priority: "medium",
        text: `مركبة في الصيانة: ${v.plate_number} - ${v.model || ""}`,
      })
    })

    // Tomorrow's scheduled trips
    const tomorrowTrips = allTrips.filter((t) => (t.trip_date || "").startsWith(tomorrow))
    if (tomorrowTrips.length > 0) {
      notes.push({
        icon: Gauge, color: "text-cyan-400", priority: "low",
        text: `غداً ${tomorrowTrips.length} رحلة${tomorrowTrips.length > 1 ? "ات" : ""} مجدولة. تأكد من جاهزية المركبات والسائقين.`,
      })
    }

    // Today completion rate
    const completedToday = todayTrips.filter((t) => t.status === "completed").length
    if (todayTrips.length > 0 && completedToday < todayTrips.length) {
      notes.push({
        icon: Activity, color: completedToday === 0 ? "text-red-400" : "text-amber-400", priority: "medium",
        text: `اليوم: ${completedToday}/${todayTrips.length} رحلات مكتملة`,
      })
    }

    if (notes.length === 0) {
      notes.push({
        icon: CheckCircle, color: "text-emerald-400", priority: "low",
        text: "لا توجد ملاحظات. كل شيء على ما يرام.",
      })
    }

    return notes.sort((a, b) => a.priority === "high" ? -1 : b.priority === "high" ? 1 : a.priority === "medium" ? -1 : 1)
  }, [violations, allTrips, todayTrips, transportRequests, vehiclesList, today, yesterday, tomorrow, rideLogViolationCount, unresolvedViolations, delayedCount, avgScore])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">لوحة التحكم</h1>
        <p className="text-sm text-zinc-500 mt-1">نظرة عامة على النظام</p>
      </div>

      {/* Row 1: Main stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "المركبات", value: stats.vehicles, icon: Truck, color: "text-amber-400" },
          { title: "السائقين", value: stats.drivers, icon: Users, color: "text-purple-400" },
          { title: "خطوط السير", value: stats.routes, icon: Route, color: "text-cyan-400" },
          { title: "رحلات اليوم", value: stats.trips_today, icon: Activity, color: "text-pink-400" },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-100">{loading ? "..." : stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Row 2: Daily Notes (moved to the top) */}
      <Card className="border-amber-700/30 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            ملاحظات يومية — تنبيهات وإرشادات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-zinc-500">جاري التحميل...</p>
          ) : (
            <div className="space-y-2">
              {dailyNotes.map((note, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                  note.priority === "high"
                    ? "border-red-900/40 bg-red-950/10"
                    : note.priority === "medium"
                    ? "border-amber-900/30 bg-amber-950/10"
                    : "border-zinc-800 bg-zinc-900/30"
                }`}>
                  <note.icon className={`h-5 w-5 mt-0.5 shrink-0 ${note.color}`} />
                  <span className="text-zinc-300">{note.text}</span>
                  {note.priority === "high" && (
                    <span className="mr-auto shrink-0 text-[9px] text-red-500 rounded-full bg-red-950/50 px-2 py-0.5">ضروري</span>
                  )}
                  {note.priority === "medium" && (
                    <span className="mr-auto shrink-0 text-[9px] text-amber-500 rounded-full bg-amber-950/50 px-2 py-0.5">مهم</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-3 text-[10px] text-zinc-600 border-t border-zinc-800 pt-2">
            <span>الأمس ({yesterday})</span>
            <span>اليوم ({today})</span>
            <span>غداً ({tomorrow})</span>
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Combined transport (operations + fleet) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
            <Bus className="h-5 w-5 text-amber-400" />
            نظرة سريعة على المواصلات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-xs text-zinc-500 font-medium mb-2">العمليات</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { title: "بانتظار المشرف", value: pendingRequests, icon: Clock, color: "text-amber-400", bg: "bg-amber-950/20" },
                  { title: "بانتظار المدير", value: managerPendingRequests, icon: Ban, color: "text-blue-400", bg: "bg-blue-950/20" },
                  { title: "قيد التنفيذ", value: activeRequests, icon: Activity, color: "text-purple-400", bg: "bg-purple-950/20" },
                  { title: "مكتملة", value: completedRequests.length, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-950/20" },
                  { title: "الوقود المستهلك", value: tfuel_total > 0 ? `${tfuel_total.toFixed(1)} لتر` : "-", icon: Fuel, color: "text-emerald-400", bg: "bg-emerald-950/10" },
                  { title: "المسافة", value: tdist > 0 ? `${tdist.toFixed(1)} كم` : "-", icon: MapPin, color: "text-cyan-400", bg: "bg-cyan-950/10" },
                  { title: "مخالفات غير محلولة", value: unresolvedViolations, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-950/20" },
                  { title: "إجمالي الطلبات", value: transportRequests.length, icon: ClipboardList, color: "text-zinc-100", bg: "bg-zinc-800/30" },
                ].map((s) => (
                  <div key={s.title} className={`${s.bg} border border-zinc-800 rounded-lg py-2 px-2 text-center`}>
                    <s.icon className={`h-4 w-4 mx-auto ${s.color}`} />
                    <p className="text-sm font-bold text-zinc-100 mt-0.5">{s.value}</p>
                    <p className="text-[9px] text-zinc-500 truncate">{s.title}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs text-zinc-500 font-medium mb-2">الأسطول والموارد</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {[
                  { title: "موظفين", value: employees.length, icon: UserCheck, color: "text-zinc-100" },
                  { title: "سائقين", value: stats.drivers, icon: Users, color: "text-purple-400" },
                  { title: "مركبات", value: stats.vehicles, icon: Truck, color: "text-amber-400" },
                  { title: "دوام", value: shiftTypes.length, icon: Clock, color: "text-green-400" },
                  { title: "خطوط", value: stats.routes, icon: Route, color: "text-cyan-400" },
                  { title: "تجمع", value: assemblyPoints.length, icon: Map, color: "text-pink-400" },
                ].map((s) => (
                  <div key={s.title} className="bg-zinc-900/30 border border-zinc-800 rounded-lg py-2 px-1 text-center">
                    <s.icon className={`h-4 w-4 mx-auto ${s.color}`} />
                    <p className="text-sm font-bold text-zinc-100 mt-0.5">{loading ? "..." : s.value}</p>
                    <p className="text-[9px] text-zinc-500 truncate">{s.title}</p>
                  </div>
                ))}
              </div>
              {Object.keys(vehicleBreakdown).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-zinc-600 mt-0.5">حسب النوع:</span>
                  {Object.entries(vehicleBreakdown).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                    <span key={type} className="inline-flex items-center gap-1 rounded-full bg-zinc-800/50 px-2 py-0.5 text-[10px] text-zinc-400">
                      <Truck className="h-3 w-3 text-zinc-600" />
                      {type}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 3.5: Today's trip status & vehicle utilization */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              حالة رحلات اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTrips.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">لا توجد رحلات لليوم</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-medium">{todayTrips.length}</span> رحلة إجمالاً
                  <span className="mr-auto text-[10px] text-zinc-600">
                    {todayStatusCounts.completed > 0 && <span className="text-emerald-400">{todayStatusCounts.completed} مكتملة</span>}
                    {todayStatusCounts.in_progress > 0 && <span className="mr-2 text-amber-400">{todayStatusCounts.in_progress} قيد التنفيذ</span>}
                    {todayStatusCounts.scheduled > 0 && <span className="mr-2 text-zinc-400">{todayStatusCounts.scheduled} مجدولة</span>}
                    {todayStatusCounts.cancelled > 0 && <span className="mr-2 text-red-400">{todayStatusCounts.cancelled} ملغية</span>}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                  {todayStatusCounts.completed > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(todayStatusCounts.completed / todayTrips.length) * 100}%` }} title={`مكتملة: ${todayStatusCounts.completed}`} />}
                  {todayStatusCounts.in_progress > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${(todayStatusCounts.in_progress / todayTrips.length) * 100}%` }} title={`قيد التنفيذ: ${todayStatusCounts.in_progress}`} />}
                  {todayStatusCounts.scheduled > 0 && <div className="h-full bg-zinc-500 transition-all" style={{ width: `${(todayStatusCounts.scheduled / todayTrips.length) * 100}%` }} title={`مجدولة: ${todayStatusCounts.scheduled}`} />}
                  {todayStatusCounts.cancelled > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${(todayStatusCounts.cancelled / todayTrips.length) * 100}%` }} title={`ملغية: ${todayStatusCounts.cancelled}`} />}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {todayStatusCounts.completed > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> مكتملة: {todayStatusCounts.completed}</span>}
                  {todayStatusCounts.in_progress > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> قيد التنفيذ: {todayStatusCounts.in_progress}</span>}
                  {todayStatusCounts.scheduled > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" /> مجدولة: {todayStatusCounts.scheduled}</span>}
                  {todayStatusCounts.cancelled > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> ملغية: {todayStatusCounts.cancelled}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-100 flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-400" />
              استخدام المركبات اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTrips.filter(t => t.vehicle_id || t.vehicle).length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">لا توجد مركبات مستخدمة اليوم</p>
            ) : (
              <div className="space-y-1.5">
                {Object.values(todayTrips.filter(t => t.vehicle_id || t.vehicle)
                  .reduce((acc: any, t: any) => { acc[t.vehicle_id || t.vehicle] = t; return acc }, {} as any)
                ).slice(0, 6).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3 w-3 text-zinc-500" />
                      <span className="text-zinc-200">{t.vehicle_plate || t.vehicle || "-"}</span>
                    </div>
                    <div className={`text-[10px] ${t.status === "completed" ? "text-emerald-500" : t.status === "in_progress" ? "text-amber-500" : "text-zinc-500"}`}>
                      {t.route_name || t.route || "-"} — {statusLabels[t.status] || t.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Fuel consumption chart — by vehicle or by period */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            استهلاك الوقود
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setFuelChartMode("vehicle")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                fuelChartMode === "vehicle"
                  ? "bg-amber-600/20 border-amber-600 text-amber-400"
                  : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
              }`}>
              حسب المركبة
            </button>
            <button onClick={() => setFuelChartMode("time")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                fuelChartMode === "time"
                  ? "bg-amber-600/20 border-amber-600 text-amber-400"
                  : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
              }`}>
              حسب الفترة
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {fuelChartMode === "vehicle" ? (
            vehicleFuel.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <Fuel className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                لا توجد بيانات وقود متاحة.
              </div>
            ) : (
              <div className="w-full" style={{ direction: "ltr" }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={vehicleFuel.map(v => ({ name: v.bus, "الوقود (لتر)": Math.round(v.fuel * 100) / 100 }))} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#e4e4e7", fontSize: 12 }} labelStyle={{ color: "#f59e0b" }} />
                    <Legend formatter={(v) => <span style={{ color: "#e4e4e7", fontSize: 12 }}>{v}</span>} />
                    <Bar dataKey="الوقود (لتر)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                  {vehicleFuel.map((v, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-2 text-center">
                      <p className="text-xs text-zinc-300">{v.bus}</p>
                      <p className={`text-sm font-bold ${v.fuel > 0 ? "text-amber-400" : "text-zinc-600"}`}>{v.fuel.toFixed(1)} <span className="text-[9px] font-normal">لتر</span></p>
                      <p className="text-[9px] text-zinc-600">{v.trips} رحلة{v.trips !== 1 ? "ات" : ""} · {v.requests} طلب{v.requests !== 1 ? "ات" : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : fuelChartData.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              <Fuel className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
              لا توجد بيانات وقود متاحة.
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                {(["day", "week", "month"] as const).map((p) => (
                  <button key={p} onClick={() => setFuelPeriod(p)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      fuelPeriod === p
                        ? "bg-amber-600/20 border-amber-600 text-amber-400"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}>
                    {p === "day" ? "يومي" : p === "week" ? "أسبوعي" : "شهري"}
                  </button>
                ))}
              </div>
              <div className="w-full" style={{ direction: "ltr" }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={fuelChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#e4e4e7", fontSize: 12 }} labelStyle={{ color: "#f59e0b" }} />
                    <Legend formatter={(v) => <span style={{ color: "#e4e4e7", fontSize: 12 }}>{v}</span>} />
                    <Bar dataKey="الوقود (لتر)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <p className="text-[10px] text-zinc-600 mt-2 text-center">
            إجمالي الوقود المسجل: {tfuel_total.toFixed(1)} لتر | إجمالي المسافة: {tdist.toFixed(1)} كم
          </p>
        </CardContent>
      </Card>

      {/* Row 4.5: Unified today's trips with evaluation (full width) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-zinc-100 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            رحلات اليوم — التقييم والأداء ({todayEvalTrips.length})
            {todayEvalTrips.length > 0 && (
              <span className="mr-auto flex items-center gap-2 text-xs">
                <span className="text-zinc-500">المعدل:</span>
                <span className={`text-lg font-bold ${avgScore >= 90 ? 'text-emerald-400' : avgScore >= 75 ? 'text-blue-400' : avgScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{avgScore}</span>
                <span className={`text-xs ${avgScore >= 90 ? 'text-emerald-400' : avgScore >= 75 ? 'text-blue-400' : avgScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {avgScore >= 90 ? 'ممتاز' : avgScore >= 75 ? 'جيد' : avgScore >= 50 ? 'متوسط' : 'ضعيف'}
                </span>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          {todayEvalTrips.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-4">لا توجد رحلات اليوم</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-right py-1.5 px-1 font-medium">المسار</th>
                    <th className="text-right py-1.5 px-1 font-medium">المركبة</th>
                    <th className="text-right py-1.5 px-1 font-medium">السائق</th>
                    <th className="text-center py-1.5 px-1 font-medium">السعة</th>
                    <th className="text-center py-1.5 px-1 font-medium">الصاعدون</th>
                    <th className="text-center py-1.5 px-1 font-medium">الانشغال</th>
                    <th className="text-center py-1.5 px-1 font-medium">مطابق</th>
                    <th className="text-center py-1.5 px-1 font-medium">من خط</th>
                    <th className="text-center py-1.5 px-1 font-medium">مضاف</th>
                    <th className="text-center py-1.5 px-1 font-medium">مخالف</th>
                    <th className="text-center py-1.5 px-1 font-medium">غائب</th>
                    <th className="text-center py-1.5 px-1 font-medium">التأخير</th>
                    <th className="text-center py-1.5 px-1 font-medium">التقييم</th>
                    <th className="text-center py-1.5 px-1 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {todayEvalTrips.map((r: any) => (
                    <tr key={r.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/20">
                      <td className="py-1.5 px-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.status === "completed" ? "bg-emerald-500" : r.status === "in_progress" ? "bg-amber-500" : r.status === "cancelled" ? "bg-red-500" : "bg-zinc-600"}`} />
                          <span className="text-zinc-200 truncate">{r.route}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-1 text-zinc-500">{r.vehicle_plate}</td>
                      <td className="py-1.5 px-1 text-zinc-400">{r.driver_name}</td>
                      <td className="py-1.5 px-1 text-center text-zinc-300">{r.capacity}</td>
                      <td className="py-1.5 px-1 text-center text-zinc-300">{r.boarded}</td>
                      <td className={`py-1.5 px-1 text-center font-medium ${r.pct > 100 ? 'text-red-400' : r.pct >= 80 ? 'text-emerald-400' : r.pct >= 50 ? 'text-amber-400' : 'text-zinc-400'}`}>{r.pct}%</td>
                      <td className="py-1.5 px-1 text-center">{r.matched > 0 ? <span className="text-emerald-500">{r.matched}</span> : <span className="text-zinc-700">-</span>}</td>
                      <td className="py-1.5 px-1 text-center">{r.fromOtherLine > 0 ? <span className="text-amber-500">{r.fromOtherLine}</span> : <span className="text-zinc-700">-</span>}</td>
                      <td className="py-1.5 px-1 text-center">{r.manualAdd > 0 ? <span className="text-blue-500">{r.manualAdd}</span> : <span className="text-zinc-700">-</span>}</td>
                      <td className="py-1.5 px-1 text-center">{r.violators > 0 ? <span className="text-red-400">{r.violators}</span> : <span className="text-zinc-700">-</span>}</td>
                      <td className="py-1.5 px-1 text-center">{r.absentCount > 0 ? <span className="text-zinc-500">{r.absentCount}</span> : <span className="text-zinc-700">-</span>}</td>
                      <td className="py-1.5 px-1 text-center">{r.delayMin > 5 ? <span className="text-red-400">{r.delayMin}د</span> : <span className="text-zinc-700">-</span>}</td>
                      <td className="py-1.5 px-1 text-center">
                        {r.status === 'completed' ? (
                          <span className={`inline-flex items-center gap-1 ${r.gradeColor}`}>
                            <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[9px] font-bold ${r.score >= 90 ? 'bg-emerald-950/30' : r.score >= 75 ? 'bg-blue-950/30' : r.score >= 50 ? 'bg-amber-950/30' : 'bg-red-950/30'}`}>{r.score}</span>
                            <span className="text-[9px]">{r.grade}</span>
                          </span>
                        ) : <span className="text-zinc-600">-</span>}
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${r.status === "completed" ? "text-emerald-500 bg-emerald-950/30" : r.status === "in_progress" ? "text-amber-500 bg-amber-950/30" : r.status === "cancelled" ? "text-red-500 bg-red-950/30" : "text-zinc-500 bg-zinc-800/30"}`}>
                          {statusLabels[r.status] || r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 5: Delays + Violations */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              تأخيرات الوصول
              {delayedCount > 0 && <span className="mr-auto text-xs text-red-400">{delayedCount} رحلة متأخرة</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto">
            {delayedTrips.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">لا توجد تأخيرات</p>
            ) : (
              <div className="space-y-1.5">
                {delayedTrips.slice(0, 10).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-zinc-800/30 pb-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-3 w-3 text-red-400 shrink-0" />
                      <span className="text-zinc-200 truncate">{r.route}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] text-red-400 font-medium">{r.delayMin} دقيقة</span>
                      <span className="text-zinc-500 text-[9px]">{r.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              آخر المخالفات ({violations.length + rideLogViolationCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto">
            {violations.length === 0 && rideLogViolationCount === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">لا توجد مخالفات</p>
            ) : (
              <div className="space-y-1.5">
                {rideLogViolations.slice(0, 6).map((v: any, i: number) => (
                  <div key={`rl-${i}`} className="flex items-center justify-between border-b border-zinc-800/30 pb-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${v.type === 'violator' ? 'bg-red-500' : v.type === 'from_other_line' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <span className="text-zinc-200 truncate">{v.employee_name}</span>
                      <span className="text-zinc-600 text-[9px]">({v.route})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        v.type === 'violator' ? 'text-red-400 bg-red-950/30' :
                        v.type === 'from_other_line' ? 'text-amber-400 bg-amber-950/30' :
                        'text-blue-400 bg-blue-950/30'
                      }`}>{v.label}</span>
                      <span className="text-zinc-500 text-[9px]">{v.date}</span>
                    </div>
                  </div>
                ))}
                {violations.slice(0, 10 - Math.min(rideLogViolations.slice(0, 6).length, 6)).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between border-b border-zinc-800/30 pb-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${v.resolved ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span className="text-zinc-200 truncate">{v.employee_name || v.employee_id}</span>
                      <span className="text-zinc-600 text-[9px]">({v.violation_type})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-zinc-500 text-[9px]">{v.date || "-"}</span>
                      {v.resolved && <span className="text-[9px] text-emerald-500">محلولة</span>}
                    </div>
                  </div>
                ))}
                {rideLogViolationCount > 6 && (
                  <p className="text-[10px] text-zinc-500 text-center pt-1">
                    و {rideLogViolationCount - 6} حالات أخرى غير مطابقة
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sections for admin */}
      {role !== "department_user" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">الأقسام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <a href="/transport" className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-800 transition-colors">
                  <Truck className="h-8 w-8 text-amber-400" />
                  <div><p className="text-sm font-medium text-zinc-100">المواصلات</p><p className="text-xs text-zinc-500">{stats.vehicles + stats.drivers + stats.routes} إجمالي | {transportRequests.length} طلب</p></div>
                </a>
                <a href="/housing" className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-800 transition-colors">
                  <Home className="h-8 w-8 text-indigo-400" />
                  <div><p className="text-sm font-medium text-zinc-100">السكنات</p><p className="text-xs text-zinc-500">{stats.buildings + stats.rooms} إجمالي</p></div>
                </a>
                <a href="/services" className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-800 transition-colors">
                  <Wrench className="h-8 w-8 text-cyan-400" />
                  <div><p className="text-sm font-medium text-zinc-100">الخدمات</p><p className="text-xs text-zinc-500">{stats.service_requests + stats.technicians} إجمالي</p></div>
                </a>
                <a href="/cleaning" className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-800 transition-colors">
                  <Sparkles className="h-8 w-8 text-pink-400" />
                  <div><p className="text-sm font-medium text-zinc-100">النظافة</p><p className="text-xs text-zinc-500">{stats.cleaning_tasks + stats.teams} إجمالي</p></div>
                </a>
                <a href="/agriculture" className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-800 transition-colors">
                  <Sprout className="h-8 w-8 text-emerald-400" />
                  <div><p className="text-sm font-medium text-zinc-100">الزراعة</p><p className="text-xs text-zinc-500">{stats.farms + stats.crops} إجمالي</p></div>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
