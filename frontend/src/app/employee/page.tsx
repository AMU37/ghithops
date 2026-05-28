"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EmployeePage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      router.replace("/employee/requests")
    } else {
      router.replace("/employee/login")
    }
  }, [])

  return null
}
