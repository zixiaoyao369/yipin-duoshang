import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/StatCard"
import { Modal } from "@/components/Modal"
import { useToast } from "@/components/Toast"
import {
  ClipboardCheck, GitCompareArrows, TrendingUp, Download,
  ChevronRight, AlertCircle, Eye, ArrowRight, Bug, RefreshCw,
  FileText, ArrowUpDown
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

interface VersionData {
  label: string
  data: Array<{ category: string; v1Exact: number; v1Fuzzy: number; v2Exact: number; v2Fuzzy: number }>
  gap: Array<{ category: string; total: number; improved: number; regressed: number; unchanged: number; newMatch: number }>
  regressions: Array<{ material: string; from: string; to: string; category: string; cause: string }>
  stats: { accuracy: string; accChange: string; improved: number; regressed: number; newMatch: number }
}

const versions: Record<string, VersionData> = {
  "V2.1 vs V2.0": {
    label: "V2.1 vs V2.0",
    stats: { accuracy: "89.2%", accChange: "+4.6%", improved: 955, regressed: 66, newMatch: 140 },
    data: [
      { category: "紧固件", v1Exact: 82, v1Fuzzy: 12, v2Exact: 91, v2Fuzzy: 6 },
      { category: "电气电工", v1Exact: 75, v1Fuzzy: 18, v2Exact: 86, v2Fuzzy: 10 },
      { category: "劳保防护", v1Exact: 78, v1Fuzzy: 15, v2Exact: 88, v2Fuzzy: 8 },
      { category: "五金工具", v1Exact: 70, v1Fuzzy: 20, v2Exact: 83, v2Fuzzy: 12 },
      { category: "管阀", v1Exact: 80, v1Fuzzy: 14, v2Exact: 89, v2Fuzzy: 7 },
      { category: "焊接", v1Exact: 65, v1Fuzzy: 22, v2Exact: 78, v2Fuzzy: 14 },
    ],
    gap: [
      { category: "紧固件", total: 3200, improved: 280, regressed: 12, unchanged: 2908, newMatch: 45 },
      { category: "电气电工", total: 2100, improved: 220, regressed: 18, unchanged: 1862, newMatch: 32 },
      { category: "劳保防护", total: 1800, improved: 180, regressed: 8, unchanged: 1612, newMatch: 28 },
      { category: "五金工具", total: 1400, improved: 165, regressed: 22, unchanged: 1213, newMatch: 20 },
      { category: "管阀", total: 1200, improved: 110, regressed: 6, unchanged: 1084, newMatch: 15 },
    ],
    regressions: [
      { material: "液压千斤顶 10T", from: "精确匹配→液压千斤顶", to: "模糊匹配→机械千斤顶", category: "五金工具", cause: "名称归一化过度简化" },
      { material: "防爆扳手 19mm", from: "精确匹配→防爆呆扳手", to: "未匹配", category: "五金工具", cause: "防爆属性权重调整导致" },
      { material: "耐高温密封胶", from: "模糊匹配→硅酮密封胶", to: "未匹配", category: "密封件", cause: "温度属性提取失败" },
    ],
  },
  "V2.0 vs V1.9": {
    label: "V2.0 vs V1.9",
    stats: { accuracy: "84.6%", accChange: "+3.2%", improved: 720, regressed: 45, newMatch: 98 },
    data: [
      { category: "紧固件", v1Exact: 76, v1Fuzzy: 16, v2Exact: 82, v2Fuzzy: 12 },
      { category: "电气电工", v1Exact: 68, v1Fuzzy: 22, v2Exact: 75, v2Fuzzy: 18 },
      { category: "劳保防护", v1Exact: 72, v1Fuzzy: 18, v2Exact: 78, v2Fuzzy: 15 },
      { category: "五金工具", v1Exact: 63, v1Fuzzy: 25, v2Exact: 70, v2Fuzzy: 20 },
      { category: "管阀", v1Exact: 74, v1Fuzzy: 17, v2Exact: 80, v2Fuzzy: 14 },
      { category: "焊接", v1Exact: 58, v1Fuzzy: 28, v2Exact: 65, v2Fuzzy: 22 },
    ],
    gap: [
      { category: "紧固件", total: 3200, improved: 195, regressed: 8, unchanged: 2997, newMatch: 28 },
      { category: "电气电工", total: 2100, improved: 148, regressed: 12, unchanged: 1940, newMatch: 22 },
      { category: "劳保防护", total: 1800, improved: 135, regressed: 6, unchanged: 1659, newMatch: 18 },
      { category: "五金工具", total: 1400, improved: 115, regressed: 14, unchanged: 1271, newMatch: 16 },
      { category: "管阀", total: 1200, improved: 82, regressed: 5, unchanged: 1113, newMatch: 14 },
    ],
    regressions: [
      { material: "六角法兰面螺栓 M12", from: "精确匹配→法兰面螺栓", to: "模糊匹配→六角螺栓", category: "紧固件", cause: "法兰面特征权重不足" },
      { material: "绝缘胶带 黑色", from: "精确匹配→PVC绝缘胶带", to: "模糊匹配→普通胶带", category: "电气电工", cause: "颜色属性干扰匹配" },
    ],
  },
  "V1.9 vs V1.8": {
    label: "V1.9 vs V1.8",
    stats: { accuracy: "81.4%", accChange: "+2.8%", improved: 560, regressed: 38, newMatch: 72 },
    data: [
      { category: "紧固件", v1Exact: 72, v1Fuzzy: 18, v2Exact: 76, v2Fuzzy: 16 },
      { category: "电气电工", v1Exact: 62, v1Fuzzy: 26, v2Exact: 68, v2Fuzzy: 22 },
      { category: "劳保防护", v1Exact: 66, v1Fuzzy: 22, v2Exact: 72, v2Fuzzy: 18 },
      { category: "五金工具", v1Exact: 58, v1Fuzzy: 28, v2Exact: 63, v2Fuzzy: 25 },
      { category: "管阀", v1Exact: 70, v1Fuzzy: 20, v2Exact: 74, v2Fuzzy: 17 },
      { category: "焊接", v1Exact: 52, v1Fuzzy: 32, v2Exact: 58, v2Fuzzy: 28 },
    ],
    gap: [
      { category: "紧固件", total: 3200, improved: 132, regressed: 10, unchanged: 3058, newMatch: 18 },
      { category: "电气电工", total: 2100, improved: 120, regressed: 8, unchanged: 1972, newMatch: 15 },
      { category: "劳保防护", total: 1800, improved: 108, regressed: 6, unchanged: 1686, newMatch: 14 },
      { category: "五金工具", total: 1400, improved: 98, regressed: 10, unchanged: 1292, newMatch: 12 },
      { category: "管阀", total: 1200, improved: 72, regressed: 4, unchanged: 1124, newMatch: 13 },
    ],
    regressions: [
      { material: "铜芯电缆 ZR-YJV 4x25", from: "精确匹配→铜芯电缆", to: "模糊匹配→铝芯电缆", category: "电气电工", cause: "材质属性提取失败" },
    ],
  },
}

export default function DataVerify() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [selectedVersion, setSelectedVersion] = useState("V2.1 vs V2.0")
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeRegression, setActiveRegression] = useState<{ material: string; from: string; to: string; category: string; cause: string } | null>(null)
  const [gapDetailOpen, setGapDetailOpen] = useState(false)
  const [activeGap, setActiveGap] = useState<VersionData["gap"][number] | null>(null)
  const [exporting, setExporting] = useState(false)

  const ver = versions[selectedVersion]
  const vParts = selectedVersion.split(" vs ")

  const handleExport = () => {
    setExporting(true)
    addToast({ type: "info", title: "正在生成报告...", description: "数据量较大，预计需要 5-10 秒" })
    setTimeout(() => {
      setExporting(false)
      addToast({ type: "success", title: "报告已生成", description: `${selectedVersion} 对比报告已下载到本地` })
    }, 2500)
  }

  const handleRerun = () => {
    addToast({ type: "info", title: "重新核查中...", description: "正在重新对比匹配结果，请稍候" })
    setTimeout(() => {
      addToast({ type: "success", title: "核查完成", description: "最新数据已刷新" })
    }, 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">数据核查</h1>
          <p className="text-sm text-muted-foreground mt-1">版本对比看板 — 定位匹配差异、优化规则精准度</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedVersion}
            onChange={(e) => {
              setSelectedVersion(e.target.value)
              addToast({ type: "info", title: "版本已切换", description: `当前查看: ${e.target.value}` })
            }}
            className="h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Object.keys(versions).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={handleRerun}>
            <RefreshCw className="w-4 h-4 mr-1.5" />重新核查
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className={`w-4 h-4 mr-1.5 ${exporting ? "animate-pulse" : ""}`} />
            {exporting ? "生成中..." : "导出报告"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => addToast({ type: "info", title: "整体准确率", description: `当前版本 ${selectedVersion} 准确率为 ${ver.stats.accuracy}` })}>
          <StatCard title="整体准确率" value={ver.stats.accuracy} change={`${ver.stats.accChange} vs ${vParts[1]}`} changeType="up" icon={TrendingUp} />
        </div>
        <div className="cursor-pointer" onClick={() => addToast({ type: "success", title: "改善详情", description: `共 ${ver.stats.improved} 条匹配结果得到改善` })}>
          <StatCard title="改善条目" value={String(ver.stats.improved)} change={`+${((ver.stats.improved / 9700) * 100).toFixed(1)}%`} changeType="up" icon={ClipboardCheck} />
        </div>
        <div className="cursor-pointer" onClick={() => {
          addToast({ type: "warning", title: "退化条目需关注", description: `${ver.stats.regressed} 条匹配结果出现退化` })
        }}>
          <StatCard title="退化条目" value={String(ver.stats.regressed)} change={`${((ver.stats.regressed / 9700) * 100).toFixed(1)}% 需关注`} changeType="down" icon={AlertCircle} />
        </div>
        <div className="cursor-pointer" onClick={() => addToast({ type: "info", title: "新增覆盖", description: `${ver.stats.newMatch} 条物料从未匹配变为已匹配` })}>
          <StatCard title="新增匹配" value={String(ver.stats.newMatch)} change={`${((ver.stats.newMatch / 9700) * 100).toFixed(1)}% 新覆盖`} changeType="up" icon={GitCompareArrows} />
        </div>
      </div>

      {/* Version Comparison Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>版本对比: {selectedVersion}</CardTitle>
              <CardDescription>各类目精确匹配率变化对比</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-info" />{vParts[1]} 精确</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary" />{vParts[0]} 精确</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ver.data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 13% 91%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Bar dataKey="v1Exact" name={`${vParts[1]} 精确匹配`} fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="v2Exact" name={`${vParts[0]} 精确匹配`} fill="hsl(217 91% 50%)" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gap Analysis Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gap 分析明细</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="info">{selectedVersion}</Badge>
              <Button variant="outline" size="sm" onClick={() => {
                navigate("/badcase")
                addToast({ type: "info", title: "查看 BadCase", description: "查看详细失败案例" })
              }}>
                <Bug className="w-3.5 h-3.5 mr-1.5" />BadCase 管理
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">类目</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">总数</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    <span className="text-success">改善 ↑</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    <span className="text-destructive">退化 ↓</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">不变</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    <span className="text-primary">新增匹配</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">改善率</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {ver.gap.map((row) => (
                  <tr key={row.category} className="border-b last:border-0 hover:bg-muted/30 transition-smooth cursor-pointer" onClick={() => { setActiveGap(row); setGapDetailOpen(true) }}>
                    <td className="px-4 py-3 font-medium text-foreground">{row.category}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-success font-medium">+{row.improved}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-destructive font-medium">-{row.regressed}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.unchanged.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-primary font-medium">+{row.newMatch}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="success">{((row.improved / row.total) * 100).toFixed(1)}%</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-smooth" onClick={(e) => { e.stopPropagation(); setActiveGap(row); setGapDetailOpen(true) }}>
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Regression Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              退化案例 — 需关注
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => {
              navigate("/badcase")
              addToast({ type: "info", title: "提交至 BadCase", description: "退化案例将自动转为 BadCase 进行跟踪" })
            }}>
              <Bug className="w-3.5 h-3.5 mr-1.5" />批量提交 BadCase
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ver.regressions.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-smooth cursor-pointer"
                onClick={() => { setActiveRegression(item); setDetailOpen(true) }}
              >
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.material}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="text-success">{item.from}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-destructive">{item.to}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="muted">{item.category}</Badge>
                  <span className="text-xs text-muted-foreground">{item.cause}</span>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setActiveRegression(item); setDetailOpen(true) }}>
                    <Eye className="w-3.5 h-3.5 mr-1" />查看
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate("/badcase")}>
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" />BadCase 管理
        </Button>
        <Button variant="outline" size="sm" onClick={() => { navigate("/data-prep"); addToast({ type: "info", title: "回到起点", description: "从数据准备开始新一轮匹配流程" }) }}>
          开始新一轮匹配 <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Regression Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="退化案例详情"
        description={activeRegression ? `${activeRegression.category} - ${activeRegression.material}` : ""}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
            <Button variant="outline" onClick={() => {
              setDetailOpen(false)
              navigate("/badcase")
              addToast({ type: "info", title: "已转入 BadCase", description: `${activeRegression?.material} 将作为 BadCase 进行跟踪` })
            }}>
              <Bug className="w-4 h-4 mr-1.5" />转入 BadCase
            </Button>
            <Button variant="premium" onClick={() => {
              setDetailOpen(false)
              navigate("/rules-config")
              addToast({ type: "info", title: "前往调整规则", description: `根据退化原因「${activeRegression?.cause}」调整匹配规则` })
            }}>
              调整规则 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        }
      >
        {activeRegression && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">物料名称</span>
                <p className="text-sm font-semibold text-foreground mt-1">{activeRegression.material}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">所属类目</span>
                <p className="text-sm font-semibold text-foreground mt-1">{activeRegression.category}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-success/20 bg-success/5">
                <span className="text-[10px] uppercase tracking-wider text-success">上一版本结果 ({vParts[1]})</span>
                <p className="text-sm text-foreground mt-1 font-medium">{activeRegression.from}</p>
              </div>
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <span className="text-[10px] uppercase tracking-wider text-destructive">当前版本结果 ({vParts[0]})</span>
                <p className="text-sm text-foreground mt-1 font-medium">{activeRegression.to}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <span className="text-[10px] uppercase tracking-wider text-warning">退化原因</span>
              <p className="text-sm font-medium text-foreground mt-1">{activeRegression.cause}</p>
              <p className="text-xs text-muted-foreground mt-1">建议回滚相关规则变更或创建针对性修复 Skill</p>
            </div>

            <div className="p-3 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">影响评估</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-muted/30 rounded">
                  <p className="font-bold text-foreground">1</p>
                  <p className="text-muted-foreground">直接影响物料</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded">
                  <p className="font-bold text-foreground">{activeRegression.category}</p>
                  <p className="text-muted-foreground">影响类目</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded">
                  <p className="font-bold text-destructive">需回滚</p>
                  <p className="text-muted-foreground">建议操作</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Gap Detail Modal */}
      <Modal
        open={gapDetailOpen}
        onClose={() => setGapDetailOpen(false)}
        title={activeGap ? `${activeGap.category} — Gap 分析` : "Gap 分析"}
        description={`版本对比: ${selectedVersion}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setGapDetailOpen(false)}>关闭</Button>
            <Button variant="outline" onClick={() => {
              setGapDetailOpen(false)
              navigate("/similarity-match")
              addToast({ type: "info", title: "查看匹配详情", description: `跳转至相似匹配查看 ${activeGap?.category} 详细结果` })
            }}>
              查看匹配详情 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        }
      >
        {activeGap && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-lg font-bold text-foreground">{activeGap.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">总物料数</p>
              </div>
              <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-center">
                <p className="text-lg font-bold text-success">+{activeGap.improved}</p>
                <p className="text-xs text-muted-foreground">改善</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
                <p className="text-lg font-bold text-destructive">-{activeGap.regressed}</p>
                <p className="text-xs text-muted-foreground">退化</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-lg font-bold text-primary">+{activeGap.newMatch}</p>
                <p className="text-xs text-muted-foreground">新增匹配</p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">改善率</span>
                  <span className="font-medium text-success">{((activeGap.improved / activeGap.total) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${(activeGap.improved / activeGap.total) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">退化率</span>
                  <span className="font-medium text-destructive">{((activeGap.regressed / activeGap.total) * 100).toFixed(2)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-destructive transition-all duration-500" style={{ width: `${Math.max((activeGap.regressed / activeGap.total) * 100, 1)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">不变占比</span>
                  <span className="font-medium text-foreground">{((activeGap.unchanged / activeGap.total) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-foreground/20 transition-all duration-500" style={{ width: `${(activeGap.unchanged / activeGap.total) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">分析结论：</strong>
                {activeGap.category}类目在 {selectedVersion} 中改善{activeGap.improved}条
                （改善率 {((activeGap.improved / activeGap.total) * 100).toFixed(1)}%），
                退化{activeGap.regressed}条（退化率 {((activeGap.regressed / activeGap.total) * 100).toFixed(2)}%），
                新增覆盖{activeGap.newMatch}条。
                {activeGap.regressed > 15 ? "退化条目较多，建议重点关注并回滚相关规则变更。" : "整体表现良好，退化在可接受范围内。"}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
