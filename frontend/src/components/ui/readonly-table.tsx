"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, FileSpreadsheet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/api"
import { exportCSV, exportPDF } from "@/lib/export-utils"

interface ReadOnlyTableProps {
  title: string
  endpoint: string
  columns: string[]
  labels: Record<string, string>
  renderCell?: (col: string, row: any) => React.ReactNode
  filename?: string
}

export default function ReadOnlyTable({ title, endpoint, columns, labels, renderCell, filename }: ReadOnlyTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const exportName = filename || title

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(endpoint)
      setData(res.data.results || res.data)
    } finally { setLoading(false) }
  }, [endpoint])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = search
    ? data.filter((item) => columns.some((col) => String(item[col] ?? "").includes(search)))
    : data

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg text-zinc-100">{title}</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="w-48 pr-9 bg-zinc-900 border-zinc-700 text-zinc-100" />
          </div>
          <Button variant="outline" size="icon" onClick={() => exportCSV(filtered, columns, labels, exportName)} title="تصدير CSV" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => exportPDF(filtered, columns, labels, exportName, title)} title="تصدير PDF" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ direction: "rtl" }}>
            <thead>
              <tr className="border-b border-zinc-800">
                {columns.map((col) => <th key={col} className="text-right py-3 px-4 text-zinc-400 font-medium">{labels[col]}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="text-center py-8 text-zinc-500">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center py-8 text-zinc-500">لا توجد بيانات</td></tr>
              ) : (
                filtered.map((item: any) => (
                  <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    {columns.map((col) => (
                      <td key={col} className="py-3 px-4">{renderCell ? renderCell(col, item) : (item[col] ?? "-")}</td>
                    ))}
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
