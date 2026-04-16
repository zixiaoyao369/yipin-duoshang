import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/Modal"
import { useToast } from "@/components/Toast"
import { useClient } from "@/components/ClientContext"
import { useSubmittedCategories } from "@/components/SubmittedCategoriesContext"
import {
  Settings2, Users, Layers, Weight, MessageSquareText,
  ChevronRight, Plus, Save, Sliders, Link2, Shield, Trash2,
  ToggleLeft, ToggleRight, Edit3, Copy, Eye, Check, CheckCheck,
  FolderTree, X, ArrowRight,
  GripVertical, Upload, FileSpreadsheet,
  Download, Bot, ChevronDown
} from "lucide-react"
import * as XLSX from "xlsx"

type SkillType = "prompt" | "rule" | "weight" | "script" | "special"

interface SkillConfig {
  id: string
  clients: string[]
  name: string
  description: string
  type: SkillType
  status: "active" | "draft" | "disabled"
  updatedAt: string
  categories: string[]
  config: Record<string, any>
}

/** 来自提示词管理页面的可选提示词列表（实际应从 Context/API 获取） */
const availablePromptTemplates = [
  { id: "pt-1", name: "紧固件归一化提示词", description: "螺栓、螺母等紧固件产品归一化" },
  { id: "pt-2", name: "电气电工归一化提示词", description: "开关、断路器、电缆等电气产品归一化" },
  { id: "pt-3", name: "化工产品归一化提示词", description: "化工原料名称标准化及别称映射" },
  { id: "pt-4", name: "通用归一化提示词 v2", description: "跨客户通用的物料名称归一化规则" },
  { id: "pt-5", name: "五金工具归一化提示词", description: "扳手、钳子、锤子等五金工具标准化" },
  { id: "pt-6", name: "劳保防护归一化提示词", description: "手套、口罩、面罩等劳保产品归一化" },
  { id: "pt-7", name: "密封件归一化提示词", description: "O型圈、油封等密封件产品归一化" },
  { id: "pt-8", name: "管阀件归一化提示词", description: "管材、法兰、阀门等管阀产品归一化" },
]

const defaultConfigs: Record<SkillType, Record<string, any>> = {
  prompt: { template: "你是一个专业的物料名称归一化助手。\n将输入的 {{材料名}} 按材料、功能、规格等维度拆分为最小语义单元。\n\n输出格式:\n- 标准名称: <归一化后的名称>\n- 材质: {{规格}}\n- 型号: {{型号}}", variables: ["材料名", "规格", "型号", "供应商"], promptEntries: [] },
  rule: { ruleEntries: [], agents: ["归一化Agent", "向量匹配Agent", "精确匹配Agent", "校验Agent", "数据补全Agent"], selectedAgent: "", relaxMatch: false },
  weight: { weightEntries: [] },
  script: { source: "商品中心ES", fields: [{ field: "品牌", mapping: "brand_name", on: true }, { field: "材质", mapping: "material", on: true }, { field: "产地", mapping: "origin", on: false }, { field: "单位", mapping: "unit", on: true }], timeout: 30 },
  special: { mappings: [{ from: "工字头", to: "一字头螺钉" }], scope: "global", scopeCategories: [] },
}

const initialSkills: SkillConfig[] = [
  { id: "1", clients: ["安琪酵母云图"], name: "名称归一化提示词", description: "按材料、功能等维度拆分为最小语义单元", type: "prompt", status: "active", updatedAt: "2026-04-09", categories: ["紧固件", "电气电工", "五金工具"], config: { ...defaultConfigs.prompt, promptEntries: [{ cat1: "紧固件", cat2: "螺栓", cat3: "六角螺栓", prompt: "将{{材料名}}按螺栓类型、强度等级、表面处理拆分归一化" }, { cat1: "紧固件", cat2: "螺母", cat3: "六角螺母", prompt: "将{{材料名}}按螺母类型、材质、规格尺寸拆分归一化" }, { cat1: "电气电工", cat2: "开关", cat3: "断路器", prompt: "将{{材料名}}按电气参数、品牌、额定值拆分归一化" }, { cat1: "五金工具", cat2: "扳手", cat3: "活动扳手", prompt: "将{{材料名}}按工具类型、尺寸规格、材质拆分归一化" }] } },
  { id: "2", clients: ["安琪酵母云图"], name: "紧固件匹配规则", description: "名称+型号+规格 三维度精确匹配策略", type: "rule", status: "active", updatedAt: "2026-04-08", categories: ["紧固件"], config: { ruleEntries: [{ cat1: "紧固件", cat2: "螺栓", cat3: "六角螺栓", agent: "精确匹配Agent", coreAttrs: "名称;型号;量程,口径,", nonCoreAttrs: "测量介质,介质温度,介质压力,过程连接规格", relaxMatch: false }, { cat1: "紧固件", cat2: "螺母", cat3: "六角螺母", agent: "精确匹配Agent", coreAttrs: "名称;型号", nonCoreAttrs: "材质,表面处理", relaxMatch: false }, { cat1: "紧固件", cat2: "垫圈", cat3: "平垫圈", agent: "精确匹配Agent", coreAttrs: "名称;规格", nonCoreAttrs: "材质,厚度", relaxMatch: true }], agents: ["归一化Agent", "向量匹配Agent", "精确匹配Agent", "校验Agent", "数据补全Agent"], selectedAgent: "精确匹配Agent", relaxMatch: false } },
  { id: "3", clients: ["安琪酵母云图"], name: "向量权重 - 名称+型号", description: "按类目维度配置向量权重分配", type: "weight", status: "active", updatedAt: "2026-04-07", categories: ["紧固件", "电气电工"], config: { weightEntries: [{ cat1: "紧固件", cat2: "螺栓", cat3: "六角螺栓", cat4: "粗六角螺栓", dims: "名称;型号;量程,口径,测量介质,介质温度,介质压力,过程连接规格", weights: "0.5:0.4:0.1" }, { cat1: "紧固件", cat2: "螺母", cat3: "六角螺母", cat4: "薄六角螺母", dims: "名称;型号;材质", weights: "0.5:0.3:0.2" }, { cat1: "电气电工", cat2: "开关", cat3: "断路器", cat4: "微型断路器", dims: "名称;型号;额定电流,极数", weights: "0.4:0.4:0.2" }] } },
  { id: "4", clients: ["安琪酵母云图"], name: "商品中心数据补全", description: "从商品中心ES拉取缺失属性进行补全", type: "script", status: "active", updatedAt: "2026-04-06", categories: [], config: { ...defaultConfigs.script } },
  { id: "5", clients: ["安琪酵母云图"], name: "工字头=一字头螺钉", description: "强制建立绑定关系：工字头与一字头视为同品", type: "special", status: "active", updatedAt: "2026-04-05", categories: ["紧固件"], config: { mappings: [{ from: "工字头", to: "一字头螺钉" }, { from: "GB/T5782", to: "GB5782" }], scope: "category", scopeCategories: ["紧固件"] } },
  { id: "6", clients: ["京博石化"], name: "化工类目归一化", description: "化工产品名称标准化处理及别称映射", type: "prompt", status: "draft", updatedAt: "2026-04-04", categories: ["化工原料"], config: { template: "你是化工产品名称标准化助手。\n将 {{材料名}} 进行标准化处理，识别别称和简称。", variables: ["材料名", "规格", "型号", "供应商"] } },
  { id: "7", clients: ["京博石化"], name: "宽松匹配策略", description: "允许跨三级类目的模糊匹配", type: "rule", status: "draft", updatedAt: "2026-04-03", categories: ["化工原料", "密封件"], config: { ruleEntries: [{ cat1: "化工原料", cat2: "有机化工", cat3: "醇类", agent: "向量匹配Agent", coreAttrs: "名称;CAS号", nonCoreAttrs: "浓度,纯度,包装规格", relaxMatch: true }, { cat1: "化工原料", cat2: "无机化工", cat3: "酸类", agent: "向量匹配Agent", coreAttrs: "名称;浓度", nonCoreAttrs: "纯度,包装规格,危险等级", relaxMatch: true }, { cat1: "密封件", cat2: "O型圈", cat3: "氟橡胶O型圈", agent: "向量匹配Agent", coreAttrs: "名称;材质;内径", nonCoreAttrs: "线径,硬度,耐温范围", relaxMatch: true }], agents: ["归一化Agent", "向量匹配Agent", "精确匹配Agent", "校验Agent", "数据补全Agent"], selectedAgent: "向量匹配Agent", relaxMatch: true } },
  { id: "8", clients: ["安琪酵母云图", "京博石化"], name: "通用归一化提示词", description: "跨客户通用的物料名称归一化规则", type: "prompt", status: "active", updatedAt: "2026-04-10", categories: [], config: { ...defaultConfigs.prompt } },
]

