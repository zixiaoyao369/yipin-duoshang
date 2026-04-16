import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/StatCard"
import { Modal } from "@/components/Modal"
import { useToast } from "@/components/Toast"
import { useClient } from "@/components/ClientContext"
import {
  Bug, Search, Plus, Tag, AlertOctagon, TrendingDown,
  Eye, ArrowRight, Wrench, CheckCircle, Save, MessageSquare,
  ChevronRight, ExternalLink
} from "lucide-react"

interface BadCaseItem {
  id: string
  material: string
  expected: string
  actual: string
  category: string
  client: string
  severity: "high" | "medium" | "low"
  rootCause: string
  status: "open" | "fixing" | "resolved"
  date: string
  notes?: string
}

const initialData: BadCaseItem[] = [
  { id: "BC001", material: "食品级硅胶垫片", expected: "精确匹配 - 食品级硅胶O型圈", actual: "模糊匹配 - 普通硅胶密封圈", category: "密封件", client: "安琪酵母云图", severity: "high", rootCause: "特殊属性未识别", status: "open", date: "2026-04-09", notes: "食品级属性未被提取进入向量匹配" },
  { id: "BC002", material: "防静电地板蜡", expected: "精确匹配 - 防静电蜡水", actual: "未匹配", category: "清洁用品", client: "安琪酵母云图", severity: "medium", rootCause: "别称/同义词缺失", status: "fixing", date: "2026-04-08", notes: "需要在别称库中添加 地板蜡=蜡水 的映射关系" },
  { id: "BC003", material: "耐酸碱橡胶手套", expected: "精确匹配 - 防化学手套", actual: "模糊匹配 - 家用橡胶手套", category: "劳保防护", client: "京博石化", severity: "high", rootCause: "属性提取错误", status: "open", date: "2026-04-07" },
  { id: "BC004", material: "304不锈钢弯头 DN25", expected: "精确匹配 - 不锈钢90度弯头", actual: "精确匹配 - 不锈钢45度弯头", category: "管阀", client: "安琪酵母云图", severity: "medium", rootCause: "属性提取错误", status: "resolved", date: "2026-04-06", notes: "已修复角度属性提取逻辑" },
  { id: "BC005", material: "工字头螺钉 M5", expected: "精确匹配 - 一字头螺钉 M5", actual: "未匹配", category: "紧固件", client: "安琪酵母云图", severity: "low", rootCause: "别称/同义词缺失", status: "resolved", date: "2026-04-05", notes: "已添加特殊业务规则: 工字头=一字头螺钉" },
  { id: "BC006", material: "高温润滑脂 EP2", expected: "精确匹配 - 耐高温锂基脂", actual: "模糊匹配 - 通用润滑脂", category: "润滑油脂", client: "京博石化", severity: "high", rootCause: "向量权重偏差", status: "open", date: "2026-04-04" },
  { id: "BC007", material: "防爆电动葫芦 2T", expected: "精确匹配 - 防爆环链电动葫芦", actual: "未匹配", category: "起重搬运", client: "安琪酵母云图", severity: "medium", rootCause: "类目预测错误", status: "fixing", date: "2026-04-03" },
]

const rootCauses = [
  { cause: "特殊属性未识别", count: 38, pct: "29.7%" },
  { cause: "别称/同义词缺失", count: 28, pct: "21.9%" },
  { cause: "属性提取错误", count: 24, pct: "18.8%" },
  { cause: "向量权重偏差", count: 22, pct: "17.2%" },
  { cause: "类目预测错误", count: 16, pct: "12.5%" },
]

