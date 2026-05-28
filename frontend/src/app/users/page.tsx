"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { usersAPI, companiesAPI, departmentsAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"

interface User {
  id: string
  company: string
  company_name: string
  department: string
  department_name: string
  full_name: string
  email: string
  phone: string
  role: string
  is_active: boolean
  created_at: string
}

interface Company { id: string; name: string }
interface Department { id: string; name: string }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "",
    company: "", department: "", role: "department_user", is_active: true
  })

  const fetchData = async () => {
    try {
      const [usersRes, companiesRes, departmentsRes] = await Promise.all([
        usersAPI.list(), companiesAPI.list(), departmentsAPI.list()
      ])
      setUsers(usersRes.data.results || usersRes.data)
      setCompanies(companiesRes.data.results || companiesRes.data)
      setDepartments(departmentsRes.data.results || departmentsRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (form.company) {
      departmentsAPI.byCompany(form.company).then((r) => {
        setFilteredDepartments(r.data.results || r.data || [])
      }).catch(() => setFilteredDepartments(departments))
    } else {
      setFilteredDepartments(departments)
    }
  }, [form.company, departments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editUser) {
        const { password, ...updateData } = form
        const data = password ? form : updateData
        await usersAPI.update(editUser.id, data)
      } else {
        await usersAPI.create(form)
      }
      setDialogOpen(false)
      setEditUser(null)
      setForm({ full_name: "", email: "", phone: "", password: "", company: "", department: "", role: "department_user", is_active: true })
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      await usersAPI.delete(id)
      fetchData()
    }
  }

  const openEdit = (user: User) => {
    setEditUser(user)
    setForm({
      full_name: user.full_name, email: user.email, phone: user.phone, password: "",
      company: user.company, department: user.department || "", role: user.role, is_active: user.is_active
    })
    setDialogOpen(true)
  }

  const roleLabels: Record<string, string> = {
    super_admin: "مدير عام", company_admin: "مدير شركة", department_user: "مستخدم قسم"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">المستخدمين</h1>
          <p className="text-sm text-zinc-500 mt-1">إدارة مستخدمي النظام</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditUser(null); setForm({ full_name: "", email: "", phone: "", password: "", company: "", department: "", role: "department_user", is_active: true }) }}>
              <Plus className="h-4 w-4 ml-2" />
              مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">الاسم الكامل</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الجوال</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">الشركة</Label>
                <select
                  id="company"
                  className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  required
                >
                  <option value="">اختر شركة</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {form.role === "department_user" && (
                <div className="space-y-2">
                  <Label htmlFor="department">القسم</Label>
                  <select
                    id="department"
                    className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="">اختر قسم</option>
                    {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {form.role === "company_admin" && (
                <p className="text-xs text-zinc-500">مدير الشركة لا يحتاج قسم - له صلاحية كاملة على شركته</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">الصلاحية</Label>
                <select
                  id="role"
                  className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="super_admin">مدير عام</option>
                  <option value="company_admin">مدير شركة</option>
                  <option value="department_user">مستخدم قسم</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{editUser ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور"}</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editUser} />
              </div>
              <Button type="submit" className="w-full">
                {editUser ? "تحديث" : "إضافة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">قائمة المستخدمين</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-zinc-500 py-8">جاري التحميل...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">لا توجد مستخدمين بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الاسم</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">البريد</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الشركة</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">القسم</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الصلاحية</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الحالة</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                      <td className="py-3 px-4 text-zinc-100">{user.full_name}</td>
                      <td className="py-3 px-4 text-zinc-400">{user.email}</td>
                      <td className="py-3 px-4 text-zinc-400">{user.company_name}</td>
                      <td className="py-3 px-4 text-zinc-400">{user.department_name || "-"}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex rounded-full px-2 py-1 text-xs bg-amber-500/10 text-amber-400">
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs ${user.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {user.is_active ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
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
