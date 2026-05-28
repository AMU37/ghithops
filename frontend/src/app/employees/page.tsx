"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CrudDataTable, { CrudField } from "@/components/ui/crud-data-table"
import ReadOnlyTable from "@/components/ui/readonly-table"
import api from "@/lib/api"

const empFields: CrudField[] = [
  { name: "employee_id", label: "كود الموظف", type: "text", required: true },
  { name: "full_name", label: "الاسم", type: "text", required: true },
  { name: "phone", label: "الجوال", type: "text" },
  { name: "email", label: "البريد", type: "text" },
  { name: "department_name", label: "القسم", type: "text" },
  { name: "position", label: "المسمى الوظيفي", type: "text" },
  { name: "shift_type", label: "نوع الدوام", type: "select", fkEndpoint: "/employees/shift_types/", fkLabel: "name" },
  { name: "service_type", label: "نوع الخدمة", type: "select", fkEndpoint: "/employees/service_types/", fkLabel: "name" },
  { name: "city", label: "المدينة", type: "text" },
  { name: "status", label: "الحالة", type: "select", options: [
    { value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }
  ], default: "active" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
]

export default function EmployeesPage() {
  const [role, setRole] = useState("")

  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); setRole(u.role || "") } catch {}
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">الموظفين</h1>
        <p className="text-sm text-zinc-500 mt-1">إدارة الموظفين وأنواع الدوام لكافة الأقسام</p>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
          <TabsTrigger value="shift-types">أنواع الدوام</TabsTrigger>
          <TabsTrigger value="service-types">أنواع الخدمات</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <CrudDataTable title="الموظفين" endpoint="/employees/"
            columns={["employee_id", "full_name", "phone", "department_name", "position", "shift_type_name", "service_type_name", "city", "status"]}
            labels={{ employee_id: "الكود", full_name: "الاسم", phone: "الجوال", department_name: "القسم", position: "المسمى", shift_type_name: "نوع الدوام", service_type_name: "نوع الخدمة", city: "المدينة", status: "الحالة" }}
            fields={empFields}
            renderCell={(col, row) => {
              if (col === "status") {
                return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${row.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{row.status === "active" ? "نشط" : "غير نشط"}</span>
              }
              return <span className="text-zinc-100">{row[col] ?? "-"}</span>
            }}
            filename="الموظفين" storageKey="employees_main" />
        </TabsContent>

        <TabsContent value="shift-types">
          {role === "super_admin" || role === "company_admin" ? (
            <CrudDataTable title="أنواع الدوام" endpoint="/transport/shift-types/"
              columns={["name", "work_days", "vacation_days", "status"]}
              labels={{ name: "الاسم", work_days: "أيام الدوام", vacation_days: "أيام الإجازة", status: "الحالة" }}
              fields={[
                { name: "name", label: "الاسم", type: "text", required: true },
                { name: "description", label: "الوصف", type: "textarea" },
                { name: "work_days", label: "أيام الدوام", type: "number", default: 6 },
                { name: "vacation_days", label: "أيام الإجازة", type: "number", default: 1 },
                { name: "status", label: "الحالة", type: "select", options: [{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }], default: "active" },
              ]}
              renderCell={(col, row) => {
                if (col === "status") {
                  return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${row.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{row.status === "active" ? "نشط" : "غير نشط"}</span>
                }
                return <span className="text-zinc-100">{row[col] ?? "-"}</span>
              }} filename="انواع_الدوام" storageKey="shift_types" />
          ) : (
            <ReadOnlyTable title="أنواع الدوام" endpoint="/employees/shift_types/"
              columns={["name", "work_days", "vacation_days", "status"]}
              labels={{ name: "الاسم", work_days: "أيام الدوام", vacation_days: "أيام الإجازة", status: "الحالة" }}
              renderCell={(col, row) => {
                if (col === "status") {
                  return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${row.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{row.status === "active" ? "نشط" : "غير نشط"}</span>
                }
                return <span className="text-zinc-100">{row[col] ?? "-"}</span>
              }} />
          )}
        </TabsContent>

        <TabsContent value="service-types">
          <CrudDataTable title="أنواع الخدمات" endpoint="/employees/service-types/"
            columns={["name", "status"]}
            labels={{ name: "الاسم", status: "الحالة" }}
            fields={[
              { name: "name", label: "الاسم", type: "text", required: true },
              { name: "status", label: "الحالة", type: "select", options: [{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }], default: "active" },
            ]}
            renderCell={(col, row) => {
              if (col === "status") {
                return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${row.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{row.status === "active" ? "نشط" : "غير نشط"}</span>
              }
              return <span className="text-zinc-100">{row[col] ?? "-"}</span>
            }} filename="انواع_الخدمات" storageKey="service_types" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
