"use client"

import CrudDataTable, { CrudField } from "@/components/ui/crud-data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const statusColors: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-400",
  assigned: "bg-amber-500/10 text-amber-400",
  maintenance: "bg-red-500/10 text-red-400",
  scrapped: "bg-zinc-500/10 text-zinc-400",
  pending: "bg-amber-500/10 text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  completed: "bg-blue-500/10 text-blue-400",
}
const statusLabels: Record<string, string> = {
  available: "متاح", assigned: "مخصص", maintenance: "صيانة", scrapped: "مستبعد",
  pending: "قيد الانتظار", approved: "تمت الموافقة", rejected: "مرفوض", completed: "مكتمل",
}

function renderCell(col: string, row: any) {
  if (col === "status") {
    const val = row[col]
    const color = statusColors[val] || "bg-zinc-500/10 text-zinc-400"
    return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${color}`}>{statusLabels[val] || val || "-"}</span>
  }
  return <span className="text-zinc-100">{row[col] ?? "-"}</span>
}

const categoryFields: CrudField[] = [
  { name: "name", label: "اسم التصنيف", type: "text", required: true },
  { name: "description", label: "الوصف", type: "textarea" },
]

const assetFields: CrudField[] = [
  { name: "category", label: "التصنيف", type: "select", fkEndpoint: "/assets/categories/", fkLabel: "name" },
  { name: "name", label: "اسم الأصل", type: "text", required: true },
  { name: "code", label: "الكود", type: "text" },
  { name: "quantity", label: "الكمية", type: "number", default: 1 },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "available", label: "متاح" }, { value: "assigned", label: "مخصص" },
    { value: "maintenance", label: "صيانة" }, { value: "scrapped", label: "مستبعد" }
  ], default: "available" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

const requestFields: CrudField[] = [
  { name: "employee_name", label: "الموظف", type: "text", required: true },
  { name: "category", label: "التصنيف", type: "select", fkEndpoint: "/assets/categories/", fkLabel: "name" },
  { name: "asset", label: "الأصل", type: "select", fkEndpoint: "/assets/assets/", fkLabel: "name" },
  { name: "quantity", label: "الكمية", type: "number", default: 1 },
  { name: "purpose", label: "الغرض", type: "textarea" },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "pending", label: "قيد الانتظار" }, { value: "approved", label: "تمت الموافقة" },
    { value: "rejected", label: "مرفوض" }, { value: "completed", label: "مكتمل" }
  ], default: "pending" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">الأصول (الأثاث)</h1>
        <p className="text-sm text-zinc-500 mt-1">إدارة الأصول والتصنيفات وطلبات الأصول</p>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="categories">التصنيفات</TabsTrigger>
          <TabsTrigger value="assets">الأصول</TabsTrigger>
          <TabsTrigger value="requests">طلبات الأصول</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CrudDataTable title="تصنيفات الأصول" endpoint="/assets/categories/"
            columns={["name", "description", "asset_count"]}
            labels={{ name: "الاسم", description: "الوصف", asset_count: "عدد الأصول" }}
            fields={categoryFields} renderCell={renderCell} filename="تصنيفات_الأصول" />
        </TabsContent>
        <TabsContent value="assets">
          <CrudDataTable title="الأصول" endpoint="/assets/assets/"
            columns={["category_name", "name", "code", "quantity", "status", "notes"]}
            labels={{ category_name: "التصنيف", name: "الاسم", code: "الكود", quantity: "الكمية", status: "الحالة", notes: "ملاحظات" }}
            fields={assetFields} renderCell={renderCell} filename="الأصول" />
        </TabsContent>
        <TabsContent value="requests">
          <CrudDataTable title="طلبات الأصول" endpoint="/assets/requests/"
            columns={["employee_name", "category_name", "asset_name", "quantity", "purpose", "request_date", "status", "notes"]}
            labels={{ employee_name: "الموظف", category_name: "التصنيف", asset_name: "الأصل", quantity: "الكمية", purpose: "الغرض", request_date: "التاريخ", status: "الحالة", notes: "ملاحظات" }}
            fields={requestFields} renderCell={renderCell} filename="طلبات_الأصول" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
