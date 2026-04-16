import { useNavigate } from "react-router-dom"
import { useToast } from "@/components/Toast"
import { useClient } from "@/components/ClientContext"
import { StatCard } from "@/components/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Package, FolderTree, GitCompareArrows, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, Users, ExternalLink
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from "recharts"

const matchTrend = [
  { date: "03/01", exact: 25.6, fuzzy: 10.6, unmatched: 63.8, exactCount: 39, fuzzyCount: 16, unmatchedCount: 97 },
  { date: "03/05", exact: 39.1, fuzzy: 16.3, unmatched: 44.7, exactCount: 59, fuzzyCount: 25, unmatchedCount: 68 },
  { date: "03/10", exact: 52.5, fuzzy: 22.2, unmatched: 25.3, exactCount: 80, fuzzyCount: 34, unmatchedCount: 38 },
  { date: "03/15", exact: 58.5, fuzzy: 24.0, unmatched: 17.5, exactCount: 89, fuzzyCount: 36, unmatchedCount: 27 },
  { date: "03/20", exact: 62.0, fuzzy: 25.6, unmatched: 12.4, exactCount: 94, fuzzyCount: 39, unmatchedCount: 19 },
  { date: "03/25", exact: 64.8, fuzzy: 26.0, unmatched: 9.2, exactCount: 99, fuzzyCount: 39, unmatchedCount: 14 },
  { date: "03/30", exact: 66.5, fuzzy: 26.8, unmatched: 6.8, exactCount: 101, fuzzyCount: 41, unmatchedCount: 10 },
]

const versionMarkers = [
  { date: "03/01", label: "V1" },
  { date: "03/10", label: "V2" },
]

const catDist = [
  { name: "紧固件", value: 3200, color: "hsl(217 91% 50%)" },
  { name: "电气电工", value: 2100, color: "hsl(152 69% 42%)" },
  { name: "劳保防护", value: 1800, color: "hsl(38 92% 50%)" },
  { name: "五金工具", value: 1400, color: "hsl(199 89% 48%)" },
  { name: "其他", value: 900, color: "hsl(220 9% 46%)" },
]

const stageSteps = ["数据准备", "类目匹配", "相似匹配"] as const

const clients = [
  { name: "安琪酵母云图", status: "进行中", progress: 72, total: 12000, cat1: 6, cat2: 38, cat3: 152, stage: "相似匹配", est: "2026-05-15" },
  { name: "京博石化", status: "进行中", progress: 45, total: 8500, cat1: 5, cat2: 28, cat3: 96, stage: "类目匹配", est: "2026-06-01" },
  { name: "万华化学", status: "待启动", progress: 0, total: 15000, cat1: 8, cat2: 45, cat3: 210, stage: "数据准备", est: "待确认" },
]

const accByCat = [
  { category: "紧固件", accuracy: 94 },
  { category: "电气电工", accuracy: 89 },
  { category: "劳保防护", accuracy: 91 },
  { category: "五金工具", accuracy: 87 },
  { category: "管阀", accuracy: 92 },
  { category: "焊接", accuracy: 85 },
]

const acts = [
  { icon: CheckCircle2, color: "text-success", text: "安琪酵母云图 - 紧固件类目匹配完成，准确率 94.2%", time: "10 分钟前", link: "/data-prep" },
  { icon: Clock, color: "text-info", text: "京博石化 - 第二批物料数据已导入，共 3,200 条", time: "1 小时前", link: "/data-prep" },
  { icon: AlertTriangle, color: "text-warning", text: "安琪酵母云图 - 电气电工类目发现 23 条 BadCase", time: "2 小时前", link: "/badcase" },
  { icon: GitCompareArrows, color: "text-primary", text: "安琪酵母云图 - 五金工具类相似匹配已启动", time: "3 小时前", link: "/similarity-match" },
  { icon: CheckCircle2, color: "text-success", text: "京博石化 - 客户已确认第一批类目映射数据", time: "5 小时前", link: "/data-prep" },
]

