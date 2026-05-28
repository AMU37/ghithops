"use client"

import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton() {
  const router = useRouter()
  return (
    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-100">
      <ChevronRight className="h-5 w-5" />
    </Button>
  )
}
