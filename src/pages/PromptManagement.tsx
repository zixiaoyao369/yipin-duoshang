import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/Modal"
import { useToast } from "@/components/Toast"
import { useClient } from "@/components/ClientContext"
import {
  MessageSquareText, Plus, Search, Download, Upload, Eye, Edit3, Trash2,
  Copy, Clock, FileSpreadsheet, FolderTree, ChevronRight, Check, X,
  Lock, Bot, History, Tag, Filter, MoreHorizontal
} from "lucide-react"
import * as XLSX from "xlsx"

interface PromptTemplate {
  id: string
  name: string
  description: string
  client: string
  categories: string[]
  template: string
  variables: string[]
  promptEntries: { cat1: string; cat2: string; cat3: string; prompt: string }[]
  version: number
  status: "published" | "draft" | "archived"
  createdAt: string
  updatedAt: string
  author: string
}

const initialPrompts: PromptTemplate[] = [
  {
    id: "1", name: "紧固件归一化提示词", description: "螺栓、螺母、垫圈等紧固件产品的名称归一化", client: "安琪酵母云图",
    categories: ["紧固件"], template: "你是一个专业的物料名称归一化助手。\n将输入的 {{材料名}} 按材料、功能、规格等维度拆分为最小语义单元。", variables: ["材料名", "规格", "型号", "供应商"],
    promptEntries: [
      { cat1: "紧固件", cat2: "螺栓", cat3: "六角螺栓", prompt: "将{{材料名}}按螺栓类型、强度等级、表面处理拆分归一化" },
      { cat1: "紧固件", cat2: "螺母", cat3: "六角螺母", prompt: "将{{材料名}}按螺母类型、材质、规格尺寸拆分归一化" },
      { cat1: "紧固件", cat2: "垫圈", cat3: "平垫圈", prompt: "将{{材料名}}按垫圈类型、材质、内外径拆分归一化" },
    ],
    version: 3, status: "published", createdAt: "2026-03-15", updatedAt: "2026-04-09", author: "张工"
  },
  {
    id: "2", name: "电气电工归一化提示词", description: "开关、断路器、电缆等电气产品归一化", client: "安琪酵母云图",
    categories: ["电气电工"], template: "你是一个专业的电气物料名称标准化助手。\n将 {{材料名}} 按照电气参数、品牌规格进行标准化处理。", variables: ["材料名", "规格", "型号", "供应商"],
    promptEntries: [
      { cat1: "电气电工", cat2: "开关", cat3: "断路器", prompt: "将{{材料名}}按电气参数(额定电流/电压)、品牌、极数拆分归一化" },
      { cat1: "电气电工", cat2: "电缆", cat3: "控制电缆", prompt: "将{{材料名}}按线芯数、截面积、绝缘材料、电压等级拆分归一化" },
    ],
    version: 2, status: "published", createdAt: "2026-03-20", updatedAt: "2026-04-08", author: "张工"
  },
  {
    id: "3", name: "化工产品归一化提示词", description: "化工原料名称标准化及别称映射", client: "京博石化",
    categories: ["化工原料"], template: "你是化工产品名称标准化助手。\n将 {{材料名}} 进行标准化处理，识别别称和简称。", variables: ["材料名", "规格", "型号", "供应商"],
    promptEntries: [
      { cat1: "化工原料", cat2: "有机化工", cat3: "醇类", prompt: "将{{材料名}}识别化学名/商品名/别称，标准化为IUPAC命名" },
      { cat1: "化工原料", cat2: "无机化工", cat3: "酸类", prompt: "将{{材料名}}按化学式、浓度、纯度等级拆分归一化" },
    ],
    version: 1, status: "draft", createdAt: "2026-04-01", updatedAt: "2026-04-04", author: "李工"
  },
  {
    id: "4", name: "通用归一化提示词 v2", description: "跨客户通用的物料名称归一化规则", client: "安琪酵母云图",
    categories: [], template: "你是一个专业的物料名称归一化助手。\n将输入的 {{材料名}} 按材料、功能、规格等维度拆分为最小语义单元。\n\n输出格式:\n- 标准名称: <归一化后的名称>\n- 材质: {{规格}}\n- 型号: {{型号}}", variables: ["材料名", "规格", "型号", "供应商"],
    promptEntries: [],
    version: 2, status: "published", createdAt: "2026-03-10", updatedAt: "2026-04-10", author: "张工"
  },
  {
    id: "5", name: "五金工具归一化提示词", description: "扳手、钳子、锤子等五金工具标准化", client: "安琪酵母云图",
    categories: ["五金工具"], template: "你是五金工具名称归一化助手。\n将 {{材料名}} 按工具类型、规格尺寸、材质进行标准化。", variables: ["材料名", "规格", "型号"],
    promptEntries: [
      { cat1: "五金工具", cat2: "扳手", cat3: "活动扳手", prompt: "将{{材料名}}按扳手类型、开口尺寸、材质拆分归一化" },
      { cat1: "五金工具", cat2: "钳子", cat3: "尖嘴钳", prompt: "将{{材料名}}按钳子类型、长度、材质拆分归一化" },
    ],
    version: 1, status: "archived", createdAt: "2026-03-05", updatedAt: "2026-03-28", author: "王工"
  },
]

