"use client"

import { useState, useEffect } from "react"
import { Columns } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface ColumnOption {
  key: string
  label: string
}

interface ColumnSelectorProps {
  storageKey: string
  columns: ColumnOption[]
  defaultVisible: string[]
  onChange: (visible: string[]) => void
}

export default function ColumnSelector({ storageKey, columns, defaultVisible, onChange }: ColumnSelectorProps) {
  const [visible, setVisible] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultVisible
    try {
      const saved = localStorage.getItem(`cols_${storageKey}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // merge saved with defaultVisible to include any new columns
          const merged = [...new Set([...parsed, ...defaultVisible])]
          return merged
        }
      }
    } catch {}
    return defaultVisible
  })

  const [open, setOpen] = useState(false)

  useEffect(() => {
    onChange(visible)
    try { localStorage.setItem(`cols_${storageKey}`, JSON.stringify(visible)) } catch {}
  }, [visible])

  const toggle = (key: string) => {
    setVisible((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key)
        return next.length > 0 ? next : prev
      }
      return [...prev, key]
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="تخصيص الأعمدة" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
          <Columns className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-xs" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-zinc-100">تخصيص الأعمدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {columns.map((col) => (
            <label key={col.key} className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-zinc-800/50">
              <input
                type="checkbox"
                checked={visible.includes(col.key)}
                onChange={() => toggle(col.key)}
                className="h-4 w-4 accent-amber-500"
              />
              <span className="text-sm text-zinc-300">{col.label}</span>
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
