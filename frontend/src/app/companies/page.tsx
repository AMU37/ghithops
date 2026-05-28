"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { companiesAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"

interface Company {
  id: string
  name: string
  code: string
  logo: string
  status: boolean
  user_count?: number
  created_at: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [form, setForm] = useState({ name: "", code: "", status: true })
  const [currentRole, setCurrentRole] = useState("")

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      setCurrentRole(user.role || "")
    } catch {}
  }, [])

  const fetchCompanies = async () => {
    try {
      const res = await companiesAPI.list()
      setCompanies(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompanies() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editCompany) {
        await companiesAPI.update(editCompany.id, form)
      } else {
        await companiesAPI.create(form)
      }
      setDialogOpen(false)
      setEditCompany(null)
      setForm({ name: "", code: "", status: true })
      fetchCompanies()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الشركة؟")) {
      await companiesAPI.delete(id)
      fetchCompanies()
    }
  }

  const openEdit = (company: Company) => {
    setEditCompany(company)
    setForm({ name: company.name, code: company.code, status: company.status })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">الشركات</h1>
          <p className="text-sm text-zinc-500 mt-1">إدارة الشركات المسجلة في النظام</p>
        </div>
        {currentRole === "super_admin" && <AddCompanyDialog
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          editCompany={editCompany}
          setEditCompany={setEditCompany}
          form={form}
          setForm={setForm}
          handleSubmit={handleSubmit}
        />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">قائمة الشركات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-zinc-500 py-8">جاري التحميل...</p>
          ) : companies.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">لا توجد شركات بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الاسم</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الكود</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">المستخدمين</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الحالة</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">تاريخ الإنشاء</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                      <td className="py-3 px-4 text-zinc-100">{company.name}</td>
                      <td className="py-3 px-4 text-zinc-400">{company.code}</td>
                      <td className="py-3 px-4 text-zinc-400">{company.user_count || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs ${company.status ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {company.status ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{formatDate(company.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(company.id)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AddCompanyDialog({ dialogOpen, setDialogOpen, editCompany, setEditCompany, form, setForm, handleSubmit }: any) {
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => { setEditCompany(null); setForm({ name: "", code: "", status: true }) }}>
          <Plus className="h-4 w-4 ml-2" /> شركة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editCompany ? "تعديل شركة" : "إضافة شركة جديدة"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم الشركة</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">كود الشركة</Label>
            <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <Button type="submit" className="w-full">{editCompany ? "تحديث" : "إضافة"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