const versionHistory = [
  { version: 3, date: "2026-04-09", author: "张工", changes: "新增垫圈类目提示词，优化螺栓拆分规则" },
  { version: 2, date: "2026-03-25", author: "张工", changes: "增加螺母类目，调整变量顺序" },
  { version: 1, date: "2026-03-15", author: "张工", changes: "初始版本，包含螺栓基础提示词" },
]

export default function PromptManagement() {
  const { addToast } = useToast()
  const { currentClient } = useClient()

  const [prompts, setPrompts] = useState<PromptTemplate[]>(initialPrompts)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterClient, setFilterClient] = useState<string | null>(null)

  // Modal states
  const [detailOpen, setDetailOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [activePrompt, setActivePrompt] = useState<PromptTemplate | null>(null)

  const clients = [...new Set(prompts.map((p) => p.client))]

  const filtered = prompts.filter((p) => {
    if (searchQuery && !p.name.includes(searchQuery) && !p.description.includes(searchQuery) && !p.categories.some((c) => c.includes(searchQuery))) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterClient && p.client !== filterClient) return false
    return true
  })

  const statusLabels: Record<string, string> = { published: "已发布", draft: "草稿", archived: "已归档" }
  const statusVariants: Record<string, "success" | "warning" | "muted"> = { published: "success", draft: "warning", archived: "muted" }

  const stats = {
    total: prompts.length,
    published: prompts.filter((p) => p.status === "published").length,
    draft: prompts.filter((p) => p.status === "draft").length,
    totalEntries: prompts.reduce((s, p) => s + p.promptEntries.length, 0),
  }

  const handleDuplicate = (prompt: PromptTemplate) => {
    const dup: PromptTemplate = {
      ...prompt, id: Date.now().toString(), name: prompt.name + " (副本)",
      status: "draft", version: 1, createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      promptEntries: [...prompt.promptEntries],
    }
    setPrompts((prev) => [dup, ...prev])
    addToast({ type: "info", title: "提示词已复制", description: `"${prompt.name}" 的副本已创建` })
  }

  const handleDelete = () => {
    if (!activePrompt) return
    setPrompts((prev) => prev.filter((p) => p.id !== activePrompt.id))
    setDeleteOpen(false)
    addToast({ type: "success", title: "提示词已删除", description: `"${activePrompt.name}" 已移除` })
    setActivePrompt(null)
  }

  const handleExportAll = () => {
    const wb = XLSX.utils.book_new()
    for (const prompt of filtered) {
      if (prompt.promptEntries.length === 0) continue
      const data = [
        ["一级类目", "二级类目", "三级类目", "提示词"],
        ...prompt.promptEntries.map((e) => [e.cat1, e.cat2, e.cat3, e.prompt]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 50 }]
      const sheetName = prompt.name.slice(0, 31).replace(/[\\/*?[\]]/g, "_")
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
    XLSX.writeFile(wb, `提示词配置_导出_${new Date().toISOString().slice(0, 10)}.xlsx`)
    addToast({ type: "success", title: "导出成功", description: `已导出 ${filtered.length} 个提示词配置` })
  }

  const handleExportSingle = (prompt: PromptTemplate) => {
    const wb = XLSX.utils.book_new()
    const data = [
      ["一级类目", "二级类目", "三级类目", "提示词"],
      ...prompt.promptEntries.map((e) => [e.cat1, e.cat2, e.cat3, e.prompt]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, ws, "提示词配置")
    // 追加基础信息 sheet
    const infoData = [
      ["配置项", "值"],
      ["名称", prompt.name],
      ["描述", prompt.description],
      ["客户", prompt.client],
      ["类目", prompt.categories.join("、") || "全局"],
      ["版本", `v${prompt.version}`],
      ["基础模板", prompt.template],
    ]
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
    wsInfo["!cols"] = [{ wch: 12 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsInfo, "基础信息")
    XLSX.writeFile(wb, `${prompt.name}_v${prompt.version}.xlsx`)
    addToast({ type: "success", title: "导出成功" })
  }

  const toggleStatus = (prompt: PromptTemplate) => {
    const newStatus = prompt.status === "published" ? "archived" : "published"
    setPrompts((prev) => prev.map((p) => p.id === prompt.id ? { ...p, status: newStatus, updatedAt: new Date().toISOString().slice(0, 10) } : p))
    addToast({ type: newStatus === "published" ? "success" : "warning", title: newStatus === "published" ? "提示词已发布" : "提示词已归档" })
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">提示词管理</h1>
          <p className="text-sm text-muted-foreground mt-1">集中管理各类目归一化提示词模板，支持版本控制与批量导入导出</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="w-4 h-4 mr-1" />批量导出
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1" />批量导入
          </Button>
          <Button variant="premium" size="sm" onClick={() => addToast({ type: "info", title: "功能提示", description: "请在「规则配置」页面的提示词 Skill 中创建和编辑提示词" })}>
            <Plus className="w-4 h-4 mr-1.5" />新建提示词
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "提示词总数", value: stats.total, icon: MessageSquareText, color: "text-primary" },
          { label: "已发布", value: stats.published, icon: Check, color: "text-success" },
          { label: "草稿", value: stats.draft, icon: Edit3, color: "text-warning" },
          { label: "类目配置条数", value: stats.totalEntries, icon: FolderTree, color: "text-info" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索提示词名称、描述、类目..."
              className="w-full h-9 pl-9 pr-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <button onClick={() => setFilterStatus(null)}
              className={`px-2.5 py-1 text-xs rounded-full transition-smooth ${!filterStatus ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              全部
            </button>
            {(["published", "draft", "archived"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                className={`px-2.5 py-1 text-xs rounded-full transition-smooth ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {clients.map((c) => (
              <button key={c} onClick={() => setFilterClient(filterClient === c ? null : c)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-smooth ${filterClient === c ? "bg-primary/10 border-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            暂无匹配的提示词配置
          </div>
        )}
        {filtered.map((prompt) => (
          <Card key={prompt.id} className="hover:shadow-card transition-smooth group">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => { setActivePrompt(prompt); setDetailOpen(true) }}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    prompt.status === "published" ? "bg-success/10" : prompt.status === "draft" ? "bg-warning/10" : "bg-muted"
                  }`}>
                    <MessageSquareText className={`w-5 h-5 ${
                      prompt.status === "published" ? "text-success" : prompt.status === "draft" ? "text-warning" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{prompt.name}</span>
                      <Badge variant={statusVariants[prompt.status]}>{statusLabels[prompt.status]}</Badge>
                      <Badge variant="outline">v{prompt.version}</Badge>
                      <span className="text-[10px] text-muted-foreground">{prompt.client}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{prompt.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        {prompt.categories.length > 0 ? prompt.categories.map((c) => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/70">{c}</span>
                        )) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">全局</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FolderTree className="w-3 h-3" />{prompt.promptEntries.length} 条类目配置
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3 h-3" />{prompt.variables.length} 个变量
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{prompt.updatedAt}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{prompt.author}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  <button onClick={() => { setActivePrompt(prompt); setDetailOpen(true) }}
                    className="p-1.5 rounded-md hover:bg-muted transition-smooth" title="查看详情">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => { setActivePrompt(prompt); setHistoryOpen(true) }}
                    className="p-1.5 rounded-md hover:bg-muted transition-smooth" title="版本历史">
                    <History className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleExportSingle(prompt)}
                    className="p-1.5 rounded-md hover:bg-muted transition-smooth" title="导出 Excel">
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDuplicate(prompt)}
                    className="p-1.5 rounded-md hover:bg-muted transition-smooth" title="复制">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => toggleStatus(prompt)}
                    className="p-1.5 rounded-md hover:bg-muted transition-smooth" title={prompt.status === "published" ? "归档" : "发布"}>
                    {prompt.status === "published"
                      ? <Badge variant="success" className="text-[10px] px-1.5 py-0 cursor-pointer">发布中</Badge>
                      : <Badge variant="muted" className="text-[10px] px-1.5 py-0 cursor-pointer">未发布</Badge>
                    }
                  </button>
                  <button onClick={() => { setActivePrompt(prompt); setDeleteOpen(true) }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-smooth" title="删除">
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={activePrompt?.name || "提示词详情"}
        description={activePrompt ? `${activePrompt.client} · v${activePrompt.version} · ${activePrompt.author}` : ""}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
            {activePrompt && (
              <Button variant="outline" onClick={() => { handleExportSingle(activePrompt); setDetailOpen(false) }}>
                <Download className="w-3.5 h-3.5 mr-1" />导出 Excel
              </Button>
            )}
          </>
        }
      >
        {activePrompt && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">状态</span>
                <div className="mt-1"><Badge variant={statusVariants[activePrompt.status]}>{statusLabels[activePrompt.status]}</Badge></div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">版本</span>
                <p className="text-sm font-medium text-foreground mt-1">v{activePrompt.version}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">类目</span>
                <p className="text-sm font-medium text-foreground mt-1">{activePrompt.categories.join("、") || "全局"}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">基础模板</span>
              <pre className="text-xs text-foreground mt-2 font-mono whitespace-pre-wrap leading-relaxed">{activePrompt.template}</pre>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">变量</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activePrompt.variables.map((v) => (
                  <span key={v} className="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary font-mono">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>
            {activePrompt.promptEntries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">类目级提示词配置</span>
                  <Badge variant="muted" className="text-[10px] px-1.5 py-0">{activePrompt.promptEntries.length} 条</Badge>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_1fr_2fr] gap-0 bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    <span>一级类目</span><span>二级类目</span><span>三级类目</span><span>提示词</span>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto">
                    {activePrompt.promptEntries.map((e, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2fr] gap-0 items-center px-3 py-2 border-t text-xs">
                        <span className="text-foreground font-medium">{e.cat1}</span>
                        <span className="text-foreground">{e.cat2}</span>
                        <span className="text-foreground">{e.cat3}</span>
                        <span className="text-muted-foreground font-mono text-[11px]">{e.prompt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Version History Modal */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="版本历史"
        description={activePrompt ? `${activePrompt.name} 的变更记录` : ""}
        size="md"
        footer={<Button variant="outline" onClick={() => setHistoryOpen(false)}>关闭</Button>}
      >
        <div className="space-y-3">
          {versionHistory.map((v) => (
            <div key={v.version} className={`flex items-start gap-3 p-3 rounded-lg border ${v.version === (activePrompt?.version || 0) ? "border-primary bg-primary/5" : "bg-muted/20"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${v.version === (activePrompt?.version || 0) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <span className="text-xs font-bold">v{v.version}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{v.changes}</span>
                  {v.version === (activePrompt?.version || 0) && <Badge variant="success">当前版本</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span>{v.date}</span>
                  <span>{v.author}</span>
                </div>
              </div>
              {v.version !== (activePrompt?.version || 0) && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => addToast({ type: "info", title: "回滚提示", description: `将回滚至 v${v.version}，此为原型演示` })}>
                  回滚
                </Button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="确认删除"
        description="此操作不可撤销"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-1.5" />确认删除</Button>
          </>
        }
      >
        {activePrompt && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-sm text-foreground">确定要删除「<strong>{activePrompt.name}</strong>」吗？</p>
            <p className="text-xs text-muted-foreground mt-1">删除后将无法恢复，已发布的版本将同时失效</p>
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="批量导入提示词"
        description="上传 Excel 文件批量导入提示词配置"
        size="md"
        footer={<Button variant="outline" onClick={() => setImportOpen(false)}>关闭</Button>}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8 rounded-lg border-2 border-dashed bg-muted/10 cursor-pointer hover:bg-muted/20 transition-smooth"
            onClick={() => addToast({ type: "info", title: "导入提示", description: "此为原型演示，实际环境将打开文件选择器" })}>
            <div className="text-center">
              <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">点击或拖拽上传 Excel 文件</p>
              <p className="text-xs text-muted-foreground mt-1">支持 .xlsx / .xls 格式，每个 Sheet 对应一个提示词配置</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs font-semibold text-foreground mb-2">Excel 格式说明</p>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <p>1. 每个 Sheet 名称作为提示词配置名称</p>
              <p>2. 表头行：一级类目 | 二级类目 | 三级类目 | 提示词</p>
              <p>3. 数据行：每行对应一条类目级提示词配置</p>
              <p>4. 可选：增加「基础信息」Sheet 包含名称、描述、客户等元数据</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
