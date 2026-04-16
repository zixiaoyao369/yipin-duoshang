import { useState, useRef, useEffect } from "react"
import { useClient, type Client } from "@/components/ClientContext"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChevronDown, Check, Building2, User, Package,
  ArrowRightLeft, Shield, Zap
} from "lucide-react"

/** 侧边栏中的客户信息卡片 — 点击展开切换面板 */
export function ClientSwitcher({ collapsed }: { collapsed: boolean }) {
  const { currentClient, clients, switchClient, isAdmin } = useClient()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  const handleSwitch = (client: Client) => {
    if (client.id === currentClient.id) {
      setOpen(false)
      return
    }
    switchClient(client.id)
    setOpen(false)
    addToast({
      type: "success",
      title: `已切换至${client.name}`,
      description: client.id === "client-admin"
        ? "当前为管理员视角，可查看所有客户数据"
        : `${client.platform || "平台"} · ${client.contactName}`,
    })
  }

  return (
    <div className="relative" ref={dropRef}>
      {/* Trigger */}
      <button
        onClick={() => collapsed ? setModalOpen(true) : setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg transition-smooth",
          collapsed ? "justify-center p-2" : "px-3 py-2.5",
          "hover:bg-sidebar-border/50",
          open && "bg-sidebar-border/50"
        )}
      >
        {/* Avatar */}
        <div className={cn(
          "shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shadow-md",
          currentClient.avatarColor
        )}>
          {currentClient.avatar}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-primary-foreground truncate">
                {currentClient.name}
              </p>
              <p className="text-[10px] text-sidebar-foreground truncate">
                {isAdmin ? "管理员视角" : currentClient.contactName + " · " + currentClient.contactRole}
              </p>
            </div>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-sidebar-foreground transition-transform duration-200",
              open && "rotate-180"
            )} />
          </>
        )}
      </button>

      {/* Dropdown (非折叠态) */}
      {open && !collapsed && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-card rounded-lg border shadow-card z-50 overflow-hidden animate-scale-in">
          <div className="p-2 border-b">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
              切换客户账户
            </p>
          </div>
          <div className="p-1.5 max-h-[280px] overflow-y-auto">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSwitch(client)}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-left transition-smooth",
                  client.id === currentClient.id
                    ? "bg-primary/8 ring-1 ring-primary/20"
                    : "hover:bg-muted"
                )}
              >
                <div className={cn(
                  "shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
                  client.avatarColor
                )}>
                  {client.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">{client.name}</span>
                    {client.id === "client-admin" && <Shield className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {client.id === "client-admin" ? "全局管理" : `${client.industry} · ${client.totalMaterials.toLocaleString()} 物料`}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <Badge variant={client.status === "active" ? "success" : client.status === "onboarding" ? "warning" : "muted"} className="text-[9px] px-1.5 py-0">
                    {client.status === "active" ? "运行" : client.status === "onboarding" ? "接入" : "暂停"}
                  </Badge>
                  {client.id === currentClient.id && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 border-t">
            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" />
              通过外部平台 SSO 自动登录
            </p>
          </div>
        </div>
      )}

      {/* Modal (折叠态) */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="切换客户账户"
        description="选择要操作的客户，数据将切换至对应客户视角"
        size="md"
        footer={
          <Button variant="outline" onClick={() => setModalOpen(false)}>关闭</Button>
        }
      >
        <div className="space-y-2">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => { handleSwitch(client); setModalOpen(false) }}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-lg text-left transition-smooth border",
                client.id === currentClient.id
                  ? "border-primary/30 bg-primary/5"
                  : "border-transparent hover:bg-muted"
              )}
            >
              <div className={cn(
                "shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-base font-bold shadow-md",
                client.avatarColor
              )}>
                {client.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{client.name}</span>
                  {client.id === "client-admin" && <Shield className="w-3.5 h-3.5 text-muted-foreground" />}
                  <Badge variant={client.status === "active" ? "success" : client.status === "onboarding" ? "warning" : "muted"}>
                    {client.status === "active" ? "运行中" : client.status === "onboarding" ? "接入中" : "已暂停"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{client.industry}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{client.contactName}</span>
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" />{client.totalMaterials.toLocaleString()}</span>
                </div>
                {client.platform && (
                  <p className="text-[10px] text-primary/70 mt-0.5 flex items-center gap-1">
                    <ArrowRightLeft className="w-2.5 h-2.5" />
                    {client.platform} SSO 对接
                  </p>
                )}
              </div>
              {client.id === currentClient.id && (
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

/** 顶部栏客户身份指示器 */
export function ClientBadge() {
  const { currentClient, isAdmin } = useClient()

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold",
        currentClient.avatarColor
      )}>
        {currentClient.avatar}
      </div>
      <div className="text-xs">
        <span className="font-medium text-foreground">{currentClient.shortName}</span>
        {isAdmin && <span className="text-muted-foreground ml-1">(管理员)</span>}
      </div>
    </div>
  )
}