export default function BadCase() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { currentClient, isAdmin } = useClient()

  const [data, setData] = useState<BadCaseItem[]>(initialData)
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchText, setSearchText] = useState("")
  const [causeFilter, setCauseFilter] = useState<string | null>(null)

  // Modal states
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeCase, setActiveCase] = useState<BadCaseItem | null>(null)

  // Create form
  const [formMaterial, setFormMaterial] = useState("")
  const [formExpected, setFormExpected] = useState("")
  const [formActual, setFormActual] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formClient, setFormClient] = useState("安琪酵母云图")
  const [formSeverity, setFormSeverity] = useState<"high" | "medium" | "low">("medium")
  const [formRootCause, setFormRootCause] = useState("特殊属性未识别")

  // Filtered data — 非管理员只看当前客户的 BadCase
  const clientFilteredData = isAdmin ? data : data.filter((item) => item.client === currentClient.name)
  const filteredData = clientFilteredData.filter((item) => {
    const statusMatch = activeFilter === "all" || item.status === activeFilter
    const searchMatch = !searchText || item.material.includes(searchText) || item.rootCause.includes(searchText) || item.id.toLowerCase().includes(searchText.toLowerCase())
    const causeMatch = !causeFilter || item.rootCause === causeFilter
    return statusMatch && searchMatch && causeMatch
  })

  const stats = {
    total: clientFilteredData.length,
    open: clientFilteredData.filter((d) => d.status === "open").length,
    fixing: clientFilteredData.filter((d) => d.status === "fixing").length,
    resolved: clientFilteredData.filter((d) => d.status === "resolved").length,
  }

  const handleCreate = () => {
    if (!formMaterial.trim()) {
      addToast({ type: "warning", title: "请输入物料名称" })
      return
    }
    const newCase: BadCaseItem = {
      id: `BC${String(data.length + 1).padStart(3, "0")}`,
      material: formMaterial,
      expected: formExpected || "待确认",
      actual: formActual || "待确认",
      category: formCategory || "未分类",
      client: formClient,
      severity: formSeverity,
      rootCause: formRootCause,
      status: "open",
      date: new Date().toISOString().slice(0, 10),
    }
    setData((prev) => [newCase, ...prev])
    setCreateOpen(false)
    resetForm()
    addToast({ type: "success", title: "BadCase 已提交", description: `${newCase.id} - ${newCase.material}` })
  }

  const resetForm = () => {
    setFormMaterial(""); setFormExpected(""); setFormActual(""); setFormCategory("")
    setFormClient("安琪酵母云图"); setFormSeverity("medium"); setFormRootCause("特殊属性未识别")
  }

  const updateStatus = (item: BadCaseItem, newStatus: BadCaseItem["status"]) => {
    setData((prev) => prev.map((d) => d.id === item.id ? { ...d, status: newStatus, date: new Date().toISOString().slice(0, 10) } : d))
    const labels: Record<string, string> = { open: "待处理", fixing: "修复中", resolved: "已解决" }
    addToast({ type: newStatus === "resolved" ? "success" : "info", title: `状态已更新`, description: `${item.id} → ${labels[newStatus]}` })
    if (activeCase?.id === item.id) setActiveCase({ ...item, status: newStatus })
  }

  const openDetail = (item: BadCaseItem) => {
    setActiveCase(item)
    setDetailOpen(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">BadCase 管理</h1>
          <p className="text-sm text-muted-foreground mt-1">匹配失败案例沉淀与问题复盘追踪</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigate("/rules-config"); addToast({ type: "info", title: "前往规则配置", description: "可根据 BadCase 反馈调整匹配规则" }) }}>
            <Wrench className="w-4 h-4 mr-1.5" />调整规则
          </Button>
          <Button variant="premium" size="sm" onClick={() => { resetForm(); setCreateOpen(true) }}>
            <Plus className="w-4 h-4 mr-1.5" />新增 BadCase
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div onClick={() => setActiveFilter("all")} className="cursor-pointer">
          <StatCard title="总 BadCase" value={String(stats.total)} icon={Bug} />
        </div>
        <div onClick={() => setActiveFilter("open")} className="cursor-pointer">
          <StatCard title="待处理" value={String(stats.open)} change={`${((stats.open / stats.total) * 100).toFixed(1)}%`} changeType="down" icon={AlertOctagon} />
        </div>
        <div onClick={() => setActiveFilter("fixing")} className="cursor-pointer">
          <StatCard title="修复中" value={String(stats.fixing)} change={`${((stats.fixing / stats.total) * 100).toFixed(1)}%`} changeType="neutral" icon={TrendingDown} />
        </div>
        <div onClick={() => setActiveFilter("resolved")} className="cursor-pointer">
          <StatCard title="已解决" value={String(stats.resolved)} change={`${((stats.resolved / stats.total) * 100).toFixed(1)}% 解决率`} changeType="up" icon={Tag} />
        </div>
      </div>

      {/* Root Cause Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>根因分析汇总</CardTitle>
            {causeFilter && (
              <Button variant="outline" size="sm" onClick={() => setCauseFilter(null)}>清除筛选</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {rootCauses.map((item) => (
              <div
                key={item.cause}
                onClick={() => setCauseFilter(causeFilter === item.cause ? null : item.cause)}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-smooth ${
                  causeFilter === item.cause
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <p className="text-lg font-bold text-foreground">{item.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.cause}</p>
                <p className="text-[10px] text-muted-foreground">{item.pct}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索编号、物料名称或根因描述..."
            className="w-full h-9 pl-9 pr-4 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted">
          {[
            { key: "all", label: "全部" },
            { key: "open", label: "待处理" },
            { key: "fixing", label: "修复中" },
            { key: "resolved", label: "已解决" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-smooth ${
                activeFilter === f.key ? "bg-card text-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">物料</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">类目</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">期望 → 实际</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">严重度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">根因</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-smooth">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">{row.id}</span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium text-foreground text-xs">{row.material}</span>
                    <p className="text-[10px] text-muted-foreground">{row.client}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{row.category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-success truncate max-w-[120px]" title={row.expected}>{row.expected.replace("精确匹配 - ", "").replace("模糊匹配 - ", "")}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-destructive truncate max-w-[120px]" title={row.actual}>{row.actual.replace("精确匹配 - ", "").replace("模糊匹配 - ", "")}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={row.severity === "high" ? "destructive" : row.severity === "medium" ? "warning" : "muted"}>
                    {row.severity === "high" ? "高" : row.severity === "medium" ? "中" : "低"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{row.rootCause}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={row.status === "resolved" ? "success" : row.status === "fixing" ? "info" : "warning"}>
                    {row.status === "resolved" ? "已解决" : row.status === "fixing" ? "修复中" : "待处理"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openDetail(row)} className="p-1.5 rounded-md hover:bg-muted transition-smooth" title="查看详情">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    {row.status === "open" && (
                      <button onClick={() => updateStatus(row, "fixing")} className="p-1.5 rounded-md hover:bg-info/10 transition-smooth" title="开始修复">
                        <Wrench className="w-3.5 h-3.5 text-info" />
                      </button>
                    )}
                    {row.status === "fixing" && (
                      <button onClick={() => updateStatus(row, "resolved")} className="p-1.5 rounded-md hover:bg-success/10 transition-smooth" title="标记解决">
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                      </button>
                    )}
                    {row.status !== "open" && row.status !== "resolved" && (
                      <button
                        onClick={() => { navigate("/rules-config"); addToast({ type: "info", title: "跳转规则配置", description: `根据 ${row.id} 反馈调整规则` }) }}
                        className="p-1.5 rounded-md hover:bg-primary/10 transition-smooth"
                        title="调整规则"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                  没有找到匹配的 BadCase 记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>共 {filteredData.length} 条 BadCase{causeFilter ? ` (筛选: ${causeFilter})` : ""}</span>
        <Button variant="outline" size="sm" onClick={() => { navigate("/data-verify"); addToast({ type: "info", title: "前往数据核查", description: "查看版本对比和退化分析" }) }}>
          数据核查 <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={activeCase ? `${activeCase.id} - BadCase 详情` : "详情"}
        description={activeCase ? `${activeCase.client} / ${activeCase.category}` : ""}
        size="lg"
        footer={
          activeCase && (
            <>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
              {activeCase.status === "open" && (
                <Button variant="default" onClick={() => { updateStatus(activeCase, "fixing"); setDetailOpen(false) }}>
                  <Wrench className="w-4 h-4 mr-1.5" />开始修复
                </Button>
              )}
              {activeCase.status === "fixing" && (
                <Button variant="success" onClick={() => { updateStatus(activeCase, "resolved"); setDetailOpen(false) }}>
                  <CheckCircle className="w-4 h-4 mr-1.5" />标记已解决
                </Button>
              )}
              <Button variant="premium" onClick={() => {
                setDetailOpen(false)
                navigate("/rules-config")
                addToast({ type: "info", title: "跳转规则配置", description: `根据 ${activeCase.id} 分析结果优化规则` })
              }}>
                调整规则 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )
        }
      >
        {activeCase && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">物料名称</span>
                <p className="text-sm font-semibold text-foreground mt-1">{activeCase.material}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">严重度</span>
                <div className="mt-1">
                  <Badge variant={activeCase.severity === "high" ? "destructive" : activeCase.severity === "medium" ? "warning" : "muted"}>
                    {activeCase.severity === "high" ? "高" : activeCase.severity === "medium" ? "中" : "低"}
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">当前状态</span>
                <div className="mt-1">
                  <Badge variant={activeCase.status === "resolved" ? "success" : activeCase.status === "fixing" ? "info" : "warning"}>
                    {activeCase.status === "resolved" ? "已解决" : activeCase.status === "fixing" ? "修复中" : "待处理"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-success/20 bg-success/5">
                <span className="text-[10px] uppercase tracking-wider text-success">期望匹配结果</span>
                <p className="text-sm text-foreground mt-1">{activeCase.expected}</p>
              </div>
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <span className="text-[10px] uppercase tracking-wider text-destructive">实际匹配结果</span>
                <p className="text-sm text-foreground mt-1">{activeCase.actual}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <span className="text-[10px] uppercase tracking-wider text-warning">根因分析</span>
              <p className="text-sm font-medium text-foreground mt-1">{activeCase.rootCause}</p>
              {activeCase.notes && <p className="text-xs text-muted-foreground mt-1">{activeCase.notes}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">提交日期</span>
                <p className="text-sm text-foreground mt-1">{activeCase.date}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">所属客户</span>
                <p className="text-sm text-foreground mt-1">{activeCase.client}</p>
              </div>
            </div>

            {/* Suggestion */}
            <div className="p-3 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">修复建议</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {activeCase.rootCause === "特殊属性未识别"
                  ? "建议在规则配置中添加特殊属性识别规则，并更新提示词配置使其能提取相关属性标签。"
                  : activeCase.rootCause === "别称/同义词缺失"
                  ? "建议在特殊业务规则中添加别称映射关系，同时更新向量索引以覆盖同义词检索。"
                  : activeCase.rootCause === "属性提取错误"
                  ? "建议检查名称归一化提示词配置，优化属性提取逻辑，增加该类目的测试用例。"
                  : activeCase.rootCause === "向量权重偏差"
                  ? "建议在权重配置中调整对应类目的向量权重参数，增加关键属性的匹配权重。"
                  : "建议检查类目预测模型的训练数据，确认是否需要新增或调整类目映射关系。"}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Create BadCase Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新增 BadCase"
        description="记录匹配失败案例，推动规则迭代优化"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button variant="premium" onClick={handleCreate}><Save className="w-4 h-4 mr-1.5" />提交</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">物料名称 *</label>
              <input type="text" value={formMaterial} onChange={(e) => setFormMaterial(e.target.value)} placeholder="例如: 食品级硅胶垫片"
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">所属类目</label>
              <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="例如: 密封件"
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">期望匹配结果</label>
              <input type="text" value={formExpected} onChange={(e) => setFormExpected(e.target.value)} placeholder="正确的匹配结果"
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">实际匹配结果</label>
              <input type="text" value={formActual} onChange={(e) => setFormActual(e.target.value)} placeholder="系统返回的结果"
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">客户</label>
              <select value={formClient} onChange={(e) => setFormClient(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="安琪酵母云图">安琪酵母云图</option>
                <option value="京博石化">京博石化</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">严重度</label>
              <div className="flex items-center gap-2">
                {(["high", "medium", "low"] as const).map((s) => (
                  <button key={s} onClick={() => setFormSeverity(s)}
                    className={`flex-1 h-9 text-xs font-medium rounded-md border transition-smooth ${
                      formSeverity === s
                        ? s === "high" ? "border-destructive bg-destructive/10 text-destructive" : s === "medium" ? "border-warning bg-warning/10 text-warning" : "border-muted-foreground bg-muted text-muted-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {s === "high" ? "高" : s === "medium" ? "中" : "低"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">根因分类</label>
              <select value={formRootCause} onChange={(e) => setFormRootCause(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {rootCauses.map((r) => <option key={r.cause} value={r.cause}>{r.cause}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
