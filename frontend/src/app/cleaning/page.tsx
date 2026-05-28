"use client"

import CrudDataTable, { CrudField } from "@/components/ui/crud-data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const statusColors: Record<string, string> = {
  pending: "bg-blue-500/10 text-blue-400", in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-400",
}
const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار", in_progress: "قيد التنفيذ", completed: "مكتمل",
}

function renderCell(col: string, row: any) {
  if (col === "status") {
    const val = row[col]
    return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusColors[val] || "bg-zinc-500/10 text-zinc-400"}`}>{statusLabels[val] || val || "-"}</span>
  }
  if (col === "score") {
    const val = row[col]
    const color = val >= 80 ? "text-emerald-400" : val >= 50 ? "text-amber-400" : "text-red-400"
    return <span className={`font-bold ${color}`}>{val ?? "-"}</span>
  }
  return <span className="text-zinc-100">{row[col] ?? "-"}</span>
}

const tasksFields: CrudField[] = [
  { name: "location", label: "الموقع", type: "text", required: true },
  { name: "task_date", label: "التاريخ", type: "date", required: true },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "pending", label: "قيد الانتظار" }, { value: "in_progress", label: "قيد التنفيذ" },
    { value: "completed", label: "مكتمل" }
  ], default: "pending" },
]

const teamsFields: CrudField[] = [
  { name: "team_name", label: "اسم الفريق", type: "text", required: true },
  { name: "supervisor", label: "المشرف", type: "text", required: true },
]

const inspFields: CrudField[] = [
  { name: "task", label: "المهمة", type: "select", fkEndpoint: "/cleaning/tasks/", fkLabel: "location", required: true },
  { name: "score", label: "النتيجة", type: "number", required: true },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

export default function CleaningPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">النظافة</h1>
        <p className="text-sm text-zinc-500 mt-1">إدارة مهام النظافة والفرق والتفتيش</p>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="tasks">مهام النظافة</TabsTrigger>
          <TabsTrigger value="teams">فرق النظافة</TabsTrigger>
          <TabsTrigger value="inspections">التفتيش</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <CrudDataTable title="مهام النظافة" endpoint="/cleaning/tasks/"
            columns={["location", "task_date", "status"]}
            labels={{ location: "الموقع", task_date: "التاريخ", status: "الحالة" }}
            fields={tasksFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="teams">
          <CrudDataTable title="فرق النظافة" endpoint="/cleaning/teams/"
            columns={["team_name", "supervisor"]}
            labels={{ team_name: "اسم الفريق", supervisor: "المشرف" }}
            fields={teamsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="inspections">
          <CrudDataTable title="التفتيش" endpoint="/cleaning/inspections/"
            columns={["task_location", "score", "notes"]}
            labels={{ task_location: "المهمة", score: "النتيجة", notes: "ملاحظات" }}
            fields={inspFields} filename="التفتيش" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
