"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, FileSpreadsheet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import api from "@/lib/api"
import { exportCSV, exportPDF } from "@/lib/export-utils"
import ColumnSelector from "@/components/ui/column-selector"

export interface CrudField {
  name: string
  label: string
  type: "text" | "number" | "select" | "date" | "datetime" | "time" | "textarea" | "checkbox"
  options?: { value: string; label: string }[]
  fkEndpoint?: string
  fkLabel?: string
  required?: boolean
  default?: any
  inputType?: string
}

interface CrudDataTableProps {
  title: string
  endpoint: string
  columns: string[]
  labels: Record<string, string>
  fields: CrudField[]
  renderCell?: (col: string, row: any) => React.ReactNode
  filename?: string
  storageKey?: string
}

export default function CrudDataTable({ title, endpoint, columns, labels, fields, renderCell, filename, storageKey }: CrudDataTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [fkOptions, setFkOptions] = useState<Record<string, any[]>>({})
  const [formError, setFormError] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns)

  const exportName = filename || title

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(endpoint)
      setData(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    fields.forEach((f) => {
      if (f.type === "select" && f.fkEndpoint) {
        api.get(f.fkEndpoint).then((res) => {
          setFkOptions((prev) => ({ ...prev, [f.name]: res.data.results || res.data }))
        }).catch(() => {})
      }
    })
  }, [])

  const resetForm = () => {
    const initial: Record<string, any> = {}
    fields.forEach((f) => {
      initial[f.name] = f.default ?? (f.type === "checkbox" ? false : "")
    })
    setForm(initial)
    setFormError("")
  }

  const openAdd = () => {
    setEditItem(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (item: any) => {
    setEditItem(item)
    const vals: Record<string, any> = {}
    fields.forEach((f) => {
      vals[f.name] = item[f.name] ?? f.default ?? (f.type === "checkbox" ? false : "")
    })
    setForm(vals)
    setFormError("")
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: Record<string, any> = {}
      fields.forEach((f) => {
        let val = form[f.name]
        if ((f.type === "select" && f.fkEndpoint) || f.type === "select") {
          val = (val === "" || val === null || val === undefined) ? null : val
        } else if (["number", "date", "datetime", "time"].includes(f.type)) {
          val = (val === "" || val === null || val === undefined) ? null : val
        } else if (f.type === "text" || f.type === "textarea") {
          val = (val === "" || val === null || val === undefined) ? (f.default ?? "") : val
        } else if (f.type === "checkbox") {
          val = !!val
        }
        payload[f.name] = val
      })
      if (editItem) {
        await api.put(`${endpoint}${editItem.id}/`, payload)
      } else {
        await api.post(endpoint, payload)
      }
      setDialogOpen(false)
      fetchData()
    } catch (err: any) {
      if (err.response?.data) {
        const msgs = typeof err.response.data === "string" ? err.response.data
          : Object.entries(err.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
        setFormError(msgs || "خطأ في التحقق من البيانات")
      } else {
        setFormError(err.message || "حدث خطأ غير متوقع")
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return
    try {
      await api.delete(`${endpoint}${id}/`)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const displayColumns = visibleColumns

  const filtered = search
    ? data.filter((item) =>
        columns.some((col) => String(item[col] ?? "").includes(search))
      )
    : data

  const handleExportExcel = () => exportCSV(filtered, displayColumns, labels, exportName)
  const handleExportPDF = () => exportPDF(filtered, displayColumns, labels, exportName, title)

  const renderFormField = (f: CrudField) => {
    const val = form[f.name] ?? ""
    const setVal = (v: any) => setForm((prev) => ({ ...prev, [f.name]: v }))

    if (f.type === "select" && f.fkEndpoint) {
      const options = fkOptions[f.name] || []
      return (
        <select
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          required={f.required}
        >
          <option value="">---</option>
          {options.map((o: any) => (
            <option key={o.id} value={o.id}>
              {f.fkLabel ? o[f.fkLabel] : o.name || o.full_name || o.farm_name || o.crop_name || o.building_name || o.team_name || o.room_number}
            </option>
          ))}
        </select>
      )
    }

    if (f.type === "select") {
      return (
        <select
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          required={f.required}
        >
          <option value="">---</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )
    }

    if (f.type === "checkbox") {
      return (
        <input type="checkbox" checked={!!val} onChange={(e) => setVal(e.target.checked)} className="h-4 w-4 accent-amber-500" />
      )
    }

    if (f.type === "textarea") {
      return (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 min-h-[80px]"
          required={f.required}
        />
      )
    }

    return (
      <Input
        type={f.inputType || (f.type === "datetime" ? "datetime-local" : f.type)}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="bg-zinc-900 border-zinc-700 text-zinc-100"
        required={f.required}
      />
    )
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">{formError}</div>
      )}
      {fields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name} className="text-zinc-300">{f.label}</Label>
          {renderFormField(f)}
        </div>
      ))}
      <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black">
        {editItem ? "تحديث" : "إضافة"}
      </Button>
    </form>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg text-zinc-100">{title}</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="w-48 pr-9 bg-zinc-900 border-zinc-700 text-zinc-100"
            />
          </div>
          <ColumnSelector
            storageKey={storageKey || endpoint}
            columns={columns.map((c) => ({ key: c, label: labels[c] || c }))}
            defaultVisible={columns}
            onChange={setVisibleColumns}
          />
          <Button variant="outline" size="icon" onClick={handleExportExcel} title="تصدير CSV" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportPDF} title="تصدير PDF" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
            <FileText className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="h-4 w-4 ml-1" /> إضافة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{editItem ? "تعديل" : "إضافة"} {title}</DialogTitle>
                <DialogDescription className="sr-only">{editItem ? "تعديل" : "إضافة"} {title}</DialogDescription>
              </DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ direction: "rtl" }}>
            <thead>
              <tr className="border-b border-zinc-800">
                {displayColumns.map((col) => (
                  <th key={col} className="text-right py-3 px-4 text-zinc-400 font-medium">{labels[col]}</th>
                ))}
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={displayColumns.length + 1} className="text-center py-8 text-zinc-500">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={displayColumns.length + 1} className="text-center py-8 text-zinc-500">لا توجد بيانات</td></tr>
              ) : (
                filtered.map((item: any) => (
                  <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    {displayColumns.map((col) => (
                      <td key={col} className="py-3 px-4">
                        {renderCell ? renderCell(col, item) : (item[col] ?? "-")}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="تعديل">
                          <Pencil className="h-4 w-4 text-amber-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="حذف">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
