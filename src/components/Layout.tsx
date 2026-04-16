import { NavLink, Outlet } from "react-router-dom"
import {
  LayoutDashboard,
  Database,
  GitCompareArrows,
  Settings2,
  Bug,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Boxes,
  MessageSquareText,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useClient } from "@/components/ClientContext"
import { ClientSwitcher } from "@/components/ClientSwitcher"
import { Badge } from "@/components/ui/badge"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "项目总览" },
  { to: "/data-prep", icon: Database, label: "数据准备" },
  { to: "/similarity-match", icon: GitCompareArrows, label: "相似匹配" },
  { to: "/rules-config", icon: Settings2, label: "规则配置" },
  { to: "/prompt-management", icon: MessageSquareText, label: "提示词管理" },
  { to: "/badcase", icon: Bug, label: "BadCase" },
  { to: "/data-verify", icon: ClipboardCheck, label: "数据核查" },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { currentClient, isAdmin } = useClient()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — Apple dark glass */}
      <aside
        className={cn(
          "flex flex-col bg-gradient-sidebar shrink-0 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-[56px] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Boxes className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="text-[13px] font-semibold text-white tracking-tight whitespace-nowrap">一品多商</h1>
              <p className="text-[10px] text-white/40 whitespace-nowrap tracking-normal">智能商品匹配平台</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-apple group relative",
                  isActive
                    ? "bg-white/12 text-white font-medium"
                    : "text-white/50 hover:text-white/80 hover:bg-white/6"
                )
              }
            >
              <item.icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.6} />
              {!collapsed && (
                <span className="animate-fade-in whitespace-nowrap">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Client Switcher */}
        <div className="px-3 pb-2">
          <ClientSwitcher collapsed={collapsed} />
        </div>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-white/8">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full h-8 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/6 transition-apple"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Top bar — Apple glass effect */}
        <div className="sticky top-0 z-30 h-12 glass-light border-b border-border/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5 text-xs">
            <div className={cn(
              "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold",
              currentClient.avatarColor
            )}>
              {currentClient.avatar}
            </div>
            <span className="font-medium text-foreground">{currentClient.name}</span>
            {currentClient.platform && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-muted-foreground">{currentClient.platform}</span>
              </>
            )}
            {isAdmin && <Badge variant="muted" className="text-[10px] px-1.5 py-0 ml-1">管理员</Badge>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="tabular-nums">{currentClient.totalMaterials.toLocaleString()} 物料</span>
            <Badge variant={currentClient.status === "active" ? "success" : "warning"} className="text-[10px] px-2 py-0.5">
              {currentClient.status === "active" ? "运行中" : currentClient.status === "onboarding" ? "接入中" : "已暂停"}
            </Badge>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
