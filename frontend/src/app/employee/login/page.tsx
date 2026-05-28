"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users } from "lucide-react"
import api from "@/lib/api"

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await api.post("/auth/login/", { email: username, password })
      localStorage.setItem("access_token", res.data.access)
      localStorage.setItem("refresh_token", res.data.refresh)
      localStorage.setItem("employee_portal", "1")
      router.push("/employee/requests")
    } catch (err: any) {
      setError(err?.response?.data?.detail || "اسم المستخدم أو كلمة المرور غير صحيحة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Users className="h-7 w-7 text-amber-500" />
          </div>
          <CardTitle className="text-xl text-zinc-100">بوابة طلبات المواصلات</CardTitle>
          <CardDescription className="text-zinc-500">أدخل اسم المستخدم وكلمة المرور</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-300">اسم المستخدم</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 text-center text-lg" required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">كلمة المرور</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 text-center text-lg" required dir="ltr" />
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button type="submit" disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium h-11">
              {loading ? "جاري تسجيل الدخول..." : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
