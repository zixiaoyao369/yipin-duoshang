import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface Client {
  id: string
  name: string
  shortName: string
  industry: string
  avatar: string        // 首字母缩写作为头像
  avatarColor: string   // 头像背景色
  contactName: string
  contactRole: string
  totalMaterials: number
  status: "active" | "onboarding" | "paused"
  platform?: string     // 对接平台来源
}

const defaultClients: Client[] = [
  {
    id: "client-anqi",
    name: "安琪酵母云图",
    shortName: "安琪",
    industry: "食品生物",
    avatar: "安",
    avatarColor: "from-blue-500 to-indigo-600",
    contactName: "张明",
    contactRole: "采购总监",
    totalMaterials: 12000,
    status: "active",
    platform: "云图采购平台",
  },
  {
    id: "client-jingbo",
    name: "京博石化",
    shortName: "京博",
    industry: "石油化工",
    avatar: "京",
    avatarColor: "from-emerald-500 to-teal-600",
    contactName: "李伟",
    contactRole: "供应链经理",
    totalMaterials: 8500,
    status: "active",
    platform: "京博SRM",
  },
  {
    id: "client-wanhua",
    name: "万华化学",
    shortName: "万华",
    industry: "化学材料",
    avatar: "万",
    avatarColor: "from-orange-500 to-red-500",
    contactName: "王芳",
    contactRole: "数字化负责人",
    totalMaterials: 15000,
    status: "onboarding",
    platform: "万华数采平台",
  },
  {
    id: "client-admin",
    name: "平台管理员",
    shortName: "管理",
    industry: "系统管理",
    avatar: "管",
    avatarColor: "from-gray-600 to-gray-800",
    contactName: "系统管理员",
    contactRole: "超级管理员",
    totalMaterials: 35500,
    status: "active",
  },
]

interface ClientContextType {
  currentClient: Client
  clients: Client[]
  switchClient: (clientId: string) => void
  isAdmin: boolean
}

const ClientContext = createContext<ClientContextType | null>(null)

export function useClient() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error("useClient must be used within ClientProvider")
  return ctx
}

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients] = useState<Client[]>(defaultClients)
  // 默认以"安琪酵母云图"登录（模拟从外部平台跳转过来已认证）
  const [currentClientId, setCurrentClientId] = useState("client-anqi")

  const currentClient = clients.find((c) => c.id === currentClientId) || clients[0]
  const isAdmin = currentClientId === "client-admin"

  const switchClient = useCallback((clientId: string) => {
    setCurrentClientId(clientId)
  }, [])

  return (
    <ClientContext.Provider value={{ currentClient, clients, switchClient, isAdmin }}>
      {children}
    </ClientContext.Provider>
  )
}