export default function Dashboard() {
  const nav = useNavigate()
  const { addToast } = useToast()
  const { currentClient, isAdmin } = useClient()

  const go = (path: string, title: string, desc: string) => {
    nav(path)
    addToast({ type: "info", title, description: desc })
  }

  const stageMap: Record<string, string> = { "数据准备": "/data-prep", "相似匹配": "/similarity-match" }

  // 根据当前客户动态显示数据
  const clientStats: Record<string, { materials: string; matched: string; similarity: string; coverage: string }> = {
    "client-anqi": { materials: "12,000", matched: "9,480", similarity: "7,640", coverage: "79.0%" },
    "client-jingbo": { materials: "8,500", matched: "5,100", similarity: "3,200", coverage: "60.0%" },
    "client-wanhua": { materials: "15,000", matched: "0", similarity: "0", coverage: "0%" },
    "client-admin": { materials: "35,500", matched: "28,200", similarity: "18,640", coverage: "79.4%" },
  }
  const stats = clientStats[currentClient.id] || clientStats["client-admin"]

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isAdmin ? "项目总览" : `${currentClient.shortName} · 项目总览`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "一品多商智能匹配平台运营数据概览" : `${currentClient.name} 匹配项目数据概览`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">实时数据</Badge>
          <span className="text-xs text-muted-foreground">更新于 2026-04-10 14:30</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => go("/data-prep", "查看物料数据", "跳转至数据准备模块")}><StatCard title="物料总数" value={stats.materials} change="+2,400 本月新增" changeType="up" icon={Package} /></div>
        <div className="cursor-pointer" onClick={() => go("/similarity-match", "查看相似匹配", "跳转至相似匹配模块")}><StatCard title="已匹配一级类目" value={stats.matched} change={`覆盖率 ${stats.coverage}`} changeType="up" icon={FolderTree} /></div>
        <div className="cursor-pointer" onClick={() => go("/similarity-match", "查看相似匹配", "跳转至相似匹配模块")}><StatCard title="相似匹配完成" value={stats.similarity} change="精确匹配 68%" changeType="up" icon={GitCompareArrows} /></div>
        <div className="cursor-pointer" onClick={() => go("/rules-config", "查看客户管理", "跳转至规则配置模块")}><StatCard title={isAdmin ? "活跃客户" : "技能池"} value={isAdmin ? "3" : "5"} description={isAdmin ? "2 个项目进行中" : "启用中的 Skill 数"} icon={Users} /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>一级类目匹配准确率趋势</CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(152_69%_42%)]" />精确匹配</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(38_92%_50%)]" />模糊匹配</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(0_72%_51%)]" />不匹配</span>
                <span className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border"><span className="w-3 h-[1px] bg-muted-foreground inline-block align-middle" style={{ borderTop: "2px dashed hsl(220 9% 46%)" }} />版本发布</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={matchTrend} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    if (!d) return null
                    const items = [
                      { label: "精确匹配", pct: d.exact, count: d.exactCount, color: "hsl(152 69% 42%)" },
                      { label: "模糊匹配", pct: d.fuzzy, count: d.fuzzyCount, color: "hsl(38 92% 50%)" },
                      { label: "不匹配", pct: d.unmatched, count: d.unmatchedCount, color: "hsl(0 72% 51%)" },
                    ]
                    return (
                      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#374151" }}>{label}</div>
                        {items.map((it) => (
                          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ color: it.color, fontWeight: 500 }}>{it.pct}%</span>
                            <span style={{ color: "#9ca3af", fontSize: 11 }}>{it.label} {it.count} 个三级类目</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                {versionMarkers.map((v) => (
                  <ReferenceLine
                    key={v.label}
                    x={v.date}
                    stroke="hsl(220 9% 46%)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={({ viewBox }: any) => {
                      const { x } = viewBox
                      return (
                        <g>
                          <rect x={x - 14} y={0} width={28} height={18} rx={4} fill="hsl(220 9% 46%)" />
                          <text x={x} y={13} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>{v.label}</text>
                        </g>
                      )
                    }}
                  />
                ))}
                <Line type="monotone" dataKey="exact" stroke="hsl(152 69% 42%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(152 69% 42%)" }} activeDot={{ r: 5 }} name="精确匹配" />
                <Line type="monotone" dataKey="fuzzy" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(38 92% 50%)" }} activeDot={{ r: 5 }} name="模糊匹配" />
                <Line type="monotone" dataKey="unmatched" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(0 72% 51%)" }} activeDot={{ r: 5 }} name="不匹配" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-card transition-smooth" onClick={() => nav("/data-prep")}>
          <CardHeader><div className="flex items-center justify-between"><CardTitle>三级类目分布</CardTitle><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></div></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={catDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">{catDist.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v.toLocaleString()} 件`, "数量"]} /></PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">{catDist.map((it) => (<div key={it.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: it.color }} /><span className="text-muted-foreground">{it.name}</span></span><span className="font-medium text-foreground">{it.value.toLocaleString()}</span></div>))}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><div className="flex items-center justify-between"><CardTitle>客户项目进度</CardTitle><Badge variant="muted">{clients.length} 个客户</Badge></div></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {clients.map((c) => {
                const stageIdx = stageSteps.indexOf(c.stage as typeof stageSteps[number])
                return (
                <div key={c.name} className="space-y-3 py-4 first:pt-0 last:pb-0 cursor-pointer group" onClick={() => go(stageMap[c.stage] || "/data-prep", `进入${c.stage}`, `查看 ${c.name} 项目详情`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><span className="text-sm font-medium text-foreground">{c.name}</span><Badge variant={c.status === "进行中" ? "info" : "muted"}>{c.status}</Badge></div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
                  </div>
                  {/* 物料数 + 类目数 */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">物料 <span className="text-foreground font-medium">{c.total.toLocaleString()}</span></span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="text-muted-foreground">一级类目 <span className="text-foreground font-medium">{c.cat1}</span></span>
                    <span className="text-muted-foreground">二级类目 <span className="text-foreground font-medium">{c.cat2}</span></span>
                    <span className="text-muted-foreground">三级类目 <span className="text-foreground font-medium">{c.cat3}</span></span>
                  </div>
                  {/* 流程进度总览 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0">
                      {stageSteps.map((step, i) => {
                        const done = i < stageIdx
                        const active = i === stageIdx
                        return (
                          <div key={step} className="flex items-center">
                            {i > 0 && <div className={`w-8 h-[2px] ${done || active ? "bg-primary" : "bg-border"}`} />}
                            <div className="flex items-center gap-1.5">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${done ? "bg-primary text-white" : active ? "bg-primary/15 text-primary ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>
                                {done ? "✓" : i + 1}
                              </div>
                              <span className={`text-[11px] whitespace-nowrap ${active ? "text-primary font-medium" : done ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <span className="text-xs text-muted-foreground">预计完成: {c.est}</span>
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-card transition-smooth" onClick={() => nav("/similarity-match")}>
          <CardHeader><div className="flex items-center justify-between"><CardTitle>一级类目匹配进度</CardTitle><TrendingUp className="w-4 h-4 text-success" /></div></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={accByCat} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, "准确率"]} />
                <Bar dataKey="accuracy" fill="hsl(217 91% 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>最近活动</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {acts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-muted/30 cursor-pointer transition-smooth" onClick={() => go(a.link, "跳转成功", a.text.split(" - ")[1] || a.text)}>
                <a.icon className={`w-4 h-4 mt-0.5 shrink-0 ${a.color}`} />
                <div className="flex-1 flex items-center justify-between">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-4"><span className="text-xs text-muted-foreground">{a.time}</span><ExternalLink className="w-3 h-3 text-muted-foreground" /></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
