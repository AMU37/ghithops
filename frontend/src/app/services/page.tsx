"use client"

import CrudDataTable, { CrudField } from "@/components/ui/crud-data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400", in_progress: "bg-blue-500/10 text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-400", cancelled: "bg-red-500/10 text-red-400",
}
const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي",
}
const priorityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400", medium: "bg-zinc-500/10 text-zinc-400",
  high: "bg-amber-500/10 text-amber-400", urgent: "bg-red-500/10 text-red-400",
}
const priorityLabels: Record<string, string> = {
  low: "منخفضة", medium: "متوسطة", high: "عالية", urgent: "عاجل",
}

function renderCell(col: string, row: any) {
  if (col === "status") {
    const val = row[col]
    return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusColors[val] || "bg-zinc-500/10 text-zinc-400"}`}>{statusLabels[val] || val || "-"}</span>
  }
  if (col === "priority") {
    const val = row[col]
    return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${priorityColors[val] || "bg-zinc-500/10 text-zinc-400"}`}>{priorityLabels[val] || val || "-"}</span>
  }
  if (col === "start_time" || col === "end_time") {
    return <span className="text-zinc-400">{row[col] ? row[col].slice(0, 16).replace("T", " ") : "-"}</span>
  }
  return <span className="text-zinc-100">{row[col] ?? "-"}</span>
}

const requestsFields: CrudField[] = [
  { name: "request_type", label: "النوع", type: "text", required: true },
  { name: "description", label: "الوصف", type: "textarea", required: true },
  { name: "priority", label: "الأولوية", type: "select", options: [
    { value: "low", label: "منخفضة" }, { value: "medium", label: "متوسطة" },
    { value: "high", label: "عالية" }, { value: "urgent", label: "عاجل" }
  ], default: "medium" },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "pending", label: "قيد الانتظار" }, { value: "in_progress", label: "قيد التنفيذ" },
    { value: "completed", label: "مكتمل" }, { value: "cancelled", label: "ملغي" }
  ], default: "pending" },
]

const techsFields: CrudField[] = [
  { name: "full_name", label: "الاسم", type: "text", required: true },
  { name: "phone", label: "الجوال", type: "text", required: true },
  { name: "specialization", label: "التخصص", type: "text", required: true },
]

const workOrdersFields: CrudField[] = [
  { name: "request", label: "الطلب", type: "select", fkEndpoint: "/services/requests/", fkLabel: "description", required: true },
  { name: "technician", label: "الفني", type: "select", fkEndpoint: "/services/technicians/", fkLabel: "full_name" },
  { name: "start_time", label: "وقت البداية", type: "datetime" },
  { name: "end_time", label: "وقت النهاية", type: "datetime" },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "pending", label: "قيد الانتظار" }, { value: "in_progress", label: "قيد التنفيذ" },
    { value: "completed", label: "مكتمل" }
  ], default: "pending" },
]

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">الخدمات</h1>
        <p className="text-sm text-zinc-500 mt-1">إدارة طلبات الخدمات والفنيين وأوامر العمل</p>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="requests">طلبات الخدمة</TabsTrigger>
          <TabsTrigger value="technicians">الفنيين</TabsTrigger>
          <TabsTrigger value="work-orders">أوامر العمل</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <CrudDataTable title="طلبات الخدمة" endpoint="/services/requests/"
            columns={["request_type", "description", "priority", "status"]}
            labels={{ request_type: "النوع", description: "الوصف", priority: "الأولوية", status: "الحالة" }}
            fields={requestsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="technicians">
          <CrudDataTable title="الفنيين" endpoint="/services/technicians/"
            columns={["full_name", "phone", "specialization"]}
            labels={{ full_name: "الاسم", phone: "الجوال", specialization: "التخصص" }}
            fields={techsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="work-orders">
          <CrudDataTable title="أوامر العمل" endpoint="/services/work-orders/"
            columns={["request_description", "technician_name", "start_time", "end_time", "status"]}
            labels={{ request_description: "الطلب", technician_name: "الفني", start_time: "وقت البداية", end_time: "وقت النهاية", status: "الحالة" }}
            fields={workOrdersFields} renderCell={renderCell} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
