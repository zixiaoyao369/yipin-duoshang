import { useState, useMemo, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/components/Toast"
import { useClient } from "@/components/ClientContext"
import { Modal } from "@/components/Modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/DataTable"
import { StatCard } from "@/components/StatCard"
import {
  Upload, FileSpreadsheet, RefreshCcw, Download, Search, Database,
  FileCheck, FileWarning, Trash2, Eye, Edit3, ArrowRight, ChevronDown, Info, Check, X, Save,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, FolderTree, Users
} from "lucide-react"

interface Material {
  id: string; skuNo: string; name: string; cat1: string; cat2: string; cat3: string
  brand: string; model: string; spec: string; mat: string; unit: string
  status: string; quality: string; client: string
}

/* ---- 默认列（缺失=异常）vs 定制列（缺失=待补充） ---- */
const defaultCols = ["skuNo", "name", "cat1", "cat3"] as const
const customCols  = ["brand", "model", "spec"] as const

function calcQuality(r: Material): string {
  const missingDefault = !r.skuNo || !r.name || !r.cat1 || !r.cat3
  const missingCustom  = !r.brand || !r.model || !r.spec
  if (missingDefault) return "abnormal"
  if (missingCustom)  return "missing"
  return "complete"
}

/* ---- 品牌映射 ---- */
const brandsByCat1: Record<string, string[]> = {
  "紧固件": ["正泰紧固", "海盐标准件", "宁波固力", "永年标准件", "温州标准件"],
  "电气电工": ["正泰", "德力西", "施耐德", "ABB", "西门子"],
  "劳保防护": ["3M", "霍尼韦尔", "代尔塔", "安思尔", "金佰利"],
  "五金工具": ["世达", "史丹利", "博世", "得力", "长城精工"],
  "管阀": ["联塑", "伟星", "金牛管业", "远大阀门", "上海阀门"],
  "密封件": ["NOK", "SKF", "中鼎密封", "茂顺密封", "派克"],
  "润滑油": ["壳牌", "美孚", "昆仑", "长城润滑", "嘉实多"],
  "磨料磨具": ["圣戈班", "3M", "金钻", "锐利", "白鸽"],
  "化工": ["乐泰", "3M", "汉高", "西卡", "回天新材"],
  "仪器仪表": ["福禄克", "雷泰", "横河", "ABB", "霍尼韦尔"],
  "照明": ["飞利浦", "欧司朗", "海洋王", "正泰照明", "雷士"],
  "清洁用品": ["妙洁", "3M", "白云清洁", "超宝", "庄臣"],
}
const clientIds = ["client-anqi", "client-jingbo", "client-wanhua"]

/* ---- 批量生成数据 ---- */
const catalog: [string, string, string, string[], string[], string[], string][] = [
  ["紧固件","螺栓","六角螺栓",["镀锌六角螺栓","高强度六角螺栓","法兰面螺栓","双头螺栓","U型螺栓"],["M8x30","M10x50","M12x60","M16x80","M20x100"],["镀锌碳钢","合金钢","304不锈钢","Q235","35CrMo"],"个"],
  ["紧固件","螺钉","内六角螺钉",["不锈钢内六角螺钉","镀镍内六角螺钉","十字沉头螺钉","自攻螺钉","机螺钉"],["M4x12","M5x16","M6x25","M8x35","M10x40"],["304不锈钢","碳钢","镀镍碳钢","不锈钢","镀锌碳钢"],"个"],
  ["紧固件","螺母","六角螺母",["镀锌六角螺母","尼龙锁紧螺母","法兰螺母","焊接螺母","蝶形螺母"],["M6","M8","M10","M12","M16"],["镀锌碳钢","304不锈钢","碳钢","Q235","合金钢"],"个"],
  ["紧固件","垫圈","平垫圈",["镀锌平垫圈","弹簧垫圈","齿形垫圈","铜垫片","绝缘垫圈"],["M6","M8","M10","M12","M16"],["镀锌碳钢","弹簧钢","304不锈钢","紫铜","尼龙"],"个"],
  ["电气电工","绝缘材料","热缩管",["单壁热缩管","双壁热缩管","硅胶绝缘套管","玻纤套管","绝缘胶带"],["Φ6","Φ10","Φ16","Φ25","19mmx20m"],["PE","PE带胶","硅橡胶","玻璃纤维","PVC"],"米"],
  ["电气电工","开关","断路器",["小型断路器","塑壳断路器","漏电保护器","交流接触器","中间继电器"],["1P 16A","2P 32A","3P 63A","3P 100A","AC220V"],["工程塑料","铜触点","银合金","工程塑料","铜线圈"],"个"],
  ["电气电工","线缆","电力电缆",["BV电线","BVR软电线","RVV护套线","YJV电缆","KVVP控制电缆"],["1.5mm²","2.5mm²","4mm²","6mm²","10mm²"],["铜芯PVC","铜芯PVC","铜芯PVC","铜芯XLPE","铜芯PVC"],"米"],
  ["劳保防护","手部防护","防静电手套",["碳纤维防静电手套","乳胶手套","耐酸碱手套","焊接手套","棉纱手套"],["S码","M码","L码","XL码","均码"],["碳纤维+PU","天然乳胶","丁腈","牛皮","棉纱"],"双"],
  ["劳保防护","面部防护","焊接面罩",["自动变光焊接面罩","防护面屏","护目镜","防冲击眼镜","防尘面具"],["全脸型","半脸型","标准型","运动型","硅胶型"],["PP","PC","PC","PC","硅橡胶"],"个"],
  ["劳保防护","呼吸防护","防尘口罩",["KN95口罩","N95口罩","活性炭口罩","防毒半面罩","滤毒盒"],["耳挂式","头戴式","带阀型","中号","配套型"],["无纺布","无纺布","活性炭","硅橡胶","ABS"],"个"],
  ["五金工具","扳手","活动扳手",["活动扳手","梅花扳手","棘轮扳手","扭矩扳手","内六角扳手"],["8寸","10寸","12寸","1/2寸","4mm"],["铬钒钢","铬钒钢","铬钒钢","合金钢","S2工具钢"],"把"],
  ["五金工具","钳子","尖嘴钳",["尖嘴钳","斜口钳","管钳","大力钳","剥线钳"],["6寸","8寸","10寸","12寸","7寸"],["铬钒钢","碳钢","铸铁","铬钼钢","碳钢"],"把"],
  ["五金工具","锤子","橡胶锤",["橡胶锤","球头锤","羊角锤","铜锤","八角锤"],["500g","300g","1lb","1.5lb","2lb"],["橡胶+木柄","碳钢+玻纤柄","碳钢+木柄","紫铜","碳钢+木柄"],"把"],
  ["管阀","管材","PPR管",["PPR冷水管","PPR热水管","PVC排水管","镀锌钢管","不锈钢管"],["DN20","DN25","DN50","DN32","DN40"],["PPR","PPR","PVC","镀锌钢","304不锈钢"],"根"],
  ["管阀","法兰","平焊法兰",["板式平焊法兰","带颈对焊法兰","盲板法兰","松套法兰","螺纹法兰"],["DN50 PN16","DN80 PN16","DN100 PN25","DN150 PN16","DN200 PN10"],["碳钢","304不锈钢","Q235","316不锈钢","碳钢"],"片"],
  ["管阀","阀门","球阀",["黄铜球阀","不锈钢球阀","铸铁闸阀","蝶阀","止回阀"],["DN15","DN20","DN50","DN100","DN25"],["黄铜","304不锈钢","铸铁","铸铁+不锈钢","黄铜"],"个"],
  ["密封件","密封圈","O型圈",["丁腈O型圈","氟橡胶O型圈","硅胶O型圈","聚四氟乙烯垫片","石墨盘根"],["Φ20x2.4","Φ30x3.5","Φ50x5","DN25","10mm"],["丁腈橡胶","氟橡胶","硅橡胶","PTFE","柔性石墨"],"个"],
  ["润滑油","润滑脂","锂基脂",["通用锂基脂","高温润滑脂","食品级润滑脂","链条润滑油","液压油"],["1kg","3kg","15kg","500ml","18L"],["锂基","复合锂基","食品级合成","矿物油","HM46"],"桶"],
  ["磨料磨具","砂轮","切割片",["不锈钢切割片","金属打磨片","百叶轮","砂纸","钢丝刷"],["Φ105x1.2","Φ100x6","Φ100x16","P80","Φ75"],["树脂+棕刚玉","树脂+氧化铝","氧化铝+布","碳化硅","钢丝"],"片"],
  ["化工","胶粘剂","环氧胶",["AB环氧胶","厌氧胶","螺纹锁固剂","瞬间胶","密封胶"],["50ml","50ml","50ml","20g","300ml"],["环氧树脂","甲基丙烯酸酯","改性丙烯酸","氰基丙烯酸乙酯","硅酮"],"支"],
  ["仪器仪表","温度仪表","温度计",["双金属温度计","红外测温仪","热电偶","温湿度计","压力表"],["0-100℃","−50~550℃","K型","壁挂式","0-1.6MPa"],["不锈钢","ABS","镍铬合金","ABS","不锈钢"],"个"],
  ["照明","工业照明","LED灯",["LED防爆灯","三防灯","LED灯管","应急灯","投光灯"],["50W","36W","18W T8","8W","100W"],["铝合金","PC","PC+铝","ABS+镍镉","铝合金"],"套"],
  ["清洁用品","清洁工具","拖把",["棉纱拖把","平板拖把","扫帚","垃圾桶","擦拭布"],["中号","大号","竹柄","60L","25x25cm"],["棉纱","超细纤维","竹+棕丝","HDPE","无纺布"],"个"],
]

function buildData(): Material[] {
  const manual: Material[] = [
    { id: "M001", skuNo: "SKU-AQ-0001", name: "304不锈钢六角螺栓", cat1: "紧固件", cat2: "螺栓", cat3: "六角螺栓", brand: "正泰紧固", model: "ZT-HB1050", spec: "M10x50", mat: "304不锈钢", unit: "个", status: "confirmed", quality: "complete", client: "client-anqi" },
    { id: "M002", skuNo: "SKU-AQ-0002", name: "碳钢内六角螺钉", cat1: "紧固件", cat2: "螺钉", cat3: "内六角螺钉", brand: "海盐标准件", model: "HY-SC0620", spec: "M6x20", mat: "碳钢", unit: "个", status: "confirmed", quality: "complete", client: "client-anqi" },
    { id: "M003", skuNo: "SKU-JB-0003", name: "绝缘胶带", cat1: "电气电工", cat2: "绝缘材料", cat3: "绝缘胶带", brand: "德力西", model: "", spec: "19mmx20m", mat: "PVC", unit: "卷", status: "pending", quality: "missing", client: "client-jingbo" },
    { id: "M004", skuNo: "SKU-JB-0004", name: "防静电手套", cat1: "劳保防护", cat2: "手部防护", cat3: "防静电手套", brand: "3M", model: "3M-ESD-L", spec: "L码", mat: "尼龙", unit: "双", status: "confirmed", quality: "complete", client: "client-jingbo" },
    { id: "M005", skuNo: "SKU-WH-0005", name: "液压扳手", cat1: "五金工具", cat2: "扳手", cat3: "液压扳手", brand: "世达", model: "", spec: "", mat: "铬钒钢", unit: "把", status: "error", quality: "missing", client: "client-wanhua" },
    { id: "M006", skuNo: "SKU-WH-0006", name: "PPR热水管", cat1: "管阀", cat2: "管材", cat3: "PPR管", brand: "伟星", model: "WX-PPR25", spec: "DN25x4m", mat: "PPR", unit: "根", status: "confirmed", quality: "complete", client: "client-wanhua" },
    { id: "M007", skuNo: "SKU-AQ-0007", name: "焊接面罩", cat1: "劳保防护", cat2: "面部防护", cat3: "焊接面罩", brand: "", model: "", spec: "", mat: "", unit: "个", status: "pending", quality: "missing", client: "client-anqi" },
    { id: "M008", skuNo: "SKU-JB-0008", name: "不锈钢法兰", cat1: "管阀", cat2: "法兰", cat3: "平焊法兰", brand: "远大阀门", model: "YD-FL5016", spec: "DN50 PN16", mat: "304不锈钢", unit: "片", status: "confirmed", quality: "complete", client: "client-jingbo" },
    { id: "M009", skuNo: "SKU-WH-0009", name: "铜垫片", cat1: "紧固件", cat2: "垫圈", cat3: "", brand: "宁波固力", model: "GL-CW10", spec: "M10", mat: "紫铜", unit: "个", status: "pending", quality: "abnormal", client: "client-wanhua" },
    { id: "M010", skuNo: "", name: "电缆桥架", cat1: "", cat2: "", cat3: "", brand: "", model: "", spec: "200x100mm", mat: "镀锌钢", unit: "", status: "pending", quality: "abnormal", client: "client-anqi" },
  ]
  const extra: Material[] = []
  let idx = 11
  const statuses = ["confirmed", "confirmed", "confirmed", "confirmed", "pending", "pending", "error"]
  const clientPrefixes: Record<string, string> = { "client-anqi": "AQ", "client-jingbo": "JB", "client-wanhua": "WH" }
  for (const [cat1, cat2, cat3, names, specs, mats, unit] of catalog) {
    const brands = brandsByCat1[cat1] || ["通用"]
    for (let j = 0; j < names.length && extra.length < 115; j++) {
      const sid = idx.toString().padStart(4, "0")
      const seed = idx * 7
      const cid = clientIds[idx % 3]
      const prefix = clientPrefixes[cid]
      const brand = brands[j % brands.length]
      const modelCode = brand.slice(0, 2).toUpperCase() + "-" + cat2.slice(0, 1) + sid
      // 约 8% 异常 (默认列缺失), 15% 待补充 (定制列缺失), 其余完整
      let spec = specs[j % specs.length], mat = mats[j % mats.length], c1 = cat1, c3 = cat3, u = unit
      let b = brand, m = modelCode, sku = `SKU-${prefix}-${sid}`
      if (seed % 13 === 0) { c3 = ""; sku = "" }              // 异常：cat3+SKU 缺失
      else if (seed % 17 === 0) { c1 = ""; c3 = ""; u = "" }  // 异常：多个默认列缺失
      else if (seed % 7 === 0) { b = ""; spec = "" }           // 待补充：brand+spec 缺失
      else if (seed % 11 === 0) { m = "" }                     // 待补充：model 缺失
      const row: Material = { id: `M${sid}`, skuNo: sku, name: names[j], cat1: c1, cat2: c1 ? cat2 : "", cat3: c3, brand: b, model: m, spec, mat, unit: u, status: "", quality: "", client: cid }
      row.quality = calcQuality(row)
      row.status = row.quality === "abnormal" ? "pending" : row.quality === "missing" ? "pending" : statuses[idx % statuses.length]
      extra.push(row)
      idx++
    }
  }
  return [...manual, ...extra]
}

const initData: Material[] = buildData()

const searchFields = [
  { key: "all", label: "全部" },
  { key: "skuNo", label: "SKU_NO" },
  { key: "name", label: "名称" },
  { key: "cat1", label: "一级类目" },
  { key: "cat3", label: "三级类目" },
  { key: "brand", label: "品牌" },
  { key: "model", label: "型号" },
  { key: "spec", label: "规格" },
] as const

const qualityFilters = [
  { key: "all", label: "全部" },
  { key: "complete", label: "完整数据" },
  { key: "missing", label: "待补充" },
  { key: "abnormal", label: "异常数据" },
] as const

/* ===================== 三级类目树 ===================== */
const catTree = [
  { name: "紧固件", children: [
    { name: "螺栓", children: ["六角螺栓", "内六角螺栓", "法兰面螺栓"] },
    { name: "螺钉", children: ["内六角螺钉", "十字螺钉", "自攻螺钉"] },
    { name: "螺母", children: ["六角螺母", "锁紧螺母", "法兰螺母"] },
    { name: "垫圈", children: ["平垫圈", "弹垫圈"] },
  ]},
  { name: "电气电工", children: [
    { name: "绝缘材料", children: ["绝缘胶带", "热缩管"] },
    { name: "开关电器", children: ["断路器", "接触器", "继电器"] },
    { name: "电线电缆", children: ["电力电缆", "布电线", "控制电缆"] },
  ]},
  { name: "劳保防护", children: [
    { name: "手部防护", children: ["防静电手套", "耐化学品手套", "焊接手套"] },
    { name: "面部防护", children: ["焊接面罩", "护目镜"] },
    { name: "呼吸防护", children: ["颗粒物防护口罩", "防毒面具"] },
  ]},
  { name: "五金工具", children: [
    { name: "扳手类", children: ["液压力矩扳手", "活动扳手", "棘轮扳手"] },
    { name: "钳子类", children: ["尖嘴钳", "管钳"] },
    { name: "锤子类", children: ["橡胶锤", "球头锤"] },
  ]},
  { name: "管阀", children: [
    { name: "管材管件", children: ["PPR管", "PVC-U排水管", "镀锌管"] },
    { name: "法兰", children: ["板式平焊法兰", "带颈对焊法兰", "盲板法兰"] },
    { name: "阀门", children: ["不锈钢球阀", "明杆闸阀", "蝶阀"] },
  ]},
  { name: "密封件", children: [
    { name: "密封圈", children: ["丁腈橡胶O型圈", "氟橡胶O型圈"] },
  ]},
  { name: "润滑油脂", children: [
    { name: "润滑脂", children: ["通用锂基润滑脂", "高温润滑脂"] },
  ]},
  { name: "磨料磨具", children: [
    { name: "切割打磨", children: ["树脂切割片", "打磨片", "百叶轮"] },
  ]},
  { name: "化工辅料", children: [
    { name: "胶粘剂", children: ["环氧树脂胶", "厌氧胶", "螺纹锁固剂"] },
  ]},
]

/* Tooltip 小组件 */
function StatusTooltip({ type }: { type: "missing" | "abnormal" }) {
  const [show, setShow] = useState(false)
  const isMissing = type === "missing"
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Badge variant={isMissing ? "warning" : "destructive"} className="cursor-help">
        {isMissing ? "待补充" : "异常"}
        <Info className="w-3 h-3 ml-1 opacity-60" />
      </Badge>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-lg bg-foreground text-background text-xs leading-relaxed shadow-lg pointer-events-none">
          {isMissing
            ? "定制列（规格、材质等）数据缺失。可在「规则配置」中调整哪些字段为定制列。补充后自动变为完整。"
            : "默认列（物料ID、名称、类目、单位等）数据缺失或异常。这些字段为系统必填项，需修复后才可正常匹配。"}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-foreground" />
        </span>
      )}
    </span>
  )
}

