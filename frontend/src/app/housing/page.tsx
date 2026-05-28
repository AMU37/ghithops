"use client"

import CrudDataTable, { CrudField } from "@/components/ui/crud-data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400", available: "bg-emerald-500/10 text-emerald-400",
  occupied: "bg-amber-500/10 text-amber-400", maintenance: "bg-red-500/10 text-red-400",
  inactive: "bg-red-500/10 text-red-400", pending: "bg-amber-500/10 text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-400", rejected: "bg-red-500/10 text-red-400",
  completed: "bg-emerald-500/10 text-emerald-400",
}
const statusLabels: Record<string, string> = {
  active: "نشط", available: "متاح", occupied: "مشغول", maintenance: "صيانة",
  inactive: "غير نشط", pending: "قيد الانتظار", approved: "تمت الموافقة",
  rejected: "مرفوض", completed: "مكتمل",
}

function renderCell(col: string, row: any) {
  if (col === "status") {
    const val = row[col]
    const color = statusColors[val] || "bg-zinc-500/10 text-zinc-400"
    return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${color}`}>{statusLabels[val] || val || "-"}</span>
  }
  if (col === "check_in" || col === "check_out") {
    if (col === "check_out" && !row[col]) return <span className="text-amber-400">مقيم حالياً</span>
    return <span className="text-zinc-400">{row[col]?.slice(0, 10) || "-"}</span>
  }
  return <span className="text-zinc-100">{row[col] ?? "-"}</span>
}

const buildingsFields: CrudField[] = [
  { name: "building_name", label: "اسم المبنى", type: "text", required: true },
  { name: "location", label: "الموقع", type: "textarea", required: true },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "active", label: "نشط" }, { value: "maintenance", label: "صيانة" }, { value: "inactive", label: "غير نشط" }
  ], default: "active" },
]

const roomsFields: CrudField[] = [
  { name: "building", label: "المبنى", type: "select", fkEndpoint: "/housing/buildings/", fkLabel: "building_name", required: true },
  { name: "room_number", label: "رقم الغرفة", type: "text", required: true },
  { name: "capacity", label: "السعة", type: "number", required: true },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "available", label: "متاح" }, { value: "occupied", label: "مشغول" }, { value: "maintenance", label: "صيانة" }
  ], default: "available" },
]

const requestsFields: CrudField[] = [
  { name: "employee_name", label: "الموظف", type: "text", required: true },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "pending", label: "قيد الانتظار" }, { value: "approved", label: "تمت الموافقة" },
    { value: "rejected", label: "مرفوض" }, { value: "completed", label: "مكتمل" }
  ], default: "pending" },
]

const logsFields: CrudField[] = [
  { name: "room", label: "الغرفة", type: "select", fkEndpoint: "/housing/rooms/", fkLabel: "room_number", required: true },
  { name: "employee_name", label: "الموظف", type: "text", required: true },
  { name: "check_in", label: "تاريخ الدخول", type: "datetime", required: true },
  { name: "check_out", label: "تاريخ الخروج", type: "datetime" },
]

export default function HousingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">السكنات</h1>
        <p className="text-sm text-zinc-500 mt-1">إدارة المباني السكنية والغرف وطلبات السكن</p>
      </div>

      <Tabs defaultValue="buildings" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="buildings">المباني</TabsTrigger>
          <TabsTrigger value="rooms">الغرف</TabsTrigger>
          <TabsTrigger value="requests">طلبات السكن</TabsTrigger>
          <TabsTrigger value="occupancy-logs">سجل الإشغال</TabsTrigger>
        </TabsList>

        <TabsContent value="buildings">
          <CrudDataTable title="المباني السكنية" endpoint="/housing/buildings/"
            columns={["building_name", "location", "status"]}
            labels={{ building_name: "اسم المبنى", location: "الموقع", status: "الحالة" }}
            fields={buildingsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="rooms">
          <CrudDataTable title="الغرف" endpoint="/housing/rooms/"
            columns={["building_name", "room_number", "capacity", "status"]}
            labels={{ building_name: "المبنى", room_number: "رقم الغرفة", capacity: "السعة", status: "الحالة" }}
            fields={roomsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="requests">
          <CrudDataTable title="طلبات السكن" endpoint="/housing/requests/"
            columns={["employee_name", "request_date", "status"]}
            labels={{ employee_name: "الموظف", request_date: "تاريخ الطلب", status: "الحالة" }}
            fields={requestsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="occupancy-logs">
          <CrudDataTable title="سجل الإشغال" endpoint="/housing/occupancy-logs/"
            columns={["employee_name", "room_number", "check_in", "check_out"]}
            labels={{ employee_name: "الموظف", room_number: "الغرفة", check_in: "تاريخ الدخول", check_out: "تاريخ الخروج" }}
            fields={logsFields} renderCell={renderCell} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
