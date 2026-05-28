"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import api from "@/lib/api"

function ApproveContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    const level = searchParams.get("level") || "supervisor"
    if (!token) {
      setStatus("error")
      setMessage("رابط غير صالح - رمز التفعيل مفقود")
      return
    }
    api.get(`/transport/requests/email_approve/?token=${encodeURIComponent(token)}&level=${level}`)
      .then((res) => {
        setStatus("success")
        setMessage(res.data.message || "تم اعتماد الطلب بنجاح")
      })
      .catch((err) => {
        setStatus("error")
        setMessage(err.response?.data?.message || "فشل في اعتماد الطلب")
      })
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-500" />
            <p className="text-zinc-400">جاري اعتماد الطلب...</p>
          </div>
        )}
        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-xl font-bold text-zinc-100">تمت الموافقة</h1>
            <p className="text-zinc-400">{message}</p>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="text-xl font-bold text-zinc-100">فشل</h1>
            <p className="text-zinc-400">{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-500" />
          <p className="text-zinc-400 mt-4">جاري التحميل...</p>
        </div>
      </div>
    }>
      <ApproveContent />
    </Suspense>
  )
}
