import axios from "axios"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const sc = localStorage.getItem("selected_company")
    if (sc) {
      try {
        const company = JSON.parse(sc)
        if (company?.id) {
          config.headers["X-Company-ID"] = company.id
        }
      } catch {}
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refresh = localStorage.getItem("refresh_token")
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh/`, { refresh })
          localStorage.setItem("access_token", res.data.access)
          localStorage.setItem("refresh_token", res.data.refresh)
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`
          return api(originalRequest)
        } catch {
          localStorage.clear()
          window.location.href = "/login"
        }
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data: { email: string; password: string }) => api.post("/auth/login/", data),
  me: () => api.get("/auth/me/"),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post("/auth/change_password/", data),
}

export const companiesAPI = {
  list: () => api.get("/companies/"),
  get: (id: string) => api.get(`/companies/${id}/`),
  create: (data: any) => api.post("/companies/", data),
  update: (id: string, data: any) => api.patch(`/companies/${id}/`, data),
  delete: (id: string) => api.delete(`/companies/${id}/`),
}

export const usersAPI = {
  list: () => api.get("/users/"),
  get: (id: string) => api.get(`/users/${id}/`),
  create: (data: any) => api.post("/users/", data),
  update: (id: string, data: any) => api.patch(`/users/${id}/`, data),
  delete: (id: string) => api.delete(`/users/${id}/`),
  byCompany: (companyId: string) => api.get(`/users/by_company/?company_id=${companyId}`),
  byDepartment: (departmentId: string) => api.get(`/users/by_department/?department_id=${departmentId}`),
}

export const departmentsAPI = {
  list: () => api.get("/departments/"),
  create: (data: any) => api.post("/departments/", data),
  update: (id: string, data: any) => api.patch(`/departments/${id}/`, data),
  delete: (id: string) => api.delete(`/departments/${id}/`),
  byCompany: (companyId: string) => api.get(`/departments/by_company/?company_id=${companyId}`),
}

export const auditLogsAPI = {
  list: () => api.get("/audit-logs/"),
}

export const notificationsAPI = {
  list: () => api.get("/notifications/"),
  markRead: (id: string) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post("/notifications/mark_all_read/"),
}

export const housingAPI = {
  buildings: { list: () => api.get("/housing/buildings/") },
  rooms: { list: () => api.get("/housing/rooms/") },
  requests: { list: () => api.get("/housing/requests/") },
  occupancyLogs: { list: () => api.get("/housing/occupancy-logs/") },
}

export const servicesAPI = {
  requests: { list: () => api.get("/services/requests/") },
  technicians: { list: () => api.get("/services/technicians/") },
  workOrders: { list: () => api.get("/services/work-orders/") },
}

export const cleaningAPI = {
  tasks: { list: () => api.get("/cleaning/tasks/") },
  teams: { list: () => api.get("/cleaning/teams/") },
  inspections: { list: () => api.get("/cleaning/inspections/") },
}

export const agricultureAPI = {
  farms: { list: () => api.get("/agriculture/farms/") },
  crops: { list: () => api.get("/agriculture/crops/") },
  irrigationPlans: { list: () => api.get("/agriculture/irrigation-plans/") },
}

export const aiAPI = {
  chat: (data: { message: string; chat_id?: string }) => api.post("/ai/chats/chat/", data),
  listChats: () => api.get("/ai/chats/"),
  getChat: (id: string) => api.get(`/ai/chats/${id}/`),
  deleteChat: (id: string) => api.delete(`/ai/chats/${id}/`),
  regenerate: (id: string) => api.post(`/ai/chats/${id}/regenerate/`),
  ocr: {
    process: (data: FormData) => api.post("/ai/ocr/process/", data),
    list: () => api.get("/ai/ocr/"),
  },
  analytics: {
    overview: () => api.get("/ai/analytics/overview/"),
    transport: (period?: string) => api.get(`/ai/analytics/transport_stats/${period ? `?period=${period}` : ""}`),
    housing: () => api.get("/ai/analytics/housing_stats/"),
    services: () => api.get("/ai/analytics/service_stats/"),
    cleaning: () => api.get("/ai/analytics/cleaning_stats/"),
    agriculture: () => api.get("/ai/analytics/agriculture_stats/"),
    audit: (limit?: number) => api.get(`/ai/analytics/system_audit/${limit ? `?limit=${limit}` : ""}`),
  },
}

export default api