const typeIcons: Record<string, typeof Settings2> = {
  prompt: MessageSquareText,
  rule: Sliders,
  weight: Weight,
  script: Link2,
  special: Shield,
}

const typeLabels: Record<string, string> = {
  prompt: "提示词配置",
  rule: "匹配规则",
  weight: "权重配置",
  script: "数据补全脚本",
  special: "特殊业务规则",
}

export default function RulesConfig() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { currentClient, isAdmin } = useClient()
  const { catTree: submittedCatTree, submittedCat1Names } = useSubmittedCategories()

  const [skills, setSkills] = useState<SkillConfig[]>(initialSkills)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(
    new Set([currentClient.name === "平台管理员" ? "安琪酵母云图" : currentClient.name])
  )
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isAdmin) setSelectedClients(new Set([currentClient.name]))
  }, [currentClient, isAdmin])

  // Modal states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [batchCatOpen, setBatchCatOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<SkillConfig | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formType, setFormType] = useState<SkillType>("prompt")
  const [formCategories, setFormCategories] = useState<Set<string>>(new Set())
  const [formClients, setFormClients] = useState<Set<string>>(new Set())
  const [formConfig, setFormConfig] = useState<Record<string, any>>(defaultConfigs.prompt)
  const [newClientName, setNewClientName] = useState("")
  const [batchCats, setBatchCats] = useState<Set<string>>(new Set())

  // Category tree state (mirrors DataPrep tree)
  const [catTreeSearch, setCatTreeSearch] = useState("")
  const [catTreeExp1, setCatTreeExp1] = useState<string | null>(null)
  const [catTreeExp2, setCatTreeExp2] = useState<Set<string>>(new Set())
  const [showCatTree, setShowCatTree] = useState(true)

  // Agent tooltip state (fixed positioning to escape overflow)
  const [agentTooltip, setAgentTooltip] = useState<{ idx: number; x: number; y: number } | null>(null)
  const [batchSkillIds, setBatchSkillIds] = useState<Set<string>>(new Set())

  const clients = [...new Set(skills.flatMap((s) => s.clients))]
  const filtered = skills.filter((s) => {
    if (!s.clients.some((c) => selectedClients.has(c))) return false
    if (selectedType && s.type !== selectedType) return false
    if (selectedCategories.size > 0) {
      if (selectedCategories.has("__global__")) {
        if (s.categories.length > 0) return false
      } else {
        if (s.categories.length > 0 && !s.categories.some((c) => selectedCategories.has(c))) return false
      }
    }
    return true
  })

  const toggleClient = (c: string) => {
    setSelectedClients((p) => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n })
  }
  const toggleFormCat = (c: string) => {
    setFormCategories((p) => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n })
  }
  const toggleFormClient = (c: string) => {
    setFormClients((p) => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n })
  }

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormType("prompt")
    setFormCategories(new Set()); setFormConfig({ ...defaultConfigs.prompt })
    setFormClients(new Set([...selectedClients]))
    setCatTreeSearch(""); setCatTreeExp1(null); setCatTreeExp2(new Set()); setShowCatTree(true)
  }

  const handleCreate = () => {
    if (!formName.trim()) { addToast({ type: "warning", title: "请输入 Skill 名称" }); return }
    if (formClients.size === 0) { addToast({ type: "warning", title: "请至少选择一个客户" }); return }
    const newSkill: SkillConfig = {
      id: Date.now().toString(),
      clients: [...formClients],
      name: formName, description: formDesc, type: formType,
      status: "draft", updatedAt: new Date().toISOString().slice(0, 10),
      categories: [...formCategories],
      config: { ...formConfig },
    }
    setSkills((prev) => [newSkill, ...prev])
    setCreateOpen(false); resetForm()
    addToast({ type: "success", title: "Skill 创建成功", description: `"${newSkill.name}" 已添加，覆盖 ${newSkill.clients.length} 个客户` })
  }

  const handleEdit = () => {
    if (!activeSkill || !formName.trim()) return
    if (formClients.size === 0) { addToast({ type: "warning", title: "请至少选择一个客户" }); return }
    setSkills((prev) => prev.map((s) => s.id === activeSkill.id ? {
      ...s, name: formName, description: formDesc, type: formType,
      clients: [...formClients],
      categories: [...formCategories], config: { ...formConfig },
      updatedAt: new Date().toISOString().slice(0, 10),
    } : s))
    setEditOpen(false); resetForm()
    addToast({ type: "success", title: "Skill 已更新", description: `"${formName}" 修改已保存` })
  }

  const handleDelete = () => {
    if (!activeSkill) return
    setSkills((prev) => prev.filter((s) => s.id !== activeSkill.id))
    setDeleteOpen(false)
    addToast({ type: "success", title: "Skill 已删除", description: `"${activeSkill.name}" 已移除` })
    setActiveSkill(null)
  }

  const toggleStatus = (skill: SkillConfig) => {
    const newStatus = skill.status === "active" ? "disabled" : "active"
    setSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, status: newStatus, updatedAt: new Date().toISOString().slice(0, 10) } : s)))
    addToast({ type: newStatus === "active" ? "success" : "warning", title: newStatus === "active" ? "Skill 已启用" : "Skill 已禁用" })
  }

  const handleDuplicate = (skill: SkillConfig) => {
    const dup: SkillConfig = { ...skill, id: Date.now().toString(), name: skill.name + " (副本)", status: "draft", updatedAt: new Date().toISOString().slice(0, 10), config: { ...skill.config } }
    setSkills((prev) => [dup, ...prev])
    addToast({ type: "info", title: "Skill 已复制" })
  }

  const handleAddClient = () => {
    if (!newClientName.trim()) { addToast({ type: "warning", title: "请输入客户名称" }); return }
    if (clients.includes(newClientName.trim())) { addToast({ type: "warning", title: "客户已存在" }); return }
    setSelectedClients((p) => new Set([...p, newClientName.trim()]))
    setAddClientOpen(false); setNewClientName("")
    addToast({ type: "success", title: "客户已添加", description: `"${newClientName.trim()}" 已加入` })
  }

  const handleBatchCat = () => {
    if (batchCats.size === 0 || batchSkillIds.size === 0) { addToast({ type: "warning", title: "请选择类目和 Skill" }); return }
    setSkills((prev) => prev.map((s) => batchSkillIds.has(s.id) ? { ...s, categories: [...new Set([...s.categories, ...batchCats])], updatedAt: new Date().toISOString().slice(0, 10) } : s))
    setBatchCatOpen(false); setBatchCats(new Set()); setBatchSkillIds(new Set())
    addToast({ type: "success", title: "批量类目配置完成", description: `${batchSkillIds.size} 个 Skill 已关联 ${batchCats.size} 个类目` })
  }

  /* ---- 类目树选择器（复制 DataPrep 标准类目树预览） ---- */
  const renderCatTreeSelector = () => {
    const filteredTree = submittedCatTree.filter((c1) =>
      !catTreeSearch ||
      c1.name.includes(catTreeSearch) ||
      c1.children.some((c2) => c2.name.includes(catTreeSearch) || c2.children.some((c3) => c3.includes(catTreeSearch)))
    )
    const totalCat3 = submittedCatTree.reduce((sum, c1) => sum + c1.children.reduce((s, c2) => s + c2.children.length, 0), 0)

    return (
      <div>
        {/* 适用类目汇总标签 */}
        <label className="text-xs font-semibold text-foreground block mb-1.5">适用类目（不选则全局生效）</label>
        {formCategories.size > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[...formCategories].map((c) => (
              <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-primary/10 border border-primary/30 text-primary font-medium">
                <Check className="w-2.5 h-2.5" />{c}
                <button onClick={() => toggleFormCat(c)} className="ml-0.5 hover:text-destructive transition-smooth"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            <button onClick={() => setFormCategories(new Set())} className="px-1.5 py-0.5 text-[10px] text-destructive hover:text-destructive/80 transition-smooth">
              清除全部
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground mb-2">未选择类目，该 Skill 将对所有类目全局生效。</p>
        )}

        {/* 类目树折叠容器 */}
        <div className="rounded-lg border overflow-hidden">
          <div
            className="flex items-center justify-between px-2.5 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-smooth"
            onClick={() => setShowCatTree(!showCatTree)}
          >
            <div className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">标准类目树预览</span>
              <Badge variant="muted" className="text-[10px] px-1.5 py-0">{totalCat3} 个三级类目</Badge>
            </div>
            <div className="flex items-center gap-2">
              {showCatTree && (
                <div className="relative w-32" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={catTreeSearch}
                    onChange={(e) => {
                      const v = e.target.value
                      setCatTreeSearch(v)
                      if (v) {
                        for (const c1 of submittedCatTree) {
                          const c2Match = c1.children.some((c2) => c2.name.includes(v) || c2.children.some((c3) => c3.includes(v)))
                          if (c1.name.includes(v) || c2Match) {
                            setCatTreeExp1(c1.name)
                            const exp2 = new Set<string>()
                            for (const c2 of c1.children) {
                              if (c2.name.includes(v) || c2.children.some((c3) => c3.includes(v))) {
                                exp2.add(`${c1.name}/${c2.name}`)
                              }
                            }
                            setCatTreeExp2(exp2)
                            break
                          }
                        }
                      }
                    }}
                    placeholder="搜索类目..."
                    className="w-full h-6 pl-2 pr-2 text-[11px] rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showCatTree ? "rotate-180" : ""}`} />
            </div>
          </div>
          {showCatTree && (
            <div className="px-2.5 py-2">
              {/* 紧凑行内布局：一级类目作为 inline chips */}
              <div className="flex flex-wrap gap-1.5">
                {filteredTree.map((cat1) => {
                  const isSelected = formCategories.has(cat1.name)
                  const isExpanded = catTreeExp1 === cat1.name
                  const cat3Count = cat1.children.reduce((s, c2) => s + c2.children.length, 0)
                  return (
                    <div key={cat1.name} className={`rounded-md border overflow-hidden transition-smooth ${isSelected ? "border-primary/40 bg-primary/5" : "bg-muted/20"} ${isExpanded ? "basis-full" : ""}`}>
                      <button
                        className={`flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-accent/50 transition-smooth w-full ${isExpanded ? "bg-accent/30" : ""}`}
                        onClick={() => {
                          setCatTreeExp1(isExpanded ? null : cat1.name)
                          setCatTreeExp2(new Set())
                        }}
                      >
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleFormCat(cat1.name) }}
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition-smooth shrink-0 ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"}`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </span>
                        <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{cat1.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-0.5">{cat3Count}</span>
                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ml-auto ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="border-t px-2 pb-1.5 pt-1">
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {cat1.children
                              .filter((c2) => !catTreeSearch || c2.name.includes(catTreeSearch) || c2.children.some((c3) => c3.includes(catTreeSearch)))
                              .map((cat2) => {
                                const cat2Key = `${cat1.name}/${cat2.name}`
                                const isExp2 = catTreeExp2.has(cat2Key)
                                return (
                                  <div key={cat2.name} className="min-w-[120px]">
                                    <button
                                      className={`flex items-center gap-1 w-full px-1.5 py-0.5 text-[11px] font-medium text-foreground rounded hover:bg-accent/40 transition-smooth ${isExp2 ? "bg-accent/20" : ""}`}
                                      onClick={() => {
                                        setCatTreeExp2((prev) => { const n = new Set(prev); n.has(cat2Key) ? n.delete(cat2Key) : n.add(cat2Key); return n })
                                      }}
                                    >
                                      <ChevronRight className={`w-2.5 h-2.5 text-muted-foreground transition-transform duration-200 ${isExp2 ? "rotate-90" : ""}`} />
                                      {cat2.name}
                                      <span className="ml-auto text-[10px] text-muted-foreground">{cat2.children.length}</span>
                                    </button>
                                    {isExp2 && (
                                      <div className="ml-4 space-y-0 mt-0.5">
                                        {cat2.children
                                          .filter((c3) => !catTreeSearch || c3.includes(catTreeSearch))
                                          .map((cat3) => (
                                            <div key={cat3} className="px-1.5 py-0.5 text-[10px] text-muted-foreground rounded hover:bg-primary/10 hover:text-primary transition-smooth">
                                              {cat3}
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {filteredTree.length === 0 && (
                <div className="text-center py-3 text-xs text-muted-foreground">未找到匹配的类目</div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const openEdit = (skill: SkillConfig) => {
    setActiveSkill(skill); setFormName(skill.name); setFormDesc(skill.description)
    setFormType(skill.type); setFormCategories(new Set(skill.categories))
    setFormClients(new Set(skill.clients))
    setFormConfig({ ...skill.config }); setEditOpen(true)
  }
  const openDetail = (skill: SkillConfig) => { setActiveSkill(skill); setDetailOpen(true) }
  const openDelete = (skill: SkillConfig) => { setActiveSkill(skill); setDeleteOpen(true) }

  /* ---- Excel 上传相关 ---- */
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [excelTarget, setExcelTarget] = useState<"prompt" | "rule" | "weight">("rule")

  const triggerExcelUpload = (target: "prompt" | "rule" | "weight") => {
    setExcelTarget(target)
    if (excelInputRef.current) { excelInputRef.current.value = ""; excelInputRef.current.click() }
  }

  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

        if (excelTarget === "prompt") {
          parsePromptExcel(rows)
        } else if (excelTarget === "rule") {
          parseRuleExcel(rows)
        } else {
          parseWeightExcel(rows)
        }
        addToast({ type: "success", title: "Excel 导入成功", description: `已从「${file.name}」解析配置` })
      } catch {
        addToast({ type: "error", title: "Excel 解析失败", description: "请检查文件格式是否正确" })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const parseRuleExcel = (rows: any[][]) => {
    // 格式: 一级类目 | 二级类目 | 三级类目 | Agent | 核心属性 | 非核心属性 | 是否宽松匹配
    const entries: { cat1: string; cat2: string; cat3: string; agent: string; coreAttrs: string; nonCoreAttrs: string; relaxMatch: boolean }[] = []
    let headerSkipped = false
    for (const row of rows) {
      const c0 = row[0] != null ? String(row[0]).trim() : ""
      if (!headerSkipped && (/类目|agent|宽松|核心/i.test(c0) || c0 === "一级类目")) { headerSkipped = true; continue }
      if (!c0) continue
      const cat1 = c0
      const cat2 = row[1] != null ? String(row[1]).trim() : ""
      const cat3 = row[2] != null ? String(row[2]).trim() : ""
      const agent = row[3] != null ? String(row[3]).trim() : ""
      const coreAttrs = row[4] != null ? String(row[4]).trim() : ""
      const nonCoreAttrs = row[5] != null ? String(row[5]).trim() : ""
      const relaxStr = row[6] != null ? String(row[6]).trim() : ""
      const relaxMatch = /是|true|1|开启|宽松/.test(relaxStr.toLowerCase())
      entries.push({ cat1, cat2, cat3, agent, coreAttrs, nonCoreAttrs, relaxMatch })
    }
    const agents = [...new Set(entries.map((e) => e.agent).filter(Boolean))]
    const existingAgents = formConfig.agents || defaultConfigs.rule.agents
    const mergedAgents = [...new Set([...existingAgents, ...agents])]
    setFormConfig((p) => ({ ...p, ruleEntries: entries, agents: mergedAgents }))
  }

  const parsePromptExcel = (rows: any[][]) => {
    // 格式: 一级类目 | 二级类目 | 三级类目 | 提示词
    const entries: { cat1: string; cat2: string; cat3: string; prompt: string }[] = []
    let headerSkipped = false
    for (const row of rows) {
      const c0 = row[0] != null ? String(row[0]).trim() : ""
      if (!headerSkipped && (/类目|提示词/i.test(c0) || c0 === "一级类目")) { headerSkipped = true; continue }
      if (!c0) continue
      entries.push({
        cat1: c0,
        cat2: row[1] != null ? String(row[1]).trim() : "",
        cat3: row[2] != null ? String(row[2]).trim() : "",
        prompt: row[3] != null ? String(row[3]).trim() : "",
      })
    }
    setFormConfig((p) => ({ ...p, promptEntries: entries }))
  }

  const parseWeightExcel = (rows: any[][]) => {
    // 格式: 一级类目 | 二级类目 | 三级类目 | 四级类目 | 维度 | weights
    const entries: { cat1: string; cat2: string; cat3: string; cat4: string; dims: string; weights: string }[] = []
    let headerSkipped = false
    for (const row of rows) {
      const c0 = row[0] != null ? String(row[0]).trim() : ""
      if (!headerSkipped && (/类目|维度|weights/i.test(c0) || c0 === "一级类目")) { headerSkipped = true; continue }
      if (!c0) continue
      entries.push({
        cat1: c0,
        cat2: row[1] != null ? String(row[1]).trim() : "",
        cat3: row[2] != null ? String(row[2]).trim() : "",
        cat4: row[3] != null ? String(row[3]).trim() : "",
        dims: row[4] != null ? String(row[4]).trim() : "",
        weights: row[5] != null ? String(row[5]).trim() : "",
      })
    }
    setFormConfig((p) => ({ ...p, weightEntries: entries }))
  }

  /* ---- 下载 Excel 模板 ---- */
  const downloadTemplate = (type: "prompt" | "rule" | "weight") => {
    const wb = XLSX.utils.book_new()
    if (type === "prompt") {
      const data = [
        ["一级类目", "二级类目", "三级类目", "提示词"],
        ["紧固件", "螺栓", "六角螺栓", "将{{材料名}}按螺栓类型、强度等级、表面处理拆分归一化"],
        ["紧固件", "螺母", "六角螺母", "将{{材料名}}按螺母类型、材质、规格尺寸拆分归一化"],
        ["电气电工", "开关", "断路器", "将{{材料名}}按电气参数、品牌、额定值拆分归一化"],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, ws, "提示词配置")
    } else if (type === "rule") {
      const data = [
        ["一级类目", "二级类目", "三级类目", "Agent", "核心属性", "非核心属性", "是否宽松匹配"],
        ["紧固件", "螺栓", "六角螺栓", "精确匹配Agent", "名称;型号;量程,口径,", "测量介质,介质温度,介质压力,过程连接规格", "否"],
        ["紧固件", "螺母", "六角螺母", "精确匹配Agent", "名称;型号", "材质,表面处理", "否"],
        ["化工原料", "有机化工", "醇类", "向量匹配Agent", "名称;CAS号", "浓度,纯度,包装规格", "是"],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws, "匹配规则")
    } else {
      const data = [
        ["一级类目", "二级类目", "三级类目", "四级类目", "维度", "weights"],
        ["紧固件", "螺栓", "六角螺栓", "粗六角螺栓", "名称;型号;量程,口径,测量介质,介质温度,介质压力,过程连接规格", "0.5:0.4:0.1"],
        ["紧固件", "螺母", "六角螺母", "薄六角螺母", "名称;型号;材质", "0.5:0.3:0.2"],
        ["电气电工", "开关", "断路器", "微型断路器", "名称;型号;额定电流,极数", "0.4:0.4:0.2"],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 55 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(wb, ws, "权重配置")
    }
    XLSX.writeFile(wb, `${type === "prompt" ? "提示词配置" : type === "rule" ? "匹配规则" : "权重配置"}_模板.xlsx`)
  }

  /* ---- 规则类型专属配置面板 ---- */
  const renderTypeConfig = () => {
    const cfg = formConfig
    const upd = (patch: Record<string, any>) => setFormConfig((p) => ({ ...p, ...patch }))
    const inputCls = "w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    switch (formType) {
      case "prompt": {
        // 根据适用类目自动筛选类目树，生成展示行
        const selectedCats = [...formCategories]
        const filteredTree = selectedCats.length > 0
          ? submittedCatTree.filter((c1) => selectedCats.includes(c1.name))
          : submittedCatTree
        const catRows: { cat1: string; cat2: string; cat3: string }[] = []
        for (const c1 of filteredTree) {
          for (const c2 of c1.children) {
            for (const c3 of c2.children) {
              catRows.push({ cat1: c1.name, cat2: c2.name, cat3: c3 })
            }
          }
        }
        // 合并已有配置的提示词选择
        const entries = cfg.promptEntries || []
        const getPrompt = (cat1: string, cat2: string, cat3: string) => {
          const found = entries.find((e: any) => e.cat1 === cat1 && e.cat2 === cat2 && e.cat3 === cat3)
          return found?.prompt || ""
        }
        const setPromptForRow = (cat1: string, cat2: string, cat3: string, prompt: string) => {
          const newEntries = entries.filter((e: any) => !(e.cat1 === cat1 && e.cat2 === cat2 && e.cat3 === cat3))
          if (prompt) newEntries.push({ cat1, cat2, cat3, prompt })
          upd({ promptEntries: newEntries })
        }
        return (
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-semibold text-foreground">类目提示词配置</label>
                <Badge variant="muted" className="text-[10px] px-1.5 py-0">{catRows.length} 个三级类目</Badge>
                {selectedCats.length > 0 && <span className="text-[10px] text-primary">已按适用类目筛选</span>}
              </div>
              {catRows.length === 0 ? (
                <div className="flex items-center justify-center py-6 rounded-lg border border-dashed bg-muted/10">
                  <div className="text-center">
                    <FolderTree className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">请先选择适用类目</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">选择适用类目后将自动展示对应的三级类目列表</p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[0.8fr_0.8fr_1fr_2fr] gap-0 bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    <span>一级类目</span><span>二级类目</span><span>三级类目</span><span>提示词</span>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {catRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-[0.8fr_0.8fr_1fr_2fr] gap-0 items-center px-3 py-1.5 border-t text-xs bg-muted/5">
                        <span className="text-foreground font-medium">{row.cat1}</span>
                        <span className="text-foreground">{row.cat2}</span>
                        <span className="text-foreground">{row.cat3}</span>
                        <select
                          value={getPrompt(row.cat1, row.cat2, row.cat3)}
                          onChange={(e) => setPromptForRow(row.cat1, row.cat2, row.cat3, e.target.value)}
                          className="h-7 px-2 text-xs rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                        >
                          <option value="">-- 选择提示词 --</option>
                          {availablePromptTemplates.map((pt) => (
                            <option key={pt.id} value={pt.name}>{pt.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-t text-[10px] text-muted-foreground">
                    <span>共 {catRows.length} 个三级类目，已配置 {entries.length} 条</span>
                    <span className="text-primary cursor-pointer hover:text-primary/80" onClick={() => {
                      const all = catRows.map((r) => ({ ...r, prompt: availablePromptTemplates[0]?.name || "" }))
                      upd({ promptEntries: all })
                    }}>一键全选第一个提示词</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
      case "rule": {
        // Excel 上传 + 自动根据适用类目筛选的匹配规则表格（只读）
        const selectedRuleCats = [...formCategories]
        const allEntries: any[] = cfg.ruleEntries || []
        const filteredEntries = selectedRuleCats.length > 0
          ? allEntries.filter((e: any) => selectedRuleCats.includes(e.cat1))
          : allEntries
        const agentSet = [...new Set(allEntries.map((e: any) => e.agent).filter(Boolean))]
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-dashed">
              <FileSpreadsheet className="w-4 h-4 text-success shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">上传 Excel 配置匹配规则（一二三级类目 + Agent + 核心属性 + 非核心属性 + 宽松匹配）</span>
              <button onClick={() => downloadTemplate("rule")}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth">
                <Download className="w-3 h-3" />下载模板
              </button>
              <button onClick={() => triggerExcelUpload("rule")}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-success/10 border border-success/30 text-success hover:bg-success/20 transition-smooth font-medium">
                <Upload className="w-3 h-3" />上传 Excel
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-semibold text-foreground">匹配规则配置</label>
                <Badge variant="muted" className="text-[10px] px-1.5 py-0">{filteredEntries.length} 条规则</Badge>
                {selectedRuleCats.length > 0 && <span className="text-[10px] text-primary">已按适用类目筛选</span>}
              </div>
              {allEntries.length === 0 ? (
                <div className="flex items-center justify-center py-6 rounded-lg border border-dashed bg-muted/10">
                  <div className="text-center">
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">暂无匹配规则配置</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">请上传 Excel 模板以导入类目匹配规则，上传后自动识别一二三级类目和 Agent</p>
                  </div>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex items-center justify-center py-6 rounded-lg border border-dashed bg-muted/10">
                  <div className="text-center">
                    <FolderTree className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">当前适用类目下无匹配规则</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">共 {allEntries.length} 条规则，请调整上方类目树选择</p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[0.7fr_0.7fr_0.8fr_1.2fr_70px] gap-0 bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    <span>一级类目</span><span>二级类目</span><span>三级类目</span><span>Agent</span><span>宽松匹配</span>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {filteredEntries.map((e: any, fi: number) => (
                      <div key={fi} className="grid grid-cols-[0.7fr_0.7fr_0.8fr_1.2fr_70px] gap-0 items-center px-3 py-1.5 border-t text-xs bg-muted/5">
                        <span className="text-foreground font-medium">{e.cat1}</span>
                        <span className="text-foreground">{e.cat2}</span>
                        <span className="text-foreground">{e.cat3}</span>
                        {/* Agent — 只读 Badge，hover 触发 fixed tooltip */}
                        <div>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-primary/10 text-primary font-medium cursor-default"
                            onMouseEnter={(ev) => {
                              if (e.coreAttrs || e.nonCoreAttrs) {
                                const rect = ev.currentTarget.getBoundingClientRect()
                                setAgentTooltip({ idx: fi, x: rect.right + 8, y: rect.top + rect.height / 2 })
                              }
                            }}
                            onMouseLeave={() => setAgentTooltip(null)}
                          >
                            <Bot className="w-3 h-3" />{e.agent}
                          </span>
                        </div>
                        {/* 宽松匹配 — 只读 Badge */}
                        <span>{e.relaxMatch
                          ? <span className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-md bg-warning/10 text-warning font-medium">是</span>
                          : <span className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-md bg-muted text-muted-foreground font-medium">否</span>
                        }</span>
                      </div>
                    ))}
                    {/* Fixed tooltip portal — 渲染在滚动容器外 */}
                    {agentTooltip && filteredEntries[agentTooltip.idx] && (() => {
                      const te = filteredEntries[agentTooltip.idx]
                      return (
                        <div
                          className="fixed z-[9999] pointer-events-none"
                          style={{ left: agentTooltip.x, top: agentTooltip.y, transform: "translateY(-50%)" }}
                        >
                          <div className="bg-popover border rounded-lg shadow-xl p-2.5 space-y-1.5 w-60">
                            {te.coreAttrs && (
                              <div>
                                <span className="text-[10px] font-semibold text-success">核心属性</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {te.coreAttrs.split(/[;,；，]/).filter(Boolean).map((attr: string, ai: number) => (
                                    <span key={ai} className="px-1.5 py-0.5 text-[10px] rounded bg-success/10 text-success border border-success/20">{attr.trim()}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {te.nonCoreAttrs && (
                              <div>
                                <span className="text-[10px] font-semibold text-warning">非核心属性</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {te.nonCoreAttrs.split(/[;,；，]/).filter(Boolean).map((attr: string, ai: number) => (
                                    <span key={ai} className="px-1.5 py-0.5 text-[10px] rounded bg-warning/10 text-warning border border-warning/20">{attr.trim()}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-t text-[10px] text-muted-foreground">
                    <span>共 {allEntries.length} 条规则{selectedRuleCats.length > 0 ? `，当前筛选 ${filteredEntries.length} 条` : ""}</span>
                    <span className="text-[10px] text-muted-foreground/60">hover Agent 查看核心/非核心属性</span>
                  </div>
                </div>
              )}
            </div>
            {agentSet.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs font-semibold text-foreground">使用的 Agent</label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agentSet.map((agent: string) => {
                    const count = allEntries.filter((e: any) => e.agent === agent).length
                    return (
                      <div key={agent} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-primary/5 border-primary/20">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">{agent}</span>
                        <Badge variant="muted" className="text-[10px] px-1.5 py-0">{count}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      }
      case "weight": {
        // Excel 上传 + 自动根据适用类目筛选的权重表格
        const selectedWeightCats = [...formCategories]
        const allWeightEntries: any[] = cfg.weightEntries || []
        const filteredWeightEntries = selectedWeightCats.length > 0
          ? allWeightEntries.filter((e: any) => selectedWeightCats.includes(e.cat1))
          : allWeightEntries

        // 解析维度和权重用于展示
        const parseDimsWeights = (dims: string, weights: string) => {
          const dimList = dims ? dims.split(";").map((d: string) => d.trim()).filter(Boolean) : []
          const wList = weights ? weights.split(":").map((w: string) => parseFloat(w.trim())).filter((w: number) => !isNaN(w)) : []
          return dimList.map((d: string, i: number) => ({ dim: d, val: wList[i] ?? 0 }))
        }

        const colors = ["bg-primary", "bg-info", "bg-success", "bg-warning", "bg-destructive", "bg-purple-500"]

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-dashed">
              <FileSpreadsheet className="w-4 h-4 text-success shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">上传 Excel 配置向量权重（一二三四级类目 + 维度 + weights）</span>
              <button onClick={() => downloadTemplate("weight")}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth">
                <Download className="w-3 h-3" />下载模板
              </button>
              <button onClick={() => triggerExcelUpload("weight")}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-success/10 border border-success/30 text-success hover:bg-success/20 transition-smooth font-medium">
                <Upload className="w-3 h-3" />上传 Excel
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-semibold text-foreground">向量权重分配</label>
                <Badge variant="muted" className="text-[10px] px-1.5 py-0">{filteredWeightEntries.length} 条配置</Badge>
                {selectedWeightCats.length > 0 && <span className="text-[10px] text-primary">已按适用类目筛选</span>}
              </div>
              {allWeightEntries.length === 0 ? (
                <div className="flex items-center justify-center py-6 rounded-lg border border-dashed bg-muted/10">
                  <div className="text-center">
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">暂无权重配置</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">请上传 Excel 模板以导入类目权重配置，上传后自动解析并展示</p>
                  </div>
                </div>
              ) : filteredWeightEntries.length === 0 ? (
                <div className="flex items-center justify-center py-6 rounded-lg border border-dashed bg-muted/10">
                  <div className="text-center">
                    <FolderTree className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">当前适用类目下无权重配置</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">共 {allWeightEntries.length} 条配置，请调整上方类目树选择</p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[0.6fr_0.6fr_0.7fr_0.7fr_1.8fr_0.8fr] gap-0 bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    <span>一级类目</span><span>二级类目</span><span>三级类目</span><span>四级类目</span><span>维度</span><span>weights</span>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {filteredWeightEntries.map((e: any, i: number) => {
                      const dwList = parseDimsWeights(e.dims, e.weights)
                      const totalW = dwList.reduce((s: number, d: any) => s + d.val, 0)
                      const isBalanced = Math.abs(totalW - 1) < 0.01
                      return (
                        <div key={i} className="border-t">
                          <div className="grid grid-cols-[0.6fr_0.6fr_0.7fr_0.7fr_1.8fr_0.8fr] gap-0 items-center px-3 py-1.5 text-xs bg-muted/5">
                            <span className="text-foreground font-medium">{e.cat1}</span>
                            <span className="text-foreground">{e.cat2}</span>
                            <span className="text-foreground">{e.cat3}</span>
                            <span className="text-foreground">{e.cat4}</span>
                            <div className="flex flex-wrap gap-1">
                              {dwList.map((d: any, di: number) => (
                                <span key={di} className="px-1.5 py-0.5 text-[10px] rounded bg-muted/50 text-foreground border">{d.dim}</span>
                              ))}
                            </div>
                            <span className={`text-xs font-mono font-bold ${isBalanced ? "text-success" : "text-destructive"}`}>{e.weights}</span>
                          </div>
                          {/* 权重可视化条 */}
                          <div className="px-3 pb-2 pt-0.5">
                            <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
                              {dwList.map((d: any, di: number) => (
                                <div key={di} className={`${colors[di % colors.length]} transition-all relative group/bar`} style={{ width: `${Math.round(d.val * 100)}%` }}>
                                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/bar:block z-50">
                                    <div className="bg-popover border rounded px-2 py-1 text-[10px] text-foreground shadow-lg whitespace-nowrap">
                                      {d.dim}: {d.val}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-t text-[10px] text-muted-foreground">
                    <span>共 {allWeightEntries.length} 条配置{selectedWeightCats.length > 0 ? `，当前筛选 ${filteredWeightEntries.length} 条` : ""}</span>
                    <span className="text-[10px] text-muted-foreground/60">hover 权重条查看详细值</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
      case "script": return (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">数据源</label>
            <select value={cfg.source || "商品中心ES"} onChange={(e) => upd({ source: e.target.value })}
              className={inputCls}><option>商品中心ES</option><option>主数据MDM</option><option>供应商API</option><option>自定义HTTP</option></select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">补全字段映射</label>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[32px_40px_1fr_1fr_40px] gap-0 bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                <span></span><span>启用</span><span>字段名</span><span>映射源</span><span></span>
              </div>
              {(cfg.fields || []).map((f: any, i: number) => (
                <div key={i} className="grid grid-cols-[32px_40px_1fr_1fr_40px] gap-0 items-center px-3 py-2 border-t group/row">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab" />
                  <input type="checkbox" checked={f.on} onChange={() => {
                    const nf = [...cfg.fields]; nf[i] = { ...nf[i], on: !nf[i].on }; upd({ fields: nf })
                  }} className="rounded border-border" />
                  <input type="text" value={f.field} onChange={(e) => {
                    const nf = [...cfg.fields]; nf[i] = { ...nf[i], field: e.target.value }; upd({ fields: nf })
                  }} className="h-7 px-2 text-xs rounded border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring mr-2" />
                  <input type="text" value={f.mapping} onChange={(e) => {
                    const nf = [...cfg.fields]; nf[i] = { ...nf[i], mapping: e.target.value }; upd({ fields: nf })
                  }} className="h-7 px-2 text-xs rounded border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
                  <button onClick={() => upd({ fields: cfg.fields.filter((_: any, j: number) => j !== i) })}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-smooth ml-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => upd({ fields: [...(cfg.fields || []), { field: "", mapping: "", on: true }] })}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-primary hover:bg-primary/5 border-t transition-smooth">
                <Plus className="w-3 h-3" />添加字段
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">超时 (秒)</label>
            <input type="number" min={5} max={120} value={cfg.timeout ?? 30} onChange={(e) => upd({ timeout: +e.target.value })} className="w-24 h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      )
      case "special": return (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">映射关系</label>
            <div className="space-y-2">
              {(cfg.mappings || []).map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-5 shrink-0 text-center">{i + 1}</span>
                  <input type="text" value={m.from} placeholder="原始值" onChange={(e) => {
                    const nm = [...cfg.mappings]; nm[i] = { ...nm[i], from: e.target.value }; upd({ mappings: nm })
                  }} className="flex-1 h-8 px-3 text-xs rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input type="text" value={m.to} placeholder="映射值" onChange={(e) => {
                    const nm = [...cfg.mappings]; nm[i] = { ...nm[i], to: e.target.value }; upd({ mappings: nm })
                  }} className="flex-1 h-8 px-3 text-xs rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <button onClick={() => upd({ mappings: cfg.mappings.filter((_: any, j: number) => j !== i) })} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => upd({ mappings: [...(cfg.mappings || []), { from: "", to: "" }] })}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-smooth"><Plus className="w-3 h-3" />添加映射</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">生效范围</label>
            <div className="flex gap-3 mb-2">
              {(["global", "category"] as const).map((s) => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="scope" checked={cfg.scope === s} onChange={() => upd({ scope: s })} className="accent-primary" />
                  <span className="text-xs text-foreground">{s === "global" ? "全局生效" : "指定类目"}</span>
                </label>
              ))}
            </div>
            {cfg.scope === "category" && (
              <div className="flex flex-wrap gap-1.5">
                {submittedCat1Names.map((c) => {
                  const on = (cfg.scopeCategories || []).includes(c)
                  return (<button key={c} onClick={() => upd({ scopeCategories: on ? (cfg.scopeCategories || []).filter((x: string) => x !== c) : [...(cfg.scopeCategories || []), c] })}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-smooth ${on ? "bg-primary/10 border-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {on && <Check className="w-3 h-3 inline mr-0.5" />}{c}
                  </button>)
                })}
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelFile} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">规则配置</h1>
          <p className="text-sm text-muted-foreground mt-1">Skills Engine — 客户专属匹配规则与策略管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/similarity-match")}>
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" />返回匹配
          </Button>
          <Button variant="premium" size="sm" onClick={() => { resetForm(); setCreateOpen(true) }}>
            <Plus className="w-4 h-4 mr-1.5" />新建 Skill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Client Selector */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" />客户列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {clients.map((client) => {
                const count = skills.filter((s) => s.clients.includes(client)).length
                const activeCount = skills.filter((s) => s.clients.includes(client) && s.status === "active").length
                return (
                  <button
                    key={client}
                    onClick={() => { toggleClient(client); setSelectedType(null) }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-smooth ${
                      selectedClients.has(client)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{client}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{activeCount}启用</span>
                      <Badge variant="muted">{count}</Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
              <button
                onClick={() => { setNewClientName(""); setAddClientOpen(true) }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth border border-dashed mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> 添加客户
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Skills List */}
        <div className="col-span-3 space-y-4">
          {/* Filter Toolbar */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {/* Upper: Type pills + batch action */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-smooth ${
                  !selectedType ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                全部 ({skills.filter((s) => s.clients.some((c) => selectedClients.has(c))).length})
              </button>
              {Object.entries(typeLabels).map(([key, label]) => {
                const Icon = typeIcons[key]
                const count = skills.filter((s) => s.clients.some((c) => selectedClients.has(c)) && s.type === key).length
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedType(selectedType === key ? null : key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-smooth ${
                      selectedType === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {label} ({count})
                  </button>
                )
              })}
              <button
                onClick={() => { setBatchCats(new Set()); setBatchSkillIds(new Set()); setBatchCatOpen(true) }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground hover:text-foreground transition-smooth"
              >
                <Layers className="w-3 h-3" /> 批量配置类目
              </button>
            </div>
            {/* Lower: Category chips */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-t bg-muted/20 flex-wrap">
              <FolderTree className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <button onClick={() => {
                if (selectedCategories.has("__global__")) {
                  setSelectedCategories((p) => { const n = new Set(p); n.delete("__global__"); return n })
                } else {
                  setSelectedCategories(new Set(["__global__"]))
                }
              }}
                className={`px-2 py-0.5 text-[11px] rounded-md border transition-smooth ${selectedCategories.has("__global__") ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                通用
              </button>
              {submittedCat1Names.map((c) => {
                const on = selectedCategories.has(c)
                return (
                  <button key={c} onClick={() => setSelectedCategories((p) => { const n = new Set(p); n.delete("__global__"); n.has(c) ? n.delete(c) : n.add(c); return n })}
                    className={`px-2 py-0.5 text-[11px] rounded-md border transition-smooth ${on ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    {c}
                  </button>
                )
              })}
              {selectedCategories.size > 0 && (
                <button onClick={() => setSelectedCategories(new Set())} className="ml-auto px-2 py-0.5 text-[11px] text-destructive hover:text-destructive/80 transition-smooth">
                  清除筛选
                </button>
              )}
            </div>
          </div>

          {/* Skill Cards */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {selectedType ? `当前客户暂无「${typeLabels[selectedType]}」类型的 Skill` : "当前客户暂无 Skill，点击右上角「新建 Skill」添加"}
              </div>
            )}
            {filtered.map((skill) => {
              const Icon = typeIcons[skill.type]
              return (
                <Card key={skill.id} className="hover:shadow-card transition-smooth group">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(skill)}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        skill.status === "active" ? "bg-success/10" : skill.status === "draft" ? "bg-warning/10" : "bg-muted"
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          skill.status === "active" ? "text-success" : skill.status === "draft" ? "text-warning" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">{skill.name}</span>
                          <Badge variant={skill.status === "active" ? "success" : skill.status === "draft" ? "warning" : "muted"}>
                            {skill.status === "active" ? "启用" : skill.status === "draft" ? "草稿" : "禁用"}
                          </Badge>
                          <Badge variant="outline">{typeLabels[skill.type]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{skill.description}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {skill.clients.map((c) => (
                            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{c}</span>
                          ))}
                          {skill.categories.length > 0 && skill.categories.slice(0, 3).map((c) => (
                            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/70">{c}</span>
                          ))}
                          {skill.categories.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{skill.categories.length - 3}</span>
                          )}
                          {skill.categories.length === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">全局</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className="text-xs text-muted-foreground hidden group-hover:inline">{skill.updatedAt}</span>
                      <button
                        onClick={() => toggleStatus(skill)}
                        className="p-1.5 rounded-md hover:bg-muted transition-smooth"
                        title={skill.status === "active" ? "禁用" : "启用"}
                      >
                        {skill.status === "active"
                          ? <ToggleRight className="w-5 h-5 text-success" />
                          : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        }
                      </button>
                      <button
                        onClick={() => handleDuplicate(skill)}
                        className="p-1.5 rounded-md hover:bg-muted transition-smooth"
                        title="复制"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(skill)}>
                        <Edit3 className="w-3.5 h-3.5 mr-1" />编辑
                      </Button>
                      <button
                        onClick={() => openDelete(skill)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-smooth"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Skills Engine Architecture Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Engine 架构</CardTitle>
              <CardDescription>客户维度隔离与定制管理能力一览</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { title: "客户维度隔离", desc: "独立技能池，配置、知识、策略完全隔离", status: "已实现", color: "success", action: "查看配置" },
                  { title: "多租户安全", desc: "客户数据、日志、缓存独立存储", status: "已实现", color: "success", action: "查看日志" },
                  { title: "智能调度", desc: "匹配客户专属Skill组及Agent配置", status: "设计中", color: "warning", action: "查看设计" },
                  { title: "配置热更新", desc: "支持灰度发布、一键回滚，无需重启", status: "开发中", color: "info", action: "查看进度" },
                  { title: "可视化编排", desc: "拖拽/JSON/YAML配置，无需改代码", status: "设计中", color: "warning", action: "查看设计" },
                  { title: "客户级缓存", desc: "缓存向量、归一化结果，提升速度", status: "规划中", color: "muted", action: "查看规划" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-lg border bg-muted/20 cursor-pointer hover:shadow-card transition-smooth group/arch"
                    onClick={() => addToast({ type: "info", title: item.title, description: `${item.desc} — 当前状态: ${item.status}` })}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{item.title}</span>
                      <Badge variant={item.color as "success" | "warning" | "info" | "muted"}>{item.status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    <p className="text-[10px] text-primary mt-1.5 opacity-0 group-hover/arch:opacity-100 transition-smooth">{item.action} →</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Skill Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新建 Skill"
        description="创建新的匹配技能并分配给客户"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button variant="premium" onClick={handleCreate}><Save className="w-4 h-4 mr-1.5" />创建</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Skill 名称 *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如: 名称归一化提示词"
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">适用客户 *</label>
              <div className="flex flex-wrap gap-1.5">
                {clients.map((c) => (
                  <button key={c} onClick={() => toggleFormClient(c)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-smooth ${formClients.has(c) ? "bg-primary/10 border-primary/30 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {formClients.has(c) && <Check className="w-3 h-3 inline mr-0.5" />}{c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">技能类型</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(typeLabels).map(([key, label]) => {
                const Icon = typeIcons[key]
                return (
                  <button
                    key={key}
                    onClick={() => { setFormType(key as SkillConfig["type"]); setFormConfig({ ...defaultConfigs[key as SkillType] }) }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-smooth ${
                      formType === key ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">描述</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="描述该 Skill 的作用和适用场景..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          {renderCatTreeSelector()}
          <div className="border-t pt-4">
            <label className="text-xs font-semibold text-foreground block mb-2">类型专属配置</label>
            {renderTypeConfig()}
          </div>
        </div>
      </Modal>

      {/* Edit Skill Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="编辑 Skill"
        description={activeSkill ? `修改「${activeSkill.name}」配置` : ""}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button variant="premium" onClick={handleEdit}><Save className="w-4 h-4 mr-1.5" />保存修改</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Skill 名称</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">适用客户 *</label>
              <div className="flex flex-wrap gap-1.5">
                {clients.map((c) => (
                  <button key={c} onClick={() => toggleFormClient(c)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-smooth ${formClients.has(c) ? "bg-primary/10 border-primary/30 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {formClients.has(c) && <Check className="w-3 h-3 inline mr-0.5" />}{c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">技能类型</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(typeLabels).map(([key, label]) => {
                const Icon = typeIcons[key]
                return (
                  <button
                    key={key}
                    onClick={() => { setFormType(key as SkillConfig["type"]); setFormConfig({ ...defaultConfigs[key as SkillType] }) }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-smooth ${
                      formType === key ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">描述</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          {renderCatTreeSelector()}
          <div className="border-t pt-4">
            <label className="text-xs font-semibold text-foreground block mb-2">类型专属配置</label>
            {renderTypeConfig()}
          </div>
        </div>
      </Modal>

      {/* Skill Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={activeSkill?.name || "Skill 详情"}
        description={activeSkill ? `客户: ${activeSkill.clients.join("、")}` : ""}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
            <Button variant="outline" onClick={() => { setDetailOpen(false); if (activeSkill) openEdit(activeSkill) }}>
              <Edit3 className="w-3.5 h-3.5 mr-1" />编辑
            </Button>
            <Button variant="premium" onClick={() => {
              setDetailOpen(false)
              navigate("/similarity-match")
              addToast({ type: "info", title: "前往匹配", description: "已跳转至相似匹配页面测试该 Skill 效果" })
            }}>
              测试效果 →
            </Button>
          </>
        }
      >
        {activeSkill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">类型</span>
                <div className="flex items-center gap-2 mt-1">
                  {(() => { const I = typeIcons[activeSkill.type]; return <I className="w-4 h-4 text-primary" /> })()}
                  <span className="text-sm font-medium text-foreground">{typeLabels[activeSkill.type]}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">状态</span>
                <div className="mt-1">
                  <Badge variant={activeSkill.status === "active" ? "success" : activeSkill.status === "draft" ? "warning" : "muted"}>
                    {activeSkill.status === "active" ? "启用中" : activeSkill.status === "draft" ? "草稿" : "已禁用"}
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">客户</span>
                <p className="text-sm font-medium text-foreground mt-1">{activeSkill.clients.join("、")}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">最近更新</span>
                <p className="text-sm font-medium text-foreground mt-1">{activeSkill.updatedAt}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">描述</span>
              <p className="text-sm text-foreground mt-1">{activeSkill.description}</p>
            </div>
            {/* 适用类目 — 完整 1-2-3 级类目树展示 */}
            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">适用类目</span>
              {activeSkill.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">全局生效（所有类目）</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
                  {submittedCatTree.filter((c1) => activeSkill.categories.includes(c1.name)).map((cat1) => (
                    <div key={cat1.name} className="min-w-[180px] flex-shrink-0 rounded-lg border bg-card overflow-hidden">
                      <div className="px-3 py-2 bg-primary/5 border-b">
                        <span className="text-xs font-semibold text-primary">{cat1.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">{cat1.children.reduce((s, c2) => s + c2.children.length, 0)} 个三级类目</span>
                      </div>
                      <div className="px-2 py-1.5 space-y-1">
                        {cat1.children.map((cat2) => (
                          <div key={cat2.name}>
                            <div className="flex items-center gap-1 px-1.5 py-0.5">
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] font-medium text-foreground">{cat2.name}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">{cat2.children.length}</span>
                            </div>
                            <div className="ml-5 space-y-0.5">
                              {cat2.children.map((cat3) => (
                                <div key={cat3} className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded hover:bg-muted/50">{cat3}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg border border-dashed">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">配置内容预览</span>
              <pre className="text-xs text-muted-foreground mt-2 font-mono whitespace-pre-wrap">
{activeSkill.type === "prompt" ? `# ${activeSkill.name}
## 角色设定
你是一个专业的物料名称归一化助手。

## 任务说明
将输入的物料名称按材料、功能、规格等维度拆分为最小语义单元。

## 输出格式
- 标准名称: <归一化后的名称>
- 材质: <提取的材质信息>
- 规格: <提取的规格信息>` :
activeSkill.type === "weight" ? `{
  "vector_weights": {
    "name": 0.5,
    "model": 0.3,
    "spec": 0.2
  }
}` :
`// ${activeSkill.name}
// 类型: ${typeLabels[activeSkill.type]}
// 客户: ${activeSkill.clients.join("、")}
// 状态: ${activeSkill.status}
// 更新: ${activeSkill.updatedAt}`}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="确认删除"
        description="此操作不可撤销"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1.5" />确认删除
            </Button>
          </>
        }
      >
        {activeSkill && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-sm text-foreground">确定要删除 Skill「<strong>{activeSkill.name}</strong>」吗？</p>
            <p className="text-xs text-muted-foreground mt-1">删除后将无法恢复，关联的匹配记录不受影响</p>
          </div>
        )}
      </Modal>

      {/* Add Client Modal */}
      <Modal
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        title="添加客户"
        description="新增客户后可为其配置专属 Skill 技能池"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddClientOpen(false)}>取消</Button>
            <Button variant="premium" onClick={handleAddClient}><Plus className="w-4 h-4 mr-1.5" />添加</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">客户名称 *</label>
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="请输入客户名称"
              className="w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">添加后将自动创建独立的技能池空间，您可以随后为该客户配置匹配规则。</p>
        </div>
      </Modal>

      {/* Batch Category Modal */}
      <Modal
        open={batchCatOpen}
        onClose={() => setBatchCatOpen(false)}
        title="批量配置类目"
        description="为多个 Skill 批量关联类目"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setBatchCatOpen(false)}>取消</Button>
            <Button variant="premium" onClick={handleBatchCat}>
              <CheckCheck className="w-4 h-4 mr-1.5" />确认配置
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">选择类目</label>
            <div className="flex flex-wrap gap-1.5">
              {submittedCat1Names.map((c) => {
                const on = batchCats.has(c)
                return (
                  <button key={c} onClick={() => setBatchCats((p) => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n })}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-smooth ${on ? "bg-primary/10 border-primary/30 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {on && <Check className="w-3 h-3 inline mr-0.5" />}{c}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">选择 Skill</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {filtered.map((skill) => {
                const on = batchSkillIds.has(skill.id)
                return (
                  <button key={skill.id} onClick={() => setBatchSkillIds((p) => { const n = new Set(p); n.has(skill.id) ? n.delete(skill.id) : n.add(skill.id); return n })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition-smooth ${on ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted/30 text-foreground hover:bg-muted/50 border border-transparent"}`}>
                    {on ? <CheckCheck className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded border shrink-0" />}
                    <span className="font-medium">{skill.name}</span>
                    <Badge variant="outline" className="ml-auto">{typeLabels[skill.type]}</Badge>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            已选择 {batchCats.size} 个类目，{batchSkillIds.size} 个 Skill
          </p>
        </div>
      </Modal>
    </div>
  )
}
