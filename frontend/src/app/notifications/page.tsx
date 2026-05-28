"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { notificationsAPI } from "@/lib/api"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = () => {
    notificationsAPI.list().then((r) => {
      setNotifications(r.data.results || r.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadNotifications() }, [])

  const markRead = async (id: string) => {
    await notificationsAPI.markRead(id)
    loadNotifications()
  }

  const markAllRead = async () => {
    await notificationsAPI.markAllRead()
    loadNotifications()
  }

  const unreadCount = notifications.filter((n) => n.status === "unread").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">الإشعارات</h1>
          <p className="text-sm text-zinc-500 mt-1">{unreadCount} إشعار غير مقروء</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllRead} variant="outline" className="gap-2 border-zinc-700">
            <CheckCheck className="h-4 w-4" /> تحديد الكل كمقروء
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">جميع الإشعارات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-zinc-500">جاري التحميل...</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Bell className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <div key={n.id} className={`flex items-start gap-3 rounded-lg p-4 transition-colors ${n.status === "unread" ? "bg-amber-500/5 border border-amber-500/20" : "bg-zinc-900/50 border border-transparent"}`}>
                  <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.status === "unread" ? "bg-amber-500/20" : "bg-zinc-800"}`}>
                    {n.status === "unread" ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <Info className="h-4 w-4 text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.status === "unread" ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-zinc-500 mt-1">{n.body}</p>}
                    <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {n.created_at?.slice(0, 16).replace("T", " ") || "-"}
                    </p>
                  </div>
                  {n.status === "unread" && (
                    <Button variant="ghost" size="icon" onClick={() => markRead(n.id)} title="تحديد كمقروء">
                      <CheckCheck className="h-4 w-4 text-emerald-400" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