/* 行内编辑单元格 */
function InlineEditCell({ value, field, rowId, onSave, placeholder, variant = "normal" }: { value: string; field: string; rowId: string; onSave: (id: string, field: string, val: string) => void; placeholder?: string; variant?: "normal" | "error" }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  if (!editing) {
    if (value) return <span>{value}</span>
    const isError = variant === "error"
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setVal(""); setEditing(true) }}
        className={`${isError ? "text-destructive" : "text-warning"} italic text-sm hover:underline cursor-pointer`}
      >
        {placeholder || "点击补充"}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) { onSave(rowId, field, val.trim()); setEditing(false) }
          if (e.key === "Escape") { setVal(value); setEditing(false) }
        }}
        className="h-7 w-24 px-1.5 text-sm rounded border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button onClick={() => { if (val.trim()) { onSave(rowId, field, val.trim()); setEditing(false) } }} className="text-success hover:bg-success/10 rounded p-0.5"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={() => { setVal(value); setEditing(false) }} className="text-muted-foreground hover:bg-muted/50 rounded p-0.5"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

export default function DataPrep() {
  const nav = useNavigate()
  const { addToast } = useToast()
  const { isAdmin, clients } = useClient()
  const [tab, setTab] = useState<"overview" | "import" | "verify">("overview")
  const [data, setData] = useState(() => initData.map(d => ({ ...d, quality: calcQuality(d) })))
  const [search, setSearch] = useState("")
  const [searchField, setSearchField] = useState<string>("all")
  const [qualityFilter, setQualityFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [showImport, setShowImport] = useState(false)
  const [detailItem, setDetailItem] = useState<Material | null>(null)
  const [detailEditing, setDetailEditing] = useState(false)
  const [detailForm, setDetailForm] = useState({ skuNo: "", name: "", brand: "", model: "", spec: "", mat: "", cat1: "", cat2: "", cat3: "", unit: "" })
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [page, setPage] = useState(1)
  const [jumpInput, setJumpInput] = useState("")
  const pageSize = 10
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const fieldPickerRef = useRef<HTMLDivElement>(null)
  // 类目树状态
  const [treeExp1, setTreeExp1] = useState<string | null>(null)
  const [treeExp2, setTreeExp2] = useState<Set<string>>(new Set())
  const [treeSearch, setTreeSearch] = useState("")
  const [showCatTree, setShowCatTree] = useState(false)
  const [rules, setRules] = useState([
    { rule: "物料范围校验", desc: "检查物料是否在合同约定范围内", on: true, sev: "error" as const },
    { rule: "必填字段检查", desc: "校验名称、型号、品牌、规格等必填字段", on: true, sev: "warning" as const },
    { rule: "数据异常检测", desc: "检测测试数据、格式错误或异常值", on: true, sev: "error" as const },
    { rule: "重复数据识别", desc: "识别多条记录指向同一实物物料", on: true, sev: "warning" as const },
    { rule: "类目合规性", desc: "校验物料类目是否符合标准类目树", on: false, sev: "info" as const },
  ])

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) setShowFieldPicker(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = useMemo(() => {
    let result = data
    if (isAdmin && clientFilter !== "all") result = result.filter(d => d.client === clientFilter)
    if (qualityFilter !== "all") result = result.filter(d => d.quality === qualityFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d => {
        if (searchField === "all") return d.name.toLowerCase().includes(q) || d.skuNo.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q) || d.cat1.toLowerCase().includes(q) || d.cat3.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q) || d.model.toLowerCase().includes(q)
        return (d[searchField as keyof Material] || "").toString().toLowerCase().includes(q)
      })
    }
    return result
  }, [data, search, searchField, qualityFilter, clientFilter, isAdmin])

  const completeCount = data.filter(d => d.quality === "complete").length
  const missingCount = data.filter(d => d.quality === "missing").length
  const abnormalCount = data.filter(d => d.quality === "abnormal").length

  // 行内保存
  const handleInlineSave = (id: string, field: string, val: string) => {
    setData(p => p.map(d => {
      if (d.id !== id) return d
      const updated = { ...d, [field]: val }
      return { ...updated, quality: calcQuality(updated) }
    }))
    addToast({ type: "success", title: "已补充", description: `${({ brand: "品牌", model: "型号", spec: "规格", cat1: "一级类目", cat3: "三级类目", skuNo: "SKU_NO" } as Record<string, string>)[field] || field}已更新` })
  }

  // 类目树点击 → 搜索数据表
  const searchByCat = (catName: string, field: "cat1" | "cat3") => {
    setSearch(catName)
    setSearchField(field === "cat1" ? "cat1" : "cat3")
    setPage(1)
  }

  // 打开详情弹窗
  const openDetail = (r: Material, editMode = false) => {
    setDetailItem(r)
    setDetailEditing(editMode)
    setDetailForm({ skuNo: r.skuNo, name: r.name, brand: r.brand, model: r.model, spec: r.spec, mat: r.mat, cat1: r.cat1, cat2: r.cat2, cat3: r.cat3, unit: r.unit })
  }

  // 保存详情编辑
  const saveDetail = () => {
    if (!detailItem) return
    setData(p => p.map(d => {
      if (d.id !== detailItem.id) return d
      const updated = { ...d, ...detailForm }
      return { ...updated, quality: calcQuality(updated) }
    }))
    addToast({ type: "success", title: "保存成功", description: `${detailItem.name} 已更新` })
    setDetailItem(null)
    setDetailEditing(false)
  }

  const doImport = () => {
    setImporting(true)
    setTimeout(() => {
      setImporting(false); setShowImport(false)
      setData(p => {
        const newItems: Material[] = [
          { id: "N001", skuNo: "SKU-AQ-9001", name: "高强度螺母 M12", cat1: "紧固件", cat2: "螺母", cat3: "六角螺母", brand: "永年标准件", model: "YN-NM12", spec: "M12", mat: "碳钢 8级", unit: "个", status: "pending", quality: "complete", client: "client-anqi" },
          { id: "N002", skuNo: "SKU-JB-9002", name: "防爆扳手 19mm", cat1: "五金工具", cat2: "扳手", cat3: "防爆扳手", brand: "世达", model: "SD-AW19", spec: "19mm", mat: "铝青铜", unit: "把", status: "pending", quality: "complete", client: "client-jingbo" },
        ]
        return [...p, ...newItems.map(d => ({ ...d, quality: calcQuality(d) }))]
      })
      addToast({ type: "success", title: "导入成功", description: "成功导入 2 条新物料数据" })
    }, 2000)
  }

  const handleSubmitMatch = () => {
    if (missingCount > 0 || abnormalCount > 0) {
      setShowSubmitConfirm(true)
    } else {
      nav("/similarity-match")
      addToast({ type: "info", title: "跳转相似匹配", description: "提交数据进入匹配流程" })
    }
  }

  // 客户名称映射
  const clientNameMap: Record<string, string> = {}
  clients.filter(c => c.id !== "client-admin").forEach(c => { clientNameMap[c.id] = c.shortName })

  // 多选辅助
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize)
  const allPageSelected = pageData.length > 0 && pageData.every(d => selectedRows.has(d.id))
  const toggleRow = (id: string) => setSelectedRows(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAllPage = () => {
    if (allPageSelected) setSelectedRows(p => { const n = new Set(p); pageData.forEach(d => n.delete(d.id)); return n })
    else setSelectedRows(p => { const n = new Set(p); pageData.forEach(d => n.add(d.id)); return n })
  }

  const cols = [
    { key: "_chk", header: (<input type="checkbox" className="w-3.5 h-3.5 rounded border-muted-foreground accent-primary cursor-pointer" checked={allPageSelected} onChange={toggleAllPage} />), width: "40px", render: (r: Material) => <input type="checkbox" className="w-3.5 h-3.5 rounded border-muted-foreground accent-primary cursor-pointer" checked={selectedRows.has(r.id)} onChange={(e) => { e.stopPropagation(); toggleRow(r.id) }} onClick={(e) => e.stopPropagation()} /> },
    { key: "_idx", header: "序号", width: "50px", render: (_r: Material, idx: number) => <span className="text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</span> },
    { key: "cat1", header: "一级类目", width: "90px", render: (r: Material) => <InlineEditCell value={r.cat1} field="cat1" rowId={r.id} onSave={handleInlineSave} placeholder="点击修复" variant={!r.cat1 ? "error" : "normal"} /> },
    { key: "cat2", header: "二级类目", width: "90px", render: (r: Material) => <span className="text-foreground">{r.cat2 || <span className="text-muted-foreground italic">—</span>}</span> },
    { key: "cat3", header: "三级类目", width: "100px", render: (r: Material) => <InlineEditCell value={r.cat3} field="cat3" rowId={r.id} onSave={handleInlineSave} placeholder="点击修复" variant={!r.cat3 ? "error" : "normal"} /> },
    { key: "skuNo", header: "SKU_NO", width: "130px", render: (r: Material) => r.skuNo ? <span className="font-mono text-foreground/70">{r.skuNo}</span> : <InlineEditCell value="" field="skuNo" rowId={r.id} onSave={handleInlineSave} placeholder="点击修复" variant="error" /> },
    { key: "name", header: "名称", render: (r: Material) => <span className="text-foreground">{r.name}</span> },
    { key: "brand", header: "品牌", width: "100px", render: (r: Material) => <InlineEditCell value={r.brand} field="brand" rowId={r.id} onSave={handleInlineSave} /> },
    { key: "model", header: "型号", width: "110px", render: (r: Material) => <InlineEditCell value={r.model} field="model" rowId={r.id} onSave={handleInlineSave} /> },
    { key: "spec", header: "规格", width: "110px", render: (r: Material) => <InlineEditCell value={r.spec} field="spec" rowId={r.id} onSave={handleInlineSave} /> },
    { key: "quality", header: "数据质量", width: "90px", render: (r: Material) =>
      r.quality === "complete"
        ? <Badge variant="success">完整</Badge>
        : <StatusTooltip type={r.quality as "missing" | "abnormal"} />
    },
    { key: "act", header: "操作", width: "80px", render: (r: Material) => (
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openDetail(r) }}><Eye className="w-3 h-3 mr-1" />详情</Button>
    ) },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">数据准备</h1><p className="text-sm text-muted-foreground mt-1">物料数据导入、清洗、校验与标准化管理</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => addToast({ type: "success", title: "模板已下载", description: "已按「规则配置」中的列定义生成模板（含默认列 + 定制列）" })}><Download className="w-4 h-4 mr-1.5" />导出模板</Button>
          <Button variant="premium" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-1.5" />导入数据</Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="物料总数" value={data.length.toString()} icon={Database} />
        <StatCard title="数据完整" value={completeCount.toString()} change={`${((completeCount / data.length) * 100).toFixed(0)}%`} changeType="up" icon={FileCheck} />
        <StatCard title="待补充" value={missingCount.toString()} description="定制列数据缺失" changeType="down" icon={FileWarning} />
        <StatCard title="异常数据" value={abnormalCount.toString()} description="默认列数据缺失" changeType="down" icon={Trash2} />
      </div>
      <div className="flex items-center gap-1 border-b">
        {([["overview", "数据总览"], ["import", "导入记录"], ["verify", "校验规则"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm font-medium transition-smooth border-b-2 -mb-px ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      {tab === "overview" && (<>
        {/* 标准类目树预览 - 可折叠 */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 cursor-pointer" onClick={() => setShowCatTree(!showCatTree)}>
            <CardTitle className="flex items-center gap-2"><FolderTree className="w-4 h-4 text-primary" />标准类目树预览<Badge variant="muted" className="text-[10px] px-1.5 py-0 ml-1">{catTree.reduce((sum, c1) => sum + c1.children.reduce((s, c2) => s + c2.children.length, 0), 0)} 个三级类目</Badge></CardTitle>
            <div className="flex items-center gap-2">
              {showCatTree && (
                <div className="relative w-48" onClick={(e) => e.stopPropagation()}>
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input type="text" value={treeSearch} onChange={(e) => {
                    const v = e.target.value; setTreeSearch(v)
                    if (v) {
                      for (const c1 of catTree) {
                        const c2Match = c1.children.some((c2) => c2.name.includes(v) || c2.children.some((c3) => c3.includes(v)))
                        if (c1.name.includes(v) || c2Match) {
                          setTreeExp1(c1.name)
                          const exp2 = new Set<string>()
                          for (const c2 of c1.children) {
                            if (c2.name.includes(v) || c2.children.some((c3) => c3.includes(v))) {
                              exp2.add(`${c1.name}/${c2.name}`)
                            }
                          }
                          setTreeExp2(exp2)
                          break
                        }
                      }
                    }
                  }} placeholder="搜索类目..." className="w-full h-7 pl-7 pr-3 text-xs rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showCatTree ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
          {showCatTree && (
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {catTree.filter((c1) => !treeSearch || c1.name.includes(treeSearch) || c1.children.some((c2) => c2.name.includes(treeSearch) || c2.children.some((c3) => c3.includes(treeSearch)))).map((cat1) => (
                  <div key={cat1.name} className="min-w-[140px] flex-shrink-0 rounded-lg border bg-muted/20 overflow-hidden">
                    <button
                      className={`w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 transition-smooth ${treeExp1 === cat1.name ? "bg-accent/30" : ""}`}
                      onClick={() => { setTreeExp1(treeExp1 === cat1.name ? null : cat1.name); setTreeExp2(new Set()); searchByCat(cat1.name, "cat1") }}
                    >
                      <span className="text-sm font-semibold text-foreground">{cat1.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{cat1.children.reduce((s, c2) => s + c2.children.length, 0)}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${treeExp1 === cat1.name ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {treeExp1 === cat1.name && (
                      <div className="border-t px-2 pb-2">
                        {cat1.children.filter((c2) => !treeSearch || c2.name.includes(treeSearch) || c2.children.some((c3) => c3.includes(treeSearch))).map((cat2) => {
                          const cat2Key = `${cat1.name}/${cat2.name}`
                          const isExp2 = treeExp2.has(cat2Key)
                          return (
                            <div key={cat2.name} className="mt-1.5">
                              <button
                                className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs font-medium text-foreground rounded hover:bg-accent/40 transition-smooth ${isExp2 ? "bg-accent/20" : ""}`}
                                onClick={() => {
                                  setTreeExp2((prev) => { const n = new Set(prev); n.has(cat2Key) ? n.delete(cat2Key) : n.add(cat2Key); return n })
                                  searchByCat(cat2.name, "cat3")
                                }}
                              >
                                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isExp2 ? "rotate-90" : ""}`} />
                                {cat2.name}
                                <span className="ml-auto text-[10px] text-muted-foreground">{cat2.children.length}</span>
                              </button>
                              {isExp2 && (
                                <div className="ml-5 space-y-0.5 mt-0.5">
                                  {cat2.children.filter((c3) => !treeSearch || c3.includes(treeSearch)).map((cat3) => (
                                    <button key={cat3} className="block w-full text-left px-2 py-0.5 text-xs text-muted-foreground rounded hover:bg-primary/10 hover:text-primary transition-smooth" onClick={() => searchByCat(cat3, "cat3")}>
                                      {cat3}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex items-center gap-3">
          {/* 管理员：客户筛选 */}
          {isAdmin && (
            <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg shrink-0">
              <Users className="w-3.5 h-3.5 text-muted-foreground ml-2" />
              {[{ id: "all", label: "全部客户" }, ...clients.filter(c => c.id !== "client-admin").map(c => ({ id: c.id, label: c.shortName }))].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setClientFilter(opt.id); setPage(1) }}
                  className={`px-2.5 py-1.5 text-xs rounded-md transition-smooth whitespace-nowrap ${clientFilter === opt.id ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >{opt.label}</button>
              ))}
            </div>
          )}
          {/* 列选择下拉 + 搜索框 */}
          <div className="flex-1 flex items-center border rounded-md bg-card focus-within:ring-2 focus-within:ring-ring">
            <div className="relative" ref={fieldPickerRef}>
              <button
                onClick={() => setShowFieldPicker(!showFieldPicker)}
                className="flex items-center gap-1 px-3 h-9 text-xs text-muted-foreground border-r hover:bg-muted/50 transition-smooth whitespace-nowrap"
              >
                {searchFields.find(f => f.key === searchField)?.label || "全部"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showFieldPicker && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[120px]">
                  {searchFields.map(f => (
                    <button
                      key={f.key}
                      onClick={() => { setSearchField(f.key); setShowFieldPicker(false) }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-smooth ${searchField === f.key ? "text-primary font-medium" : "text-foreground"}`}
                    >{f.label}</button>
                  ))}
                </div>
              )}
            </div>
            <Search className="w-4 h-4 text-muted-foreground ml-2.5 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`搜索${searchField === "all" ? "物料名称、ID或规格" : searchFields.find(f => f.key === searchField)?.label || ""}...`}
              className="flex-1 h-9 px-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          {/* 状态筛选 */}
          <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg">
            {qualityFilters.map(f => (
              <button
                key={f.key}
                onClick={() => { setQualityFilter(f.key); setPage(1) }}
                className={`px-3 py-1.5 text-xs rounded-md transition-smooth whitespace-nowrap ${qualityFilter === f.key ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f.label}
                {f.key !== "all" && (
                  <span className={`ml-1 text-[10px] ${qualityFilter === f.key ? "text-primary" : "text-muted-foreground"}`}>
                    {f.key === "complete" ? completeCount : f.key === "missing" ? missingCount : abnormalCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setSearchField("all"); setQualityFilter("all"); setClientFilter("all"); addToast({ type: "info", title: "已重置" }) }}><RefreshCcw className="w-4 h-4 mr-1.5" />重置</Button>
          <Button variant="premium" size="sm" onClick={handleSubmitMatch}><ArrowRight className="w-4 h-4 mr-1.5" />提交匹配</Button>
        </div>
        {/* 批量操作栏 */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-primary/5 border-primary/20">
            <span className="text-xs font-medium text-primary">已选 {selectedRows.size} 条</span>
            <div className="w-px h-4 bg-border" />
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              const ids = selectedRows
              setData(p => p.map(d => {
                if (!ids.has(d.id)) return d
                const updated = { ...d, status: "confirmed" }
                return { ...updated, quality: calcQuality(updated) }
              }))
              addToast({ type: "success", title: "批量确认", description: `已确认 ${selectedRows.size} 条数据` })
              setSelectedRows(new Set())
            }}><Check className="w-3 h-3 mr-1" />批量确认</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              const confirmedData = data.filter(d => selectedRows.has(d.id) && d.quality === "complete")
              if (confirmedData.length === 0) { addToast({ type: "warning", title: "无可导出数据", description: "所选数据中没有完整数据" }); return }
              addToast({ type: "success", title: "导出成功", description: `已导出 ${confirmedData.length} 条选中的完整数据` })
              setSelectedRows(new Set())
            }}><Download className="w-3 h-3 mr-1" />导出选中</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => {
              setData(p => p.filter(d => !selectedRows.has(d.id)))
              addToast({ type: "warning", title: "批量删除", description: `已删除 ${selectedRows.size} 条数据` })
              setSelectedRows(new Set())
            }}><Trash2 className="w-3 h-3 mr-1" />批量删除</Button>
            <button className="text-xs text-muted-foreground hover:text-foreground ml-auto" onClick={() => setSelectedRows(new Set())}>清除选择</button>
          </div>
        )}
        <DataTable columns={cols} data={filtered.slice((page - 1) * pageSize, page * pageSize)} onRowClick={(r) => openDetail(r as Material)} />
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
          const startRow = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1
          const endRow = Math.min(page * pageSize, filtered.length)
          // 生成页码按钮
          const pageNums: (number | "...")[] = []
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pageNums.push(i)
          } else {
            pageNums.push(1)
            if (page > 3) pageNums.push("...")
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNums.push(i)
            if (page < totalPages - 2) pageNums.push("...")
            pageNums.push(totalPages)
          }
          return (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>显示 {startRow}-{endRow} 条，共 {filtered.length} 条{qualityFilter !== "all" ? `（筛选自 ${data.length} 条）` : ""}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)} title="首页"><ChevronsLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} title="上一页"><ChevronLeft className="w-4 h-4" /></Button>
                {pageNums.map((p, i) =>
                  p === "..." ? <span key={`e${i}`} className="px-1 text-xs">...</span> : <Button key={p} variant={page === p ? "default" : "outline"} size="sm" onClick={() => setPage(p as number)}>{p}</Button>
                )}
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)} title="下一页"><ChevronRight className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(totalPages)} title="尾页"><ChevronsRight className="w-4 h-4" /></Button>
                <span className="text-xs ml-2">跳至</span>
                <input
                  type="text"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt(jumpInput)
                      if (n >= 1 && n <= totalPages) { setPage(n); setJumpInput("") }
                    }
                  }}
                  className="w-12 h-7 px-1.5 text-xs text-center rounded border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={`${page}`}
                />
                <span className="text-xs">页</span>
              </div>
            </div>
          )
        })()}
      </>)}
      {tab === "import" && (
        <Card><CardHeader><CardTitle>导入记录</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {[{ file: "安琪酵母_物料清单_V3.xlsx", rows: 4200, time: "2026-04-08 14:30", st: "success", user: "王工" }, { file: "京博石化_物料数据_批次2.xlsx", rows: 3200, time: "2026-04-06 10:15", st: "success", user: "李工" }, { file: "安琪酵母_补充数据.xlsx", rows: 820, time: "2026-04-03 16:40", st: "partial", user: "王工" }, { file: "万华化学_初始物料.xlsx", rows: 300, time: "2026-04-01 09:00", st: "failed", user: "张工" }].map((it, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-smooth cursor-pointer" onClick={() => addToast({ type: "info", title: it.file, description: `${it.rows} 行，${it.user} 上传于 ${it.time}` })}>
              <div className="flex items-center gap-3"><FileSpreadsheet className="w-5 h-5 text-success" /><div><p className="text-sm font-medium text-foreground">{it.file}</p><p className="text-xs text-muted-foreground">{it.rows} 行 · {it.user} · {it.time}</p></div></div>
              <div className="flex items-center gap-2">
                <Badge variant={it.st === "success" ? "success" : it.st === "partial" ? "warning" : "destructive"}>{it.st === "success" ? "成功" : it.st === "partial" ? "部分成功" : "失败"}</Badge>
                {it.st === "failed" && <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); addToast({ type: "info", title: "重新导入", description: `正在重新处理 ${it.file}` }) }}>重试</Button>}
              </div>
            </div>))}
        </div></CardContent></Card>
      )}
      {tab === "verify" && (
        <Card><CardHeader><CardTitle>校验规则配置</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {rules.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${r.on ? "bg-success" : "bg-muted-foreground"}`} /><div><p className="text-sm font-medium text-foreground">{r.rule}</p><p className="text-xs text-muted-foreground">{r.desc}</p></div></div>
              <div className="flex items-center gap-2">
                <Badge variant={r.sev === "error" ? "destructive" : r.sev === "warning" ? "warning" : "info"}>{r.sev === "error" ? "严重" : r.sev === "warning" ? "警告" : "提示"}</Badge>
                <button onClick={() => { setRules(p => p.map((x, j) => j === i ? { ...x, on: !x.on } : x)); addToast({ type: r.on ? "warning" : "success", title: r.on ? "已禁用" : "已启用", description: r.rule }) }} className={`w-10 h-5 rounded-full relative transition-smooth ${r.on ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-smooth ${r.on ? "right-0.5" : "left-0.5"}`} /></button>
              </div>
            </div>))}
        </div></CardContent></Card>
      )}
      {/* 导入弹窗 */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="导入物料数据" description="上传 Excel 文件批量导入物料信息" footer={<><Button variant="outline" onClick={() => setShowImport(false)}>取消</Button><Button variant="premium" onClick={doImport} disabled={importing}>{importing ? "导入中..." : "开始导入"}</Button></>}>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-smooth cursor-pointer" onClick={() => addToast({ type: "info", title: "已选择文件", description: "demo_materials.xlsx" })}><Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" /><p className="text-sm font-medium text-foreground">点击或拖拽文件到此处</p><p className="text-xs text-muted-foreground mt-1">支持 .xlsx, .xls, .csv 格式</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs font-medium text-foreground mb-1">已选文件</p><div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-success" /><span className="text-sm">demo_materials.xlsx</span><span className="text-xs text-muted-foreground">(2 条)</span></div></div>
        </div>
      </Modal>
      {/* 详情 + 编辑合并弹窗 */}
      <Modal
        open={!!detailItem}
        onClose={() => { setDetailItem(null); setDetailEditing(false) }}
        title={detailEditing ? "编辑物料" : "物料详情"}
        description={detailItem ? `${detailItem.skuNo || detailItem.id} · ${detailItem.name}` : ""}
        size="lg"
        footer={
          detailEditing ? (
            <>
              <Button variant="outline" onClick={() => setDetailEditing(false)}>取消编辑</Button>
              <Button variant="premium" onClick={saveDetail}><Save className="w-4 h-4 mr-1.5" />保存</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setDetailItem(null); setDetailEditing(false) }}>关闭</Button>
              <Button variant="outline" onClick={() => setDetailEditing(true)}><Edit3 className="w-4 h-4 mr-1.5" />编辑</Button>
              <Button onClick={() => { setDetailItem(null); setDetailEditing(false); nav("/similarity-match"); addToast({ type: "info", title: "跳转相似匹配" }) }}>查看匹配 <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </>
          )
        }
      >
        {detailItem && !detailEditing && (
          <div className="grid grid-cols-2 gap-4">
            {([["SKU_NO", detailItem.skuNo], ["名称", detailItem.name], ["一级类目", detailItem.cat1], ["二级类目", detailItem.cat2], ["三级类目", detailItem.cat3], ["品牌", detailItem.brand], ["型号", detailItem.model], ["规格", detailItem.spec], ["材质", detailItem.mat], ["单位", detailItem.unit]] as const).map(([l, v]) => (
              <div key={l} className="space-y-1">
                <p className="text-xs text-muted-foreground">{l}</p>
                {v ? <p className="text-sm font-medium text-foreground">{v}</p> : (
                  <button onClick={() => setDetailEditing(true)} className="text-sm text-warning italic hover:underline cursor-pointer">待补充 — 点击编辑</button>
                )}
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <p className="text-xs text-muted-foreground">数据质量</p>
              {detailItem.quality === "complete" ? <Badge variant="success">完整</Badge> : <StatusTooltip type={detailItem.quality as "missing" | "abnormal"} />}
            </div>
          </div>
        )}
        {detailItem && detailEditing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">SKU_NO</label>
              <p className="text-sm font-medium text-foreground h-9 flex items-center font-mono">{detailItem.skuNo || <span className="text-warning italic">未填写</span>}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">名称</label>
              <p className="text-sm font-medium text-foreground h-9 flex items-center">{detailItem.name}</p>
            </div>
            {([
              ["cat1", "一级类目", detailForm.cat1],
              ["cat2", "二级类目", detailForm.cat2],
              ["cat3", "三级类目", detailForm.cat3],
              ["brand", "品牌", detailForm.brand],
              ["model", "型号", detailForm.model],
              ["spec", "规格", detailForm.spec],
              ["mat", "材质", detailForm.mat],
              ["unit", "单位", detailForm.unit],
            ] as const).map(([key, label, value]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setDetailForm(f => ({ ...f, [key]: e.target.value }))}
                  className={`w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${!value ? "border-warning/50" : ""}`}
                  placeholder={`请输入${label}`}
                />
              </div>
            ))}
          </div>
        )}
      </Modal>
      {/* 提交匹配确认弹窗 */}
      <Modal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="提交匹配确认"
        description="当前数据中存在未处理的问题"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>取消</Button>
            <Button variant="premium" onClick={() => {
              setShowSubmitConfirm(false)
              nav("/similarity-match")
              addToast({ type: "info", title: "已提交匹配", description: `仅处理 ${completeCount} 条完整数据，${missingCount + abnormalCount} 条问题数据已跳过` })
            }}>
              仅提交完整数据 ({completeCount} 条)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">{data.length}</p>
              <p className="text-xs text-muted-foreground mt-1">物料总数</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 text-center">
              <p className="text-2xl font-bold text-warning">{missingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">待补充</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-2xl font-bold text-destructive">{abnormalCount}</p>
              <p className="text-xs text-muted-foreground mt-1">异常数据</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
            <p className="text-sm text-foreground">
              当前共 <strong>{data.length}</strong> 条物料，其中仍有 <strong className="text-warning">{missingCount}</strong> 条待补充、<strong className="text-destructive">{abnormalCount}</strong> 条异常数据。
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              点击「仅提交完整数据」将只处理 {completeCount} 条完整数据进入类目匹配。未处理的数据可后续补充后再提交。
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
