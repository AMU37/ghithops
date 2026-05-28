"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Trash2, RefreshCw, MessageSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { aiAPI } from "@/lib/api"

export default function AiAssistantPage() {
  const [chats, setChats] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    aiAPI.listChats().then((r) => setChats(r.data.results || r.data))
  }, [])

  useEffect(() => {
    if (activeChat) {
      aiAPI.getChat(activeChat).then((r) => setMessages(r.data.messages || []))
    } else {
      setMessages([])
    }
  }, [activeChat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const msg = input
    setInput("")
    setLoading(true)
    setMessages((prev) => [...prev, { role: "user", content: msg, id: "temp" }])

    try {
      const res = await aiAPI.chat({ message: msg, chat_id: activeChat || undefined })
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply, id: "resp" }])
      if (!activeChat) {
        setActiveChat(res.data.chat_id)
        aiAPI.listChats().then((r) => setChats(r.data.results || r.data))
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ في الاتصال." }])
    }
    setLoading(false)
  }

  const regenerate = async () => {
    if (!activeChat) return
    setLoading(true)
    setMessages((prev) => prev.slice(0, -1))
    try {
      const res = await aiAPI.regenerate(activeChat)
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ." }])
    }
    setLoading(false)
  }

  const deleteChat = async (id: string) => {
    await aiAPI.deleteChat(id)
    if (activeChat === id) { setActiveChat(null); setMessages([]) }
    aiAPI.listChats().then((r) => setChats(r.data.results || r.data))
  }

  const newChat = () => { setActiveChat(null); setMessages([]) }

  return (
    <div className="flex gap-4 h-[calc(100vh-4rem)]">
      {sidebarOpen && (
        <div className="w-64 shrink-0 space-y-2">
          <Button onClick={newChat} className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-400">
            <Plus className="h-4 w-4" /> محادثة جديدة
          </Button>
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
            {chats.map((c: any) => (
              <div key={c.id} className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${activeChat === c.id ? "bg-amber-500/10 text-amber-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`} onClick={() => setActiveChat(c.id)}>
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{c.title || "محادثة"}</span>
                <Trash2 className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-red-400 shrink-0" onClick={(e) => { e.stopPropagation(); deleteChat(c.id) }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b border-zinc-800 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-lg text-zinc-100">المساعد الذكي</CardTitle>
            <Button variant="ghost" size="icon" className="mr-auto" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Bot className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">مرحباً بك في المساعد الذكي</p>
              <p className="text-sm">اسألني عن أي شيء يخص النظام</p>
            </div>
          )}
          {messages.map((m: any, i: number) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-amber-400" /></div>}
              <div className={`max-w-[75%] rounded-xl px-4 py-2 text-sm ${m.role === "user" ? "bg-amber-500/20 text-zinc-100" : "bg-zinc-800 text-zinc-200"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.role === "user" && <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-zinc-300" /></div>}
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            {messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
              <Button variant="ghost" size="icon" onClick={regenerate} disabled={loading} title="إعادة توليد">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="اكتب رسالتك..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-amber-500 text-black hover:bg-amber-400">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
