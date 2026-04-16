import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/components/Toast"
import { useClient } from "@/components/ClientContext"
import { Modal } from "@/components/Modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  GitCompareArrows, CheckCircle2, Search, Eye, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronRight, Zap, Bug, Download, FileSpreadsheet,
  ShieldCheck, CheckCheck, Edit3, Sparkles, ArrowRight, XCircle, Save,
  ChevronsLeft, ChevronsRight, ChevronLeft, FolderTree, Users, RefreshCcw, History, Settings2, Clock
} from "lucide-react"

interface Match {
  sku: string; spec: string; supplier: string; score: number
  type: "exact" | "fuzzy" | "none"
  status: "suggestion" | "adjusted" | "confirmed" | "rejected"
  adjustedSku?: string; adjustedSpec?: string
  catLv?: number // 类目匹配级别：0=不匹配, 1=一级准确, 2=二级准确, 3=三级准确
}
interface Group {
  id: number; master: string; mSpec: string; mSup: string; cat: string
  matches: Match[]
  client: string
}

/* ---- 标准类目树 ---- */
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
    { name: "连接器", children: ["接线端子"] },
  ]},
  { name: "劳保防护", children: [
    { name: "手部防护", children: ["防静电手套", "耐化学品手套", "焊接手套"] },
    { name: "面部防护", children: ["焊接面罩", "护目镜"] },
    { name: "头部防护", children: ["安全帽"] },
    { name: "足部防护", children: ["安全鞋"] },
    { name: "呼吸防护", children: ["颗粒物防护口罩", "防毒面具"] },
  ]},
  { name: "五金工具", children: [
    { name: "扳手类", children: ["液压力矩扳手", "活动扳手", "棘轮扳手"] },
    { name: "螺丝刀", children: ["十字螺丝刀"] },
    { name: "量具", children: ["游标卡尺"] },
    { name: "刀具", children: ["美工刀"] },
    { name: "钳子类", children: ["尖嘴钳", "管钳"] },
    { name: "锤子类", children: ["橡胶锤", "球头锤"] },
  ]},
  { name: "管阀件", children: [
    { name: "球阀", children: ["不锈钢球阀"] },
    { name: "管接头", children: ["卡套接头"] },
  ]},
  { name: "密封件", children: [
    { name: "O型圈", children: ["氟橡胶O型圈"] },
    { name: "油封", children: ["骨架油封"] },
  ]},
  { name: "轴承", children: [
    { name: "深沟球轴承", children: ["6205"] },
  ]},
  { name: "化工原料", children: [
    { name: "润滑油", children: ["液压油"] },
    { name: "清洗剂", children: ["工业清洗剂"] },
  ]},
  { name: "办公用品", children: [
    { name: "标签", children: ["热敏标签"] },
    { name: "打印耗材", children: ["碳带"] },
  ]},
  { name: "焊接材料", children: [
    { name: "焊条", children: ["碳钢焊条", "不锈钢焊条", "铸铁焊条"] },
    { name: "焊丝", children: ["实心焊丝", "药芯焊丝"] },
    { name: "焊剂", children: ["烧结焊剂"] },
  ]},
  { name: "测量仪器", children: [
    { name: "温度计", children: ["红外测温仪", "热电偶"] },
    { name: "压力表", children: ["数字压力表", "膜盒压力表"] },
  ]},
  { name: "泵类设备", children: [
    { name: "离心泵", children: ["单级离心泵", "多级离心泵"] },
    { name: "隔膜泵", children: ["气动隔膜泵"] },
    { name: "齿轮泵", children: ["液压齿轮泵"] },
  ]},
  { name: "液压气动", children: [
    { name: "液压缸", children: ["标准液压缸", "薄型液压缸"] },
    { name: "气缸", children: ["标准气缸", "迷你气缸", "无杆气缸"] },
    { name: "电磁阀", children: ["二位三通电磁阀", "二位五通电磁阀"] },
  ]},
  { name: "传动部件", children: [
    { name: "同步带", children: ["橡胶同步带", "聚氨酯同步带"] },
    { name: "链条", children: ["滚子链", "双排链"] },
    { name: "联轴器", children: ["弹性联轴器", "刚性联轴器"] },
  ]},
  { name: "电机电控", children: [
    { name: "三相电机", children: ["普通三相电机", "变频电机"] },
    { name: "步进电机", children: ["两相步进电机"] },
    { name: "伺服电机", children: ["交流伺服电机"] },
  ]},
  { name: "仪器仪表", children: [
    { name: "流量计", children: ["电磁流量计", "涡街流量计"] },
    { name: "液位计", children: ["磁翻板液位计", "超声波液位计"] },
  ]},
  { name: "暖通空调", children: [
    { name: "风机", children: ["离心风机", "轴流风机"] },
    { name: "散热器", children: ["铝型材散热器"] },
  ]},
  { name: "消防器材", children: [
    { name: "灭火器", children: ["干粉灭火器", "CO2灭火器"] },
    { name: "消防水带", children: ["衬胶水带"] },
  ]},
  { name: "搬运设备", children: [
    { name: "手推车", children: ["平板手推车", "工具车"] },
    { name: "升降台", children: ["液压升降台"] },
  ]},
  { name: "清洁用品", children: [
    { name: "拖把", children: ["工业拖把"] },
    { name: "垃圾桶", children: ["分类垃圾桶", "脚踏垃圾桶"] },
  ]},
  { name: "胶粘剂", children: [
    { name: "结构胶", children: ["环氧结构胶", "厌氧胶"] },
    { name: "密封胶", children: ["硅酮密封胶", "聚氨酯密封胶"] },
  ]},
  { name: "磨料磨具", children: [
    { name: "砂轮", children: ["平面砂轮", "杯形砂轮"] },
    { name: "砂纸", children: ["干磨砂纸", "水磨砂纸"] },
    { name: "百叶轮", children: ["平面百叶轮"] },
  ]},
  { name: "线缆附件", children: [
    { name: "线槽", children: ["PVC线槽", "镀锌线槽"] },
    { name: "扎带", children: ["尼龙扎带", "不锈钢扎带"] },
  ]},
  { name: "照明灯具", children: [
    { name: "LED灯", children: ["LED工矿灯", "LED投光灯", "LED日光灯"] },
    { name: "防爆灯", children: ["LED防爆灯"] },
  ]},
  { name: "包装材料", children: [
    { name: "打包带", children: ["PP打包带", "PET打包带"] },
    { name: "缠绕膜", children: ["PE缠绕膜"] },
    { name: "气泡膜", children: ["防静电气泡膜"] },
  ]},
  { name: "刀具刃具", children: [
    { name: "铣刀", children: ["硬质合金铣刀", "高速钢铣刀"] },
    { name: "钻头", children: ["麻花钻头", "阶梯钻头"] },
  ]},
  { name: "气体检测", children: [
    { name: "气体报警器", children: ["可燃气体报警器", "有毒气体报警器"] },
    { name: "检测管", children: ["快速检测管"] },
  ]},
  { name: "安防监控", children: [
    { name: "摄像头", children: ["红外摄像头", "高清球机"] },
    { name: "门禁", children: ["IC卡门禁"] },
  ]},
  { name: "过滤材料", children: [
    { name: "滤芯", children: ["液压滤芯", "空气滤芯", "水滤芯"] },
    { name: "滤袋", children: ["除尘滤袋"] },
  ]},
  { name: "弹簧", children: [
    { name: "压缩弹簧", children: ["普通压缩弹簧"] },
    { name: "拉伸弹簧", children: ["标准拉伸弹簧"] },
    { name: "扭转弹簧", children: ["单扭弹簧"] },
  ]},
  { name: "链条索具", children: [
    { name: "吊索", children: ["钢丝绳吊索", "尼龙吊带"] },
    { name: "卸扣", children: ["弓形卸扣", "D形卸扣"] },
  ]},
  { name: "脚轮", children: [
    { name: "万向轮", children: ["带刹万向轮", "重型万向轮"] },
    { name: "定向轮", children: ["橡胶定向轮"] },
  ]},
  { name: "标识标牌", children: [
    { name: "安全标识", children: ["警告标识", "禁止标识", "指令标识"] },
    { name: "管道标识", children: ["管道流向标识"] },
  ]},
  { name: "防腐材料", children: [
    { name: "防锈漆", children: ["环氧防锈漆", "醇酸防锈漆"] },
    { name: "防腐涂料", children: ["环氧富锌底漆"] },
  ]},
  { name: "橡塑制品", children: [
    { name: "橡胶板", children: ["工业橡胶板", "绝缘橡胶板"] },
    { name: "塑料板", children: ["PVC板", "PP板"] },
  ]},
  { name: "金属材料", children: [
    { name: "钢板", children: ["碳钢板", "不锈钢板"] },
    { name: "圆钢", children: ["45号圆钢"] },
    { name: "角钢", children: ["等边角钢"] },
  ]},
  { name: "电子元器件", children: [
    { name: "熔断器", children: ["陶瓷熔断器", "玻璃管熔断器"] },
    { name: "变压器", children: ["控制变压器"] },
  ]},
  { name: "减速机", children: [
    { name: "蜗轮减速机", children: ["RV蜗轮减速机"] },
    { name: "行星减速机", children: ["精密行星减速机"] },
  ]},
  { name: "储存设备", children: [
    { name: "货架", children: ["中型货架", "重型货架"] },
    { name: "零件盒", children: ["组合式零件盒", "抽屉式零件盒"] },
  ]},
  { name: "通风除尘", children: [
    { name: "除尘器", children: ["布袋除尘器", "旋风除尘器"] },
    { name: "风管", children: ["镀锌风管"] },
  ]},
]

const clientIds = ["client-anqi", "client-jingbo", "client-wanhua"]

const initG: Group[] = ([
  { id: 1, master: "304不锈钢六角螺栓 M10x50", mSpec: "M10x50 / 304不锈钢", mSup: "震坤行", cat: "紧固件 > 螺栓 > 六角螺栓", matches: [
    { sku: "不锈钢外六角螺栓 M10*50", spec: "M10x50 / 304", supplier: "京东工业", score: 96, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "六角螺栓 SUS304 M10x50", spec: "M10x50 / SUS304", supplier: "西域", score: 93, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "304不锈钢螺栓 M10x45", spec: "M10x45 / 304不锈钢", supplier: "固安捷", score: 78, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 2, master: "PVC绝缘胶带 黑色 19mmx20m", mSpec: "19mmx20m / PVC", mSup: "震坤行", cat: "电气电工 > 绝缘材料 > 绝缘胶带", matches: [
    { sku: "电工绝缘胶带 黑色 19mm", spec: "19mmx20m / PVC", supplier: "京东工业", score: 91, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "PVC电气绝缘胶带", spec: "18mmx18m / PVC", supplier: "西域", score: 72, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 3, master: "防静电手套 碳纤维涂掌", mSpec: "L码 / 碳纤维+PU", mSup: "震坤行", cat: "劳保防护 > 手部防护 > 防静电手套", matches: [
    { sku: "碳纤维防静电涂掌手套", spec: "L码 / 碳纤维涂PU", supplier: "固安捷", score: 94, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "防静电PU手套 灰色", spec: "L码 / 尼龙+PU", supplier: "京东工业", score: 68, type: "fuzzy", status: "rejected", catLv: 1 },
  ]},
  { id: 4, master: "液压力矩扳手 1/2寸", mSpec: "1/2寸 / 铬钒钢", mSup: "震坤行", cat: "五金工具 > 扳手 > 力矩扳手", matches: [
    { sku: "预置式液压扳手 12.7mm", spec: "12.7mm / 合金钢", supplier: "西域", score: 82, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 5, master: "镀锌六角螺母 M10", mSpec: "M10 / 碳钢镀锌", mSup: "震坤行", cat: "紧固件 > 螺母 > 六角螺母", matches: [
    { sku: "碳钢镀锌六角螺母 M10", spec: "M10 / Q235镀锌", supplier: "京东工业", score: 97, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "六角螺母 M10 8级", spec: "M10 / 碳钢8级", supplier: "西域", score: 91, type: "exact", status: "confirmed", catLv: 3 },
  ]},
  { id: 6, master: "弹簧垫圈 M8 镀锌", mSpec: "M8 / 65Mn弹簧钢", mSup: "西域", cat: "紧固件 > 垫圈 > 弹簧垫圈", matches: [
    { sku: "弹垫 M8 电镀锌", spec: "M8 / 弹簧钢镀锌", supplier: "震坤行", score: 94, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "平垫圈 M8", spec: "M8 / 碳钢", supplier: "固安捷", score: 42, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 7, master: "小型断路器 2P 32A", mSpec: "2P 32A / C曲线", mSup: "震坤行", cat: "电气电工 > 开关 > 断路器", matches: [
    { sku: "微型断路器 DZ47-63 2P 32A", spec: "2P 32A / C型", supplier: "京东工业", score: 95, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "空气开关 2P 32A", spec: "2P 32A", supplier: "西域", score: 89, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "漏电保护器 2P 32A 30mA", spec: "2P 32A / 30mA", supplier: "固安捷", score: 71, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 8, master: "控制电缆 KVV 4×1.5", mSpec: "4×1.5mm² / 铜芯", mSup: "震坤行", cat: "电气电工 > 电缆 > 控制电缆", matches: [
    { sku: "KVV控制电缆 4*1.5", spec: "4×1.5mm² / 铜芯PVC", supplier: "京东工业", score: 96, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "KVVP屏蔽控制电缆 4*1.5", spec: "4×1.5mm² / 铜芯屏蔽", supplier: "西域", score: 76, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 9, master: "ABS安全帽 V型 白色", mSpec: "V型 / ABS / 白色", mSup: "震坤行", cat: "劳保防护 > 头部防护 > 安全帽", matches: [
    { sku: "V型ABS安全帽 白色", spec: "V型 / ABS材质 / 白色", supplier: "京东工业", score: 98, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "PE安全帽 白色", spec: "V型 / PE / 白色", supplier: "固安捷", score: 73, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 10, master: "防砸防刺穿安全鞋 42码", mSpec: "42码 / 牛皮 / 钢头钢底", mSup: "震坤行", cat: "劳保防护 > 足部防护 > 安全鞋", matches: [
    { sku: "劳保安全鞋 钢头 42码", spec: "42码 / 牛皮面 / 钢包头", supplier: "京东工业", score: 92, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "防砸劳保鞋 42", spec: "42码 / 超纤皮", supplier: "西域", score: 77, type: "fuzzy", status: "suggestion", catLv: 2 },
    { sku: "电工绝缘鞋 42码", spec: "42码 / 绝缘", supplier: "固安捷", score: 38, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 11, master: "十字螺丝刀 PH2×150mm", mSpec: "PH2×150mm / 铬钒钢", mSup: "震坤行", cat: "五金工具 > 螺丝刀 > 十字螺丝刀", matches: [
    { sku: "十字起子 PH2 150mm", spec: "PH2×150mm / CrV", supplier: "京东工业", score: 97, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "Phillips螺丝刀 PH2", spec: "PH2×150mm", supplier: "西域", score: 93, type: "exact", status: "confirmed", catLv: 3 },
  ]},
  { id: 12, master: "数显游标卡尺 0-150mm", mSpec: "0-150mm / 不锈钢 / 0.01mm", mSup: "震坤行", cat: "五金工具 > 量具 > 游标卡尺", matches: [
    { sku: "电子数显卡尺 150mm", spec: "0-150mm / 不锈钢", supplier: "京东工业", score: 95, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "不锈钢游标卡尺 0-150", spec: "0-150mm / 不锈钢 / 0.02mm", supplier: "西域", score: 90, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "外径千分尺 0-25mm", spec: "0-25mm / 0.001mm", supplier: "固安捷", score: 35, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 13, master: "氟橡胶O型圈 30×3mm", mSpec: "30×3mm / FKM", mSup: "震坤行", cat: "密封件 > O型圈 > 氟橡胶O型圈", matches: [
    { sku: "FKM O型密封圈 30*3", spec: "内径30×线径3mm / FKM75", supplier: "京东工业", score: 96, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "丁腈橡胶O型圈 30*3", spec: "30×3mm / NBR70", supplier: "西域", score: 74, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 14, master: "深沟球轴承 6205ZZ", mSpec: "25×52×15mm / 钢", mSup: "震坤行", cat: "轴承 > 深沟球轴承 > 6205", matches: [
    { sku: "NSK 6205ZZ 深沟球轴承", spec: "25×52×15mm / 双金属密封", supplier: "京东工业", score: 98, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "SKF 6205-2RS1", spec: "25×52×15mm / 双橡胶密封", supplier: "西域", score: 95, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "HRB 6204ZZ", spec: "20×47×14mm", supplier: "固安捷", score: 55, type: "none", status: "rejected", catLv: 2 },
  ]},
  { id: 15, master: "304不锈钢球阀 DN25", mSpec: "DN25 / 1寸 / 304SS", mSup: "震坤行", cat: "管阀件 > 球阀 > 不锈钢球阀", matches: [
    { sku: "304球阀 DN25 内螺纹", spec: "DN25 / 1寸 / 304不锈钢", supplier: "京东工业", score: 97, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "不锈钢法兰球阀 DN25", spec: "DN25 / 法兰连接 / 304", supplier: "西域", score: 85, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 16, master: "304卡套式管接头 Φ12", mSpec: "Φ12 / 304不锈钢", mSup: "震坤行", cat: "管阀件 > 管接头 > 卡套接头", matches: [
    { sku: "304不锈钢卡套接头 12mm", spec: "Φ12 / 双卡套 / 304SS", supplier: "京东工业", score: 94, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "快插式气管接头 Φ12", spec: "Φ12 / 铜镀镍", supplier: "固安捷", score: 48, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 17, master: "抗磨液压油 L-HM46", mSpec: "L-HM46 / 18L", mSup: "震坤行", cat: "化工原料 > 润滑油 > 液压油", matches: [
    { sku: "46#抗磨液压油 18升", spec: "HM46 / 18L / 桶装", supplier: "京东工业", score: 96, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "液压油 L-HM46", spec: "HM46 / 200L", supplier: "西域", score: 91, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "导轨油 68#", spec: "68# / 18L", supplier: "固安捷", score: 40, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 18, master: "金属零件清洗剂 20L", mSpec: "20L / 水基型", mSup: "震坤行", cat: "化工原料 > 清洗剂 > 工业清洗剂", matches: [
    { sku: "工业金属清洗剂 20L", spec: "20L / 水基环保型", supplier: "京东工业", score: 93, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "除油清洗剂 25L", spec: "25L / 碱性", supplier: "西域", score: 78, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 19, master: "三防热敏标签 40×30mm", mSpec: "40×30mm / 1000张/卷", mSup: "震坤行", cat: "办公用品 > 标签 > 热敏标签", matches: [
    { sku: "热敏不干胶标签 40*30", spec: "40×30mm / 三防 / 1000张", supplier: "京东工业", score: 95, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "铜版纸标签 40*30", spec: "40×30mm / 1000张", supplier: "西域", score: 68, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 20, master: "蜡基碳带 110mm×300m", mSpec: "110mm×300m / 外碳", mSup: "震坤行", cat: "办公用品 > 打印耗材 > 碳带", matches: [
    { sku: "增强蜡基碳带 110mm*300m", spec: "110mm×300m / 外碳 / 1寸芯", supplier: "京东工业", score: 97, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "混合基碳带 110mm×300m", spec: "110mm×300m / 外碳", supplier: "西域", score: 75, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 21, master: "12.9级内六角螺钉 M6×20", mSpec: "M6×20 / 合金钢 / 发黑", mSup: "震坤行", cat: "紧固件 > 螺钉 > 内六角螺钉", matches: [
    { sku: "高强度内六角螺丝 M6*20", spec: "M6×20 / 12.9级 / 发黑", supplier: "京东工业", score: 96, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "不锈钢内六角 M6×20", spec: "M6×20 / 304不锈钢", supplier: "西域", score: 85, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "外六角螺栓 M6×20", spec: "M6×20 / 8.8级", supplier: "固安捷", score: 44, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 22, master: "铜接线鼻子 OT-16", mSpec: "OT-16 / 紫铜", mSup: "震坤行", cat: "电气电工 > 连接器 > 接线端子", matches: [
    { sku: "开口铜鼻子 OT-16", spec: "OT-16 / 紫铜镀锡", supplier: "京东工业", score: 94, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "冷压端子 RNB5.5-5", spec: "圆形裸端头", supplier: "西域", score: 52, type: "none", status: "rejected", catLv: 2 },
  ]},
  { id: 23, master: "TC骨架油封 35×52×7", mSpec: "35×52×7mm / 丁腈橡胶", mSup: "震坤行", cat: "密封件 > 油封 > 骨架油封", matches: [
    { sku: "TC型骨架油封 35*52*7", spec: "35×52×7mm / NBR / 弹簧钢", supplier: "京东工业", score: 97, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "氟橡胶油封 35×52×7", spec: "35×52×7mm / FKM", supplier: "西域", score: 80, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 24, master: "大号美工刀 18mm", mSpec: "18mm / 自锁 / 合金钢刀片", mSup: "震坤行", cat: "五金工具 > 刀具 > 美工刀", matches: [
    { sku: "自锁式美工刀 18mm", spec: "18mm / 自动锁定", supplier: "京东工业", score: 95, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "美工刀 大号 18mm", spec: "18mm / 推锁", supplier: "西域", score: 92, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "雕刻刀 小号", spec: "小号 / 铝合金", supplier: "固安捷", score: 32, type: "none", status: "rejected", catLv: 0 },
  ]},
  { id: 25, master: "碳钢焊条 E4303 3.2mm", mSpec: "3.2mm / 5kg/包", mSup: "震坤行", cat: "焊接材料 > 焊条 > 碳钢焊条", matches: [
    { sku: "大桥焊条 E4303 Φ3.2", spec: "3.2mm / 5kg", supplier: "京东工业", score: 96, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "金桥焊条 J422 3.2", spec: "3.2mm / 5kg", supplier: "西域", score: 91, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 26, master: "药芯焊丝 E71T-1 1.2mm", mSpec: "1.2mm / 15kg/盘", mSup: "震坤行", cat: "焊接材料 > 焊丝 > 药芯焊丝", matches: [
    { sku: "气保药芯焊丝 E71T-1", spec: "1.2mm / 15kg", supplier: "京东工业", score: 94, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "实心焊丝 ER50-6 1.2", spec: "1.2mm / 20kg", supplier: "西域", score: 60, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 27, master: "单级离心泵 IS65-40-250", mSpec: "Q=25m³/h H=80m", mSup: "震坤行", cat: "泵类设备 > 离心泵 > 单级离心泵", matches: [
    { sku: "IS型离心泵 65-40-250", spec: "25m³/h / 80m扬程", supplier: "京东工业", score: 93, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "卧式离心泵 ISW65", spec: "25m³/h", supplier: "西域", score: 76, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 28, master: "标准气缸 SC63×200", mSpec: "Φ63 行程200mm", mSup: "震坤行", cat: "液压气动 > 气缸 > 标准气缸", matches: [
    { sku: "SC标准气缸 63*200", spec: "Φ63×200 / 双作用", supplier: "京东工业", score: 97, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "薄型气缸 SDA63×200", spec: "Φ63×200", supplier: "西域", score: 72, type: "fuzzy", status: "suggestion", catLv: 2 },
    { sku: "旋转气缸 MSQ-20A", spec: "Φ20 / 190°", supplier: "固安捷", score: 35, type: "none", status: "rejected", catLv: 0 },
  ]},
  { id: 29, master: "二位五通电磁阀 4V210-08", mSpec: "G1/4 / 24VDC", mSup: "震坤行", cat: "液压气动 > 电磁阀 > 二位五通电磁阀", matches: [
    { sku: "4V210-08电磁阀 DC24V", spec: "G1/4 / 24VDC / 单控", supplier: "京东工业", score: 95, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 30, master: "橡胶同步带 5M-500", mSpec: "5M齿形 500mm周长", mSup: "西域", cat: "传动部件 > 同步带 > 橡胶同步带", matches: [
    { sku: "圆弧齿同步带 HTD 5M-500", spec: "5M-500 / 橡胶+玻纤", supplier: "京东工业", score: 94, type: "exact", status: "confirmed", catLv: 3 },
  ]},
  { id: 31, master: "弹性联轴器 L090", mSpec: "L090 / 铝合金", mSup: "震坤行", cat: "传动部件 > 联轴器 > 弹性联轴器", matches: [
    { sku: "梅花联轴器 L090", spec: "L090 / 铝合金 / 聚氨酯垫", supplier: "京东工业", score: 92, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "刚性联轴器 HD-28", spec: "HD-28 / 铝合金", supplier: "西域", score: 58, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 32, master: "三相异步电机 Y2-132M-4 7.5kW", mSpec: "7.5kW / 1440rpm / B3", mSup: "震坤行", cat: "电机电控 > 三相电机 > 普通三相电机", matches: [
    { sku: "Y2三相电机 132M-4", spec: "7.5kW / 4极 / B3卧式", supplier: "京东工业", score: 96, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "YE3高效电机 132M-4", spec: "7.5kW / IE3", supplier: "西域", score: 82, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 33, master: "轴流风机 T35-11 No.5", mSpec: "2900rpm / 3kW", mSup: "震坤行", cat: "暖通空调 > 风机 > 轴流风机", matches: [
    { sku: "T35轴流风机 No.5", spec: "2900rpm / 3kW / 碳钢", supplier: "京东工业", score: 93, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 34, master: "干粉灭火器 4kg ABC", mSpec: "4kg / ABC类", mSup: "震坤行", cat: "消防器材 > 灭火器 > 干粉灭火器", matches: [
    { sku: "ABC干粉灭火器 4kg", spec: "4kg / 碳钢瓶", supplier: "京东工业", score: 97, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "手提式干粉灭火器 4kg", spec: "4kg / ABC", supplier: "西域", score: 95, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 35, master: "环氧结构胶 AB组分 50mL", mSpec: "50mL / A:B=1:1", mSup: "震坤行", cat: "胶粘剂 > 结构胶 > 环氧结构胶", matches: [
    { sku: "双组份环氧胶 50ml", spec: "50ml / 1:1混合", supplier: "京东工业", score: 91, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "丙烯酸结构胶 50ml", spec: "50ml / 快固型", supplier: "西域", score: 65, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 36, master: "硅酮密封胶 白色 300mL", mSpec: "300mL / 白色 / 防霉", mSup: "震坤行", cat: "胶粘剂 > 密封胶 > 硅酮密封胶", matches: [
    { sku: "中性防霉硅酮胶 300ml 白", spec: "300ml / 白色 / 中性", supplier: "京东工业", score: 94, type: "exact", status: "confirmed", catLv: 3 },
  ]},
  { id: 37, master: "平面砂轮 250×25×32 A60", mSpec: "250mm / A60中粒度", mSup: "震坤行", cat: "磨料磨具 > 砂轮 > 平面砂轮", matches: [
    { sku: "白刚玉砂轮 250×25×32", spec: "250mm / WA60 / 陶瓷结合", supplier: "京东工业", score: 90, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "树脂砂轮 250×25×32", spec: "250mm / A60", supplier: "西域", score: 83, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 38, master: "LED工矿灯 200W 6500K", mSpec: "200W / 白光 / IP65", mSup: "震坤行", cat: "照明灯具 > LED灯 > LED工矿灯", matches: [
    { sku: "大功率LED工矿灯 200W", spec: "200W / 6500K / IP65", supplier: "京东工业", score: 96, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "LED投光灯 200W", spec: "200W / 白光 / IP66", supplier: "西域", score: 70, type: "fuzzy", status: "suggestion", catLv: 2 },
    { sku: "金卤灯 250W", spec: "250W / 传统光源", supplier: "固安捷", score: 40, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 39, master: "硬质合金铣刀 D10×75", mSpec: "D10mm / 4刃 / HRC55", mSup: "震坤行", cat: "刀具刃具 > 铣刀 > 硬质合金铣刀", matches: [
    { sku: "整体硬质合金立铣刀 D10", spec: "D10×75mm / 4刃 / AlTiN涂层", supplier: "京东工业", score: 95, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 40, master: "麻花钻头 HSS Φ8mm", mSpec: "Φ8mm / HSS / 直柄", mSup: "震坤行", cat: "刀具刃具 > 钻头 > 麻花钻头", matches: [
    { sku: "高速钢麻花钻 Φ8", spec: "8mm / HSS / M2材质", supplier: "京东工业", score: 94, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "含钴麻花钻 Φ8", spec: "8mm / HSSE-Co5", supplier: "西域", score: 85, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 41, master: "液压滤芯 HX-160×10", mSpec: "HX-160×10 / 10μm", mSup: "震坤行", cat: "过滤材料 > 滤芯 > 液压滤芯", matches: [
    { sku: "回油滤芯 HX-160*10", spec: "160mm / 10μm / 玻纤", supplier: "京东工业", score: 93, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "吸油滤芯 WU-160", spec: "160mm / 80μm", supplier: "西域", score: 62, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 42, master: "标准压缩弹簧 D12×60", mSpec: "线径1.5mm / 外径12mm / 自由长60mm", mSup: "震坤行", cat: "弹簧 > 压缩弹簧 > 普通压缩弹簧", matches: [
    { sku: "压缩弹簧 SWP-12×60", spec: "1.5×12×60mm / SWP-A", supplier: "京东工业", score: 92, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 43, master: "钢丝绳吊索 6×37 Φ16 4m", mSpec: "Φ16mm / 4m / 压制接头", mSup: "震坤行", cat: "链条索具 > 吊索 > 钢丝绳吊索", matches: [
    { sku: "压制钢丝绳套 16mm×4m", spec: "6×37 / Φ16 / 4m / 2T", supplier: "京东工业", score: 95, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "尼龙吊带 2T×4m", spec: "2T / 4m / 双层", supplier: "西域", score: 50, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 44, master: "警告标识牌 当心触电", mSpec: "250×315mm / PVC", mSup: "震坤行", cat: "标识标牌 > 安全标识 > 警告标识", matches: [
    { sku: "安全警告标识 当心触电", spec: "250×315mm / ABS", supplier: "京东工业", score: 91, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "警示标贴 注意安全", spec: "200×300mm / PVC不干胶", supplier: "西域", score: 68, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 45, master: "304不锈钢板 2mm×1220×2440", mSpec: "2mm厚 / 1220×2440mm", mSup: "震坤行", cat: "金属材料 > 钢板 > 不锈钢板", matches: [
    { sku: "304不锈钢板 2.0mm", spec: "2.0×1219×2438mm / 2B面", supplier: "京东工业", score: 97, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "316L不锈钢板 2mm", spec: "2.0×1219×2438mm", supplier: "西域", score: 78, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 46, master: "陶瓷熔断器 RT14-20 10A", mSpec: "10A / 500V / 快速型", mSup: "震坤行", cat: "电子元器件 > 熔断器 > 陶瓷熔断器", matches: [
    { sku: "RT14-20圆柱帽形熔断器 10A", spec: "10A / 500V / 8.5×31.5mm", supplier: "京东工业", score: 93, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 47, master: "电磁流量计 DN50", mSpec: "DN50 / 4-20mA / 法兰", mSup: "震坤行", cat: "仪器仪表 > 流量计 > 电磁流量计", matches: [
    { sku: "智能电磁流量计 DN50", spec: "DN50 / 4-20mA+HART / 法兰连接", supplier: "京东工业", score: 95, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "涡街流量计 DN50", spec: "DN50 / 蒸汽用", supplier: "西域", score: 55, type: "none", status: "rejected", catLv: 2 },
  ]},
  /* ---- 补充模糊匹配和不匹配数据，覆盖缺失类目 ---- */
  { id: 48, master: "数字压力表 0-1.6MPa", mSpec: "0-1.6MPa / M20×1.5 / 电池供电", mSup: "震坤行", cat: "测量仪器 > 压力表 > 数字压力表", matches: [
    { sku: "智能数显压力表 1.6MPa", spec: "0-1.6MPa / 4位LCD", supplier: "京东工业", score: 78, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "耐震压力表 1.6MPa", spec: "0-1.6MPa / 充油型", supplier: "西域", score: 60, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 49, master: "红外测温仪 -50~550℃", mSpec: "-50~550℃ / 激光瞄准", mSup: "震坤行", cat: "测量仪器 > 温度计 > 红外测温仪", matches: [
    { sku: "工业红外温度计", spec: "-30~380℃ / 单激光", supplier: "京东工业", score: 65, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "接触式测温仪", spec: "-50~300℃ / K型探头", supplier: "固安捷", score: 38, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 50, master: "液压升降台 500kg", mSpec: "500kg / 升降行程1m", mSup: "震坤行", cat: "搬运设备 > 升降台 > 液压升降台", matches: [
    { sku: "电动升降平台 300kg", spec: "300kg / 0.9m行程", supplier: "京东工业", score: 55, type: "fuzzy", status: "suggestion", catLv: 2 },
    { sku: "手动堆高车 1T", spec: "1000kg / 叉车式", supplier: "西域", score: 35, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 51, master: "平板手推车 300kg", mSpec: "300kg / 900×600mm / 静音轮", mSup: "震坤行", cat: "搬运设备 > 手推车 > 平板手推车", matches: [
    { sku: "折叠平板车 150kg", spec: "150kg / 折叠式", supplier: "京东工业", score: 42, type: "none", status: "rejected", catLv: 2 },
  ]},
  { id: 52, master: "分类垃圾桶 120L 干垃圾", mSpec: "120L / HDPE / 带轮", mSup: "震坤行", cat: "清洁用品 > 垃圾桶 > 分类垃圾桶", matches: [
    { sku: "户外分类垃圾桶 100L", spec: "100L / PP / 脚踏式", supplier: "京东工业", score: 72, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "不锈钢垃圾桶 30L", spec: "30L / 304不锈钢", supplier: "西域", score: 40, type: "none", status: "rejected", catLv: 2 },
  ]},
  { id: 53, master: "工业拖把 大号棉线", mSpec: "大号 / 400g棉线头", mSup: "震坤行", cat: "清洁用品 > 拖把 > 工业拖把", matches: [
    { sku: "棉线拖把 350g", spec: "中号 / 350g棉线", supplier: "京东工业", score: 68, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 54, master: "尼龙扎带 4.8×300mm 黑色", mSpec: "4.8×300mm / 1000条/包", mSup: "震坤行", cat: "线缆附件 > 扎带 > 尼龙扎带", matches: [
    { sku: "自锁式尼龙扎带 5×300", spec: "5×300mm / 1000条", supplier: "京东工业", score: 93, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "不锈钢扎带 4.6×300", spec: "4.6×300mm / 100条", supplier: "西域", score: 58, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 55, master: "PVC线槽 40×25mm", mSpec: "40×25mm / 2m/根 / 白色", mSup: "震坤行", cat: "线缆附件 > 线槽 > PVC线槽", matches: [
    { sku: "塑料线槽 40×25", spec: "40×25mm / 灰色", supplier: "京东工业", score: 70, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "金属线槽 50×25", spec: "50×25mm / 镀锌钢", supplier: "固安捷", score: 38, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 56, master: "PE缠绕膜 50cm×300m", mSpec: "50cm宽 / 300m / 20μm", mSup: "震坤行", cat: "包装材料 > 缠绕膜 > PE缠绕膜", matches: [
    { sku: "拉伸缠绕膜 50cm", spec: "50cm×200m / 手工膜", supplier: "京东工业", score: 75, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "机用缠绕膜 50cm", spec: "50cm×1500m / 机用", supplier: "西域", score: 62, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 57, master: "PP打包带 12mm 蓝色", mSpec: "12mm / 0.6mm厚 / 3000m", mSup: "震坤行", cat: "包装材料 > 打包带 > PP打包带", matches: [
    { sku: "PP手工打包带 15mm", spec: "15mm / 蓝色 / 2000m", supplier: "京东工业", score: 68, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "PET打包带 16mm", spec: "16mm / 绿色 / 机用", supplier: "西域", score: 45, type: "none", status: "rejected", catLv: 2 },
  ]},
  { id: 58, master: "可燃气体报警器 LEL", mSpec: "0-100%LEL / 声光报警", mSup: "震坤行", cat: "气体检测 > 气体报警器 > 可燃气体报警器", matches: [
    { sku: "固定式可燃气体探测器", spec: "0-100%LEL / 4-20mA", supplier: "京东工业", score: 91, type: "exact", status: "confirmed", catLv: 3 },
    { sku: "有毒气体报警器 H2S", spec: "0-100ppm / H2S", supplier: "西域", score: 35, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 59, master: "红外摄像头 200万像素", mSpec: "200万 / 红外30m / IP67", mSup: "震坤行", cat: "安防监控 > 摄像头 > 红外摄像头", matches: [
    { sku: "网络红外枪机 2MP", spec: "200万 / H.265 / 红外50m", supplier: "京东工业", score: 76, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "高清球机 2MP", spec: "200万 / 20倍变焦", supplier: "西域", score: 60, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 60, master: "IC卡门禁一体机", mSpec: "IC卡 / 韦根26 / 防水", mSup: "震坤行", cat: "安防监控 > 门禁 > IC卡门禁", matches: [
    { sku: "门禁读卡器 IC", spec: "IC卡 / 韦根26", supplier: "京东工业", score: 72, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "指纹门禁机", spec: "指纹+密码 / 单门", supplier: "固安捷", score: 40, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 61, master: "带刹万向轮 5寸 重型", mSpec: "5寸 / 承重350kg / TPR", mSup: "震坤行", cat: "脚轮 > 万向轮 > 带刹万向轮", matches: [
    { sku: "重型刹车脚轮 5寸", spec: "5寸 / 300kg / 聚氨酯", supplier: "京东工业", score: 88, type: "exact", status: "suggestion", catLv: 3 },
  ]},
  { id: 62, master: "橡胶定向轮 4寸", mSpec: "4寸 / 承重150kg / 橡胶", mSup: "震坤行", cat: "脚轮 > 定向轮 > 橡胶定向轮", matches: [
    { sku: "中型定向脚轮 4寸", spec: "4寸 / 100kg / 灰胶", supplier: "京东工业", score: 70, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "万向轮 4寸 带刹", spec: "4寸 / 150kg / 刹车型", supplier: "西域", score: 42, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 63, master: "环氧防锈漆 铁红 20kg", mSpec: "铁红 / 20kg / 双组份", mSup: "震坤行", cat: "防腐材料 > 防锈漆 > 环氧防锈漆", matches: [
    { sku: "环氧铁红底漆 20kg", spec: "铁红 / 20kg / 甲组份", supplier: "京东工业", score: 78, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "醇酸防锈漆 红丹", spec: "红丹 / 18kg", supplier: "西域", score: 50, type: "none", status: "rejected", catLv: 2 },
  ]},
  { id: 64, master: "环氧富锌底漆 灰色 20kg", mSpec: "灰色 / 20kg / 含锌量≥80%", mSup: "震坤行", cat: "防腐材料 > 防腐涂料 > 环氧富锌底漆", matches: [
    { sku: "无机富锌底漆 20kg", spec: "灰色 / 20kg / 含锌量75%", supplier: "京东工业", score: 72, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 65, master: "工业橡胶板 5mm 黑色", mSpec: "5mm / 1m×10m / 工业级", mSup: "震坤行", cat: "橡塑制品 > 橡胶板 > 工业橡胶板", matches: [
    { sku: "耐油橡胶板 5mm", spec: "5mm / 丁腈橡胶 / 1×10m", supplier: "京东工业", score: 65, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "绝缘橡胶垫 10mm", spec: "10mm / 10kV / 绿色", supplier: "西域", score: 35, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 66, master: "PVC板 灰色 10mm", mSpec: "10mm / 1220×2440mm / 灰色", mSup: "震坤行", cat: "橡塑制品 > 塑料板 > PVC板", matches: [
    { sku: "PVC硬板 10mm 灰", spec: "10mm / 灰色 / 1.22×2.44m", supplier: "京东工业", score: 40, type: "none", status: "rejected", catLv: 2 },
  ]},
  { id: 67, master: "精密行星减速机 PLE60-10", mSpec: "PLE60 / 减速比10:1", mSup: "震坤行", cat: "减速机 > 行星减速机 > 精密行星减速机", matches: [
    { sku: "行星齿轮减速机 60-10", spec: "60mm / 10:1 / 回程间隙≤8′", supplier: "京东工业", score: 73, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "蜗轮蜗杆减速机 NMRV040", spec: "NMRV040 / 1:20", supplier: "西域", score: 38, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 68, master: "中型货架 200kg/层", mSpec: "2000×600×2000mm / 4层", mSup: "震坤行", cat: "储存设备 > 货架 > 中型货架", matches: [
    { sku: "中型仓储货架", spec: "2000×600×1800mm / 200kg/层", supplier: "京东工业", score: 90, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "轻型角钢货架", spec: "1500×500×1800mm / 80kg/层", supplier: "西域", score: 58, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 69, master: "组合式零件盒 450×300×177mm", mSpec: "450×300×177mm / PP / 蓝色", mSup: "震坤行", cat: "储存设备 > 零件盒 > 组合式零件盒", matches: [
    { sku: "塑料周转箱 450×300", spec: "450×300×170mm / PP / 可堆叠", supplier: "京东工业", score: 68, type: "fuzzy", status: "suggestion", catLv: 2 },
  ]},
  { id: 70, master: "布袋除尘器 DMC-64", mSpec: "64条滤袋 / 处理风量5000m³/h", mSup: "震坤行", cat: "通风除尘 > 除尘器 > 布袋除尘器", matches: [
    { sku: "脉冲布袋除尘器 48袋", spec: "48袋 / 3800m³/h", supplier: "京东工业", score: 62, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "旋风除尘器 CLT/A", spec: "3000m³/h / 碳钢", supplier: "西域", score: 40, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 71, master: "镀锌风管 Φ400mm", mSpec: "Φ400mm / 0.8mm厚 / 1.2m/节", mSup: "震坤行", cat: "通风除尘 > 风管 > 镀锌风管", matches: [
    { sku: "圆形镀锌风管 Φ400", spec: "Φ400 / 0.75mm / 1m/节", supplier: "京东工业", score: 42, type: "none", status: "rejected", catLv: 2 },
  ]},
  /* ---- 补充现有类目中缺少模糊/不匹配的数据 ---- */
  { id: 72, master: "铝型材散热器 HS-150", mSpec: "150mm宽 / 6063铝合金", mSup: "震坤行", cat: "暖通空调 > 散热器 > 铝型材散热器", matches: [
    { sku: "铝合金散热片 电子型", spec: "100mm / 6061铝", supplier: "京东工业", score: 55, type: "fuzzy", status: "suggestion", catLv: 2 },
    { sku: "铸铁暖气片 MC-90", spec: "MC-90 / 铸铁", supplier: "西域", score: 30, type: "none", status: "rejected", catLv: 0 },
  ]},
  { id: 73, master: "衬胶水带 65mm 20m", mSpec: "口径65mm / 20m / 13型", mSup: "震坤行", cat: "消防器材 > 消防水带 > 衬胶水带", matches: [
    { sku: "消防水带 65-20", spec: "65mm / 20m / 聚氨酯", supplier: "京东工业", score: 75, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "农用水带 3寸 50m", spec: "75mm / 50m / PVC", supplier: "固安捷", score: 32, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 74, master: "单扭弹簧 D25×L50", mSpec: "线径3mm / 外径25mm / 左旋", mSup: "震坤行", cat: "弹簧 > 扭转弹簧 > 单扭弹簧", matches: [
    { sku: "扭转弹簧 D25", spec: "3×25mm / 碳钢", supplier: "京东工业", score: 72, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "双扭弹簧 D20", spec: "2.5×20mm / 双扭", supplier: "西域", score: 38, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 75, master: "控制变压器 JBK3-250VA", mSpec: "250VA / 380V→220V/36V/24V", mSup: "震坤行", cat: "电子元器件 > 变压器 > 控制变压器", matches: [
    { sku: "机床控制变压器 250W", spec: "250VA / 380→36/24V", supplier: "京东工业", score: 65, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "隔离变压器 500VA", spec: "500VA / 1:1", supplier: "西域", score: 35, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 76, master: "阶梯钻头 4-20mm HSS", mSpec: "4-20mm / 9级 / 直柄", mSup: "震坤行", cat: "刀具刃具 > 钻头 > 阶梯钻头", matches: [
    { sku: "宝塔钻 4-20mm", spec: "4-20mm / HSS / 钛涂层", supplier: "京东工业", score: 76, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "开孔器 20mm", spec: "Φ20mm / 双金属", supplier: "西域", score: 32, type: "none", status: "rejected", catLv: 1 },
  ]},
  { id: 77, master: "气动隔膜泵 QBY-25 铝合金", mSpec: "QBY-25 / 铝合金 / 1寸", mSup: "震坤行", cat: "泵类设备 > 隔膜泵 > 气动隔膜泵", matches: [
    { sku: "气动双隔膜泵 25mm 铸铁", spec: "25mm / 铸铁", supplier: "京东工业", score: 70, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "微型隔膜泵 电动", spec: "12V / 微型 / 电动", supplier: "固安捷", score: 30, type: "none", status: "rejected", catLv: 0 },
  ]},
  { id: 78, master: "超声波液位计 0-10m", mSpec: "0-10m / 4-20mA / 法兰安装", mSup: "震坤行", cat: "仪器仪表 > 液位计 > 超声波液位计", matches: [
    { sku: "超声波液位传感器 10m", spec: "0-10m / RS485", supplier: "京东工业", score: 72, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
  { id: 79, master: "颗粒物防护口罩 KN95", mSpec: "KN95 / 头戴式 / 带呼吸阀", mSup: "震坤行", cat: "劳保防护 > 呼吸防护 > 颗粒物防护口罩", matches: [
    { sku: "KN95口罩 头戴式", spec: "KN95 / 带阀 / 25只/盒", supplier: "京东工业", score: 92, type: "exact", status: "suggestion", catLv: 3 },
    { sku: "N95口罩 耳挂式", spec: "N95 / 耳挂 / 不带阀", supplier: "西域", score: 73, type: "fuzzy", status: "suggestion", catLv: 3 },
    { sku: "一次性口罩 50只", spec: "三层无纺布 / 50只", supplier: "固安捷", score: 28, type: "none", status: "rejected", catLv: 0 },
  ]},
  { id: 80, master: "快速检测管 CO 5-150ppm", mSpec: "CO / 5-150ppm / 10支/盒", mSup: "震坤行", cat: "气体检测 > 检测管 > 快速检测管", matches: [
    { sku: "比色检测管 CO", spec: "CO / 2-200ppm / 日本进口", supplier: "京东工业", score: 68, type: "fuzzy", status: "suggestion", catLv: 3 },
  ]},
] as Omit<Group, "client">[]).map((g, i) => ({ ...g, client: clientIds[i % 3] }))

const statusFilters = [
  { key: "all", label: "全部" },
  { key: "suggestion", label: "待确认" },
  { key: "confirmed", label: "已确认" },
  { key: "rejected", label: "已驳回" },
] as const
const statusBadge: Record<string, "warning" | "info" | "success" | "destructive"> = { suggestion: "warning", adjusted: "info", confirmed: "success", rejected: "destructive" }
const statusLabel: Record<string, string> = { suggestion: "待确认", adjusted: "已调整", confirmed: "已确认", rejected: "已驳回" }

export default function SimilarityMatch() {
  const nav = useNavigate()
  const { addToast } = useToast()
  const { currentClient, isAdmin, clients } = useClient()
  const [groups, setGroups] = useState(initG)
  const [exp, setExp] = useState<number | null>(1)
  const [search, setSearch] = useState("")
  const [catF, setCatF] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<{ g: Group; m: Match; idx: number } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ sku: "", spec: "" })
  const [running, setRunning] = useState(false)
  const [pct, setPct] = useState(0)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [jumpInput, setJumpInput] = useState("")
  const pageSize = 10
  // 类目树状态
  const [showCatTree, setShowCatTree] = useState(false)
  const [treeExp1, setTreeExp1] = useState<string | null>(null)
  const [treeExp2, setTreeExp2] = useState<Set<string>>(new Set())
  const [treeSearch, setTreeSearch] = useState("")
  const [simTab, setSimTab] = useState<"overview" | "log" | "rules">("overview")
  const [expCat1, setExpCat1] = useState<string | null>(null)

  const filt = useMemo(() => {
    return groups.filter((g) => {
      if (isAdmin && clientFilter !== "all" && g.client !== clientFilter) return false
      if (search && !g.master.includes(search) && !g.cat.includes(search) && !g.matches.some((m) => m.sku.includes(search) || m.supplier.includes(search))) return false
      if (catF && !g.cat.includes(catF)) return false
      if (statusFilter !== "all") {
        const key = statusFilter === "suggestion" ? ((s: string) => s === "suggestion" || s === "adjusted") : (s: string) => s === statusFilter
        if (!g.matches.some((m) => key(m.status))) return false
      }
      return true
    })
  }, [groups, search, catF, statusFilter, clientFilter, isAdmin])

  const allMatches = groups.flatMap((g) => g.matches)
  const tot = allMatches.length
  const exCnt = allMatches.filter((m) => m.type === "exact").length
  const suggCnt = allMatches.filter((m) => m.status === "suggestion" || m.status === "adjusted").length
  const confirmedCnt = allMatches.filter((m) => m.status === "confirmed").length
  const rejectedCnt = allMatches.filter((m) => m.status === "rejected").length
  const allDecided = suggCnt === 0
  const canSubmit = confirmedCnt > 0 && allDecided

  // 类目树点击 → 筛选（再次点击同一项清除筛选）
  const searchByCat = (catName: string) => {
    setCatF(prev => prev === catName ? "" : catName)
    setPage(1)
  }

  // 多选辅助
  const toggleGroup = (id: number) => setSelectedGroups(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleMatch = (gid: number, idx: number) => {
    const key = `${gid}-${idx}`
    setSelectedMatches(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  const toggleAllGroups = () => {
    const pageGroups = filt.slice((page - 1) * pageSize, page * pageSize)
    const allSelected = pageGroups.every(g => selectedGroups.has(g.id))
    if (allSelected) setSelectedGroups(p => { const n = new Set(p); pageGroups.forEach(g => n.delete(g.id)); return n })
    else setSelectedGroups(p => { const n = new Set(p); pageGroups.forEach(g => n.add(g.id)); return n })
  }

  // 全选某组内所有匹配商品
  const toggleAllMatchesInGroup = (g: Group) => {
    const keys = g.matches.map((_, i) => `${g.id}-${i}`)
    const allSelected = keys.every(k => selectedMatches.has(k))
    setSelectedMatches(p => {
      const n = new Set(p)
      if (allSelected) keys.forEach(k => n.delete(k))
      else keys.forEach(k => n.add(k))
      return n
    })
  }

  // 批量确认选中的匹配商品
  const batchConfirmMatches = () => {
    if (selectedMatches.size === 0) return
    setGroups(p => p.map(g => ({
      ...g,
      matches: g.matches.map((m, i) => {
        const key = `${g.id}-${i}`
        if (selectedMatches.has(key) && (m.status === "suggestion" || m.status === "adjusted")) return { ...m, status: "confirmed" as const }
        return m
      })
    })))
    addToast({ type: "success", title: "批量确认", description: `已确认 ${selectedMatches.size} 条匹配商品` })
    setSelectedMatches(new Set())
  }

  // 批量驳回选中的匹配商品
  const batchRejectMatches = () => {
    if (selectedMatches.size === 0) return
    setGroups(p => p.map(g => ({
      ...g,
      matches: g.matches.map((m, i) => {
        const key = `${g.id}-${i}`
        if (selectedMatches.has(key) && (m.status === "suggestion" || m.status === "adjusted")) return { ...m, status: "rejected" as const }
        return m
      })
    })))
    addToast({ type: "warning", title: "批量驳回", description: `已驳回 ${selectedMatches.size} 条匹配商品` })
    setSelectedMatches(new Set())
  }

  // 单条确认
  const approve = (gid: number, idx: number) => {
    setGroups((p) => p.map((g) => g.id === gid ? { ...g, matches: g.matches.map((m, i) => i === idx ? { ...m, status: "confirmed" as const } : m) } : g))
    addToast({ type: "success", title: "已确认", description: "匹配关系已确认" })
  }

  // 单条驳回
  const reject = (gid: number, idx: number) => {
    setGroups((p) => p.map((g) => g.id === gid ? { ...g, matches: g.matches.map((m, i) => i === idx ? { ...m, status: "rejected" as const } : m) } : g))
    addToast({ type: "warning", title: "已驳回", description: "匹配关系已标记为不匹配" })
  }

  // 保存调整
  const saveEdit = () => {
    if (!detail) return
    setGroups((p) => p.map((g) => g.id === detail.g.id ? {
      ...g,
      matches: g.matches.map((m, i) => i === detail.idx ? { ...m, adjustedSku: editForm.sku, adjustedSpec: editForm.spec, status: "adjusted" as const } : m)
    } : g))
    addToast({ type: "success", title: "已调整并保存", description: "匹配信息已由您手动调整" })
    setEditOpen(false)
    setDetail(null)
  }

  // 批量确认全部建议+已调整
  const confirmAll = () => {
    setGroups((p) => p.map((g) => ({
      ...g,
      matches: g.matches.map((m) => (m.status === "suggestion" || m.status === "adjusted") ? { ...m, status: "confirmed" as const } : m)
    })))
    addToast({ type: "success", title: "批量确认完成", description: `${suggCnt} 条匹配关系已全部确认` })
  }

  // 启动匹配
  const startMatch = () => {
    setRunning(true); setPct(0)
    const iv = setInterval(() => {
      setPct((p) => {
        if (p >= 100) {
          clearInterval(iv); setRunning(false)
          setGroups((prev) => [...prev, {
            id: prev.length + 1,
            master: "高强度螺母 M12",
            mSpec: "M12 / 碳钢 8级",
            mSup: "震坤行",
            cat: "紧固件 > 螺母",
            matches: [
              { sku: "8级碳钢六角螺母 M12", spec: "M12 / 碳钢", supplier: "京东工业", score: 95, type: "exact", status: "suggestion", catLv: 3 },
              { sku: "高强螺母 M12 镀锌", spec: "M12 / 碳钢镀锌", supplier: "西域", score: 88, type: "exact", status: "suggestion", catLv: 3 },
            ]
          }])
          addToast({ type: "info", title: "匹配完成", description: "新增 1 组匹配结果，请逐条确认或调整后提交" })
          return 100
        }
        return p + 4
      })
    }, 120)
  }

  // 导出 CSV
  const handleExport = () => {
    const confirmedMatches = groups.flatMap((g) =>
      g.matches.filter((m) => m.status === "confirmed").map((m) => ({
        masterName: g.master,
        masterSpec: g.mSpec,
        masterSupplier: g.mSup,
        category: g.cat,
        matchSku: m.adjustedSku || m.sku,
        matchSpec: m.adjustedSpec || m.spec,
        matchSupplier: m.supplier,
        score: m.score,
        matchType: m.type === "exact" ? "精确匹配" : m.type === "fuzzy" ? "模糊匹配" : "不匹配",
      }))
    )

    if (confirmedMatches.length === 0) {
      addToast({ type: "warning", title: "无可导出数据", description: "请先确认匹配结果后再导出" })
      return
    }

    setExporting(true)
    addToast({ type: "info", title: "正在生成导出文件...", description: `${confirmedMatches.length} 条确认结果` })

    setTimeout(() => {
      const headers = ["主商品名称", "主商品规格", "主供应商", "类目", "匹配SKU", "匹配规格", "匹配供应商", "相似度", "匹配类型"]
      const csvRows = [
        headers.join(","),
        ...confirmedMatches.map((r) =>
          [r.masterName, r.masterSpec, r.masterSupplier, r.category, r.matchSku, r.matchSpec, r.matchSupplier, `${r.score}%`, r.matchType]
            .map((v) => `"${v}"`)
            .join(",")
        ),
      ]
      const csvContent = "\uFEFF" + csvRows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${currentClient.shortName}_相似匹配结果_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)

      setExporting(false)
      addToast({ type: "success", title: "导出成功", description: `${confirmedMatches.length} 条匹配结果已下载为 CSV` })
    }, 1500)
  }

  // 最终提交
  const handleSubmit = () => {
    setSubmitOpen(false)
    addToast({ type: "success", title: "匹配结果已最终确认", description: `${confirmedCnt} 条已确认结果已锁定，可导出数据` })
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">相似匹配</h1>
          <p className="text-sm text-muted-foreground mt-1">多供应商智能匹配 — 系统建议，{currentClient.shortName}确认后生效</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 流程提示 - 紧凑版 */}
          <div className="flex items-center gap-0 text-[11px]">
            <div className="flex items-center gap-1 px-2 py-1 rounded-l-md bg-primary/10 text-primary font-medium border border-primary/20">
              <Sparkles className="w-3 h-3" />建议
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground -mx-0.5" />
            <div className={`flex items-center gap-1 px-2 py-1 font-medium border ${!allDecided ? "bg-warning/10 text-warning border-warning/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
              <Edit3 className="w-3 h-3" />确认
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground -mx-0.5" />
            <div className={`flex items-center gap-1 px-2 py-1 font-medium border ${canSubmit ? "bg-success/10 text-success border-success/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
              <ShieldCheck className="w-3 h-3" />锁定
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground -mx-0.5" />
            <div className={`flex items-center gap-1 px-2 py-1 rounded-r-md font-medium border ${confirmedCnt > 0 ? "bg-info/10 text-info border-info/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
              <Download className="w-3 h-3" />导出
            </div>
            {!allDecided && (
              <>
                <span className="ml-2 text-warning text-[11px]">{suggCnt} 待确认</span>
                <Button variant="outline" size="sm" className="ml-1.5 h-6 text-[11px] px-2" onClick={confirmAll}>
                  <CheckCheck className="w-3 h-3 mr-0.5" />全部确认
                </Button>
              </>
            )}
          </div>
          <div className="w-px h-8 bg-border" />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || confirmedCnt === 0}>
            <Download className={`w-4 h-4 mr-1.5 ${exporting ? "animate-pulse" : ""}`} />
            {exporting ? "导出中..." : `导出结果 (${confirmedCnt})`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { nav("/data-verify"); addToast({ type: "info", title: "查看核查报告" }) }}>
            <Eye className="w-4 h-4 mr-1.5" />核查报告
          </Button>
          <Button variant="premium" size="sm" onClick={startMatch} disabled={running}>
            <Zap className="w-4 h-4 mr-1.5" />{running ? `匹配中 ${pct}%` : "启动匹配"}
          </Button>
        </div>
      </div>

      {/* Stats – 一级类目匹配概览：三级类目进度 + 匹配类型占比 + 可展开详情 */}
      {(() => {
        // 从 catTree 构建完整三级类目列表，与 groups 数据交叉匹配
        const cat1Stats = catTree.map(cat1 => {
          const allCat3: { name: string; cat2: string }[] = []
          cat1.children.forEach(cat2 => {
            cat2.children.forEach(cat3 => {
              allCat3.push({ name: cat3, cat2: cat2.name })
            })
          })
          const cat1Groups = groups.filter(g => g.cat.split(" > ")[0] === cat1.name)

          const cat3Details = allCat3.map(c3 => {
            const matched = cat1Groups.filter(g => {
              const gCat3 = g.cat.split(" > ").pop() || ""
              return gCat3 === c3.name || gCat3.includes(c3.name) || c3.name.includes(gCat3)
            })
            if (matched.length === 0) return { ...c3, matched: false as const, bestType: undefined as "exact" | "fuzzy" | "none" | undefined }
            const types = matched.flatMap(g => g.matches.map(m => m.type))
            const best = types.includes("exact") ? "exact" as const : types.includes("fuzzy") ? "fuzzy" as const : "none" as const
            return { ...c3, matched: true as const, bestType: best }
          })

          const matchedCat3 = cat3Details.filter(c => c.matched)
          return {
            name: cat1.name,
            cat3Total: allCat3.length,
            cat3Matched: matchedCat3.length,
            cat3Exact: matchedCat3.filter(c => c.bestType === "exact").length,
            cat3Fuzzy: matchedCat3.filter(c => c.bestType === "fuzzy").length,
            cat3None: matchedCat3.filter(c => c.bestType === "none").length,
            cat3Details,
          }
        }).sort((a, b) => b.cat3Total - a.cat3Total)

        return (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">一级类目匹配概览</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/50" />三级类目进度</span>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-success" />精确匹配</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-warning" />模糊匹配</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-destructive" />不匹配</span>
                </div>
              </div>
              <div className="space-y-0.5 max-h-[520px] overflow-y-auto">
                {cat1Stats.map(c => {
                  const isExp = expCat1 === c.name
                  const progress = c.cat3Total > 0 ? (c.cat3Matched / c.cat3Total * 100) : 0
                  const mBase = c.cat3Matched || 1
                  return (
                    <div key={c.name}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-smooth ${isExp ? "bg-muted/50" : "hover:bg-muted/30"}`}
                        onClick={() => setExpCat1(isExp ? null : c.name)}
                      >
                        <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${isExp ? "rotate-90" : ""}`} />
                        <span className="text-xs font-semibold text-foreground w-20 shrink-0 truncate" title={c.name}>{c.name}</span>
                        {/* 匹配进度条 - 占一半 */}
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-[6px] rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/50 transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{c.cat3Matched}/{c.cat3Total}</span>
                        </div>
                        {/* 匹配类型占比堆叠条 - 占一半 */}
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-[6px] rounded-full overflow-hidden flex bg-muted">
                            {c.cat3Exact > 0 && <div className="h-full bg-success transition-all" style={{ width: `${c.cat3Exact / mBase * 100}%` }} />}
                            {c.cat3Fuzzy > 0 && <div className="h-full bg-warning transition-all" style={{ width: `${c.cat3Fuzzy / mBase * 100}%` }} />}
                            {c.cat3None > 0 && <div className="h-full bg-destructive transition-all" style={{ width: `${c.cat3None / mBase * 100}%` }} />}
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-14 text-right">{c.cat3Matched > 0 ? `${c.cat3Exact}/${c.cat3Fuzzy}/${c.cat3None}` : "—"}</span>
                        </div>
                      </div>

                      {/* 展开三级类目详情 */}
                      {isExp && (
                        <div className="ml-8 mr-3 mb-2 mt-1 p-3 rounded-lg border bg-card">
                          {/* 汇总统计 */}
                          <div className="flex items-center gap-4 mb-3 pb-3 border-b border-dashed text-xs">
                            <span className="text-muted-foreground">已匹配三级类目占比：</span>
                            <span className="flex items-center gap-1 text-success font-medium"><span className="w-1.5 h-1.5 rounded-full bg-success" />精确 {c.cat3Matched > 0 ? (c.cat3Exact / c.cat3Matched * 100).toFixed(0) : 0}% ({c.cat3Exact})</span>
                            <span className="flex items-center gap-1 text-warning font-medium"><span className="w-1.5 h-1.5 rounded-full bg-warning" />模糊 {c.cat3Matched > 0 ? (c.cat3Fuzzy / c.cat3Matched * 100).toFixed(0) : 0}% ({c.cat3Fuzzy})</span>
                            <span className="flex items-center gap-1 text-destructive font-medium"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />不匹配 {c.cat3Matched > 0 ? (c.cat3None / c.cat3Matched * 100).toFixed(0) : 0}% ({c.cat3None})</span>
                            <span className="ml-auto text-muted-foreground">未处理 {c.cat3Total - c.cat3Matched}</span>
                          </div>
                          {/* 三级类目列表按二级类目分组 */}
                          {(() => {
                            const byC2 = new Map<string, typeof c.cat3Details>()
                            c.cat3Details.forEach(d => {
                              if (!byC2.has(d.cat2)) byC2.set(d.cat2, [])
                              byC2.get(d.cat2)!.push(d)
                            })
                            return Array.from(byC2.entries()).map(([cat2, items]) => (
                              <div key={cat2} className="mb-2.5 last:mb-0">
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{cat2}</p>
                                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                                  {items.map(item => (
                                    <div key={item.name} className={`flex items-center gap-1.5 text-xs py-0.5 px-1.5 rounded ${item.matched ? "bg-success/5" : ""}`}>
                                      {item.matched ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-muted-foreground/25 shrink-0" />
                                      )}
                                      <span className={item.matched ? "text-foreground" : "text-muted-foreground/50"}>{item.name}</span>
                                      {item.matched && item.bestType && (
                                        <Badge variant={item.bestType === "exact" ? "success" : item.bestType === "fuzzy" ? "warning" : "destructive"} className="text-[9px] px-1 py-0 h-3.5 ml-auto">
                                          {item.bestType === "exact" ? "精确" : item.bestType === "fuzzy" ? "模糊" : "不匹配"}
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* 分栏导航 */}
      <div className="flex items-center gap-1 border-b">
        {([["overview", "数据总览"], ["log", "操作记录"], ["rules", "匹配规则"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSimTab(k)} className={`px-4 py-2.5 text-sm font-medium transition-smooth border-b-2 -mb-px ${simTab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      {simTab === "overview" && (<>
      {/* 标准类目树预览 - 可折叠 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 cursor-pointer" onClick={() => setShowCatTree(!showCatTree)}>
          <CardTitle className="flex items-center gap-2"><FolderTree className="w-4 h-4 text-primary" />标准类目树预览<Badge variant="muted" className="text-[10px] px-1.5 py-0 ml-1">{catTree.reduce((sum, c1) => sum + c1.children.reduce((s, c2) => s + c2.children.length, 0), 0)} 个三级类目</Badge>{catF && <Badge variant="info" className="text-[10px] px-1.5 py-0 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setCatF(""); setPage(1) }}>筛选: {catF} ✕</Badge>}</CardTitle>
          <div className="flex items-center gap-2">
            {showCatTree && (
              <div className="relative w-48" onClick={(e) => e.stopPropagation()}>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" value={treeSearch} onChange={(e) => {
                  const v = e.target.value; setTreeSearch(v)
                  if (v) {
                    for (const c1 of catTree) {
                      if (c1.name.includes(v) || c1.children.some((c2) => c2.name.includes(v) || c2.children.some((c3) => c3.includes(v)))) {
                        setTreeExp1(c1.name)
                        const exp2 = new Set<string>()
                        for (const c2 of c1.children) { if (c2.name.includes(v) || c2.children.some((c3) => c3.includes(v))) exp2.add(`${c1.name}/${c2.name}`) }
                        setTreeExp2(exp2); break
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
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 transition-smooth ${catF === cat1.name ? "bg-primary/10 ring-1 ring-primary/30" : treeExp1 === cat1.name ? "bg-accent/30" : ""}`}
                    onClick={() => { setTreeExp1(treeExp1 === cat1.name ? null : cat1.name); setTreeExp2(new Set()); searchByCat(cat1.name) }}
                  >
                    <span className={`text-sm font-semibold ${catF === cat1.name ? "text-primary" : "text-foreground"}`}>{cat1.name}</span>
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
                              className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs font-medium rounded hover:bg-accent/40 transition-smooth ${catF === cat2.name ? "bg-primary/10 text-primary" : isExp2 ? "bg-accent/20 text-foreground" : "text-foreground"}`}
                              onClick={() => { setTreeExp2((prev) => { const n = new Set(prev); n.has(cat2Key) ? n.delete(cat2Key) : n.add(cat2Key); return n }); searchByCat(cat2.name) }}
                            >
                              <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isExp2 ? "rotate-90" : ""}`} />
                              {cat2.name}
                              <span className="ml-auto text-[10px] text-muted-foreground">{cat2.children.length}</span>
                            </button>
                            {isExp2 && (
                              <div className="ml-5 space-y-0.5 mt-0.5">
                                {cat2.children.filter((c3) => !treeSearch || c3.includes(treeSearch)).map((cat3) => (
                                  <button key={cat3} className={`block w-full text-left px-2 py-0.5 text-xs rounded transition-smooth ${catF === cat3 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`} onClick={() => searchByCat(cat3)}>
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

      {/* Running */}
      {running && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">相似匹配进行中...</span>
              <span className="text-sm font-bold text-primary">{pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-gradient-primary transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">完成后将生成系统建议，需您确认后结果才会生效</p>
          </CardContent>
        </Card>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        {/* 管理员：客户筛选 */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg shrink-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground ml-2" />
            {[{ id: "all", label: "全部客户" }, ...clients.filter(c => c.id !== "client-admin").map(c => ({ id: c.id, label: c.shortName }))].map(opt => (
              <button key={opt.id} onClick={() => { setClientFilter(opt.id); setPage(1) }} className={`px-2.5 py-1.5 text-xs rounded-md transition-smooth whitespace-nowrap ${clientFilter === opt.id ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{opt.label}</button>
            ))}
          </div>
        )}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="搜索商品、SKU或供应商..." className="w-full h-9 pl-9 pr-4 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={catF} onChange={(e) => { setCatF(e.target.value); setPage(1) }} className="h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">全部类目</option><option value="紧固件">紧固件</option><option value="电气电工">电气电工</option><option value="劳保防护">劳保防护</option><option value="五金工具">五金工具</option><option value="密封件">密封件</option><option value="轴承">轴承</option><option value="管阀件">管阀件</option><option value="化工原料">化工原料</option><option value="办公用品">办公用品</option>
        </select>
        {/* 状态筛选 */}
        <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg">
          {statusFilters.map(f => (
            <button key={f.key} onClick={() => { setStatusFilter(f.key); setPage(1) }} className={`px-3 py-1.5 text-xs rounded-md transition-smooth whitespace-nowrap ${statusFilter === f.key ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
              {f.key !== "all" && (
                <span className={`ml-1 text-[10px] ${statusFilter === f.key ? "text-primary" : "text-muted-foreground"}`}>
                  {f.key === "suggestion" ? suggCnt : f.key === "confirmed" ? confirmedCnt : rejectedCnt}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCatF(""); setStatusFilter("all"); setClientFilter("all"); setPage(1) }}><RefreshCcw className="w-4 h-4 mr-1.5" />重置</Button>
      </div>

      {/* Match Groups */}
      <div className="space-y-3">
        {/* 全选主商品 */}
        {filt.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input type="checkbox" className="w-3.5 h-3.5 rounded border-muted-foreground accent-primary cursor-pointer" checked={filt.slice((page - 1) * pageSize, page * pageSize).every(g => selectedGroups.has(g.id))} onChange={toggleAllGroups} />
            <span className="text-xs text-muted-foreground">全选当页主商品 ({selectedGroups.size > 0 ? `已选 ${selectedGroups.size}` : "未选"})</span>
            {selectedGroups.size > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => {
                  setGroups(p => p.map(g => !selectedGroups.has(g.id) ? g : { ...g, matches: g.matches.map(m => (m.status === "suggestion" || m.status === "adjusted") ? { ...m, status: "confirmed" as const } : m) }))
                  addToast({ type: "success", title: "批量确认", description: `已确认 ${selectedGroups.size} 组主商品的所有建议` })
                  setSelectedGroups(new Set())
                }}><ThumbsUp className="w-3 h-3 mr-1" />批量确认</Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => {
                  setGroups(p => p.map(g => !selectedGroups.has(g.id) ? g : { ...g, matches: g.matches.map(m => (m.status === "suggestion" || m.status === "adjusted") ? { ...m, status: "rejected" as const } : m) }))
                  addToast({ type: "warning", title: "批量驳回", description: `已驳回 ${selectedGroups.size} 组主商品的所有建议` })
                  setSelectedGroups(new Set())
                }}><ThumbsDown className="w-3 h-3 mr-1" />批量驳回</Button>
              </div>
            )}
            {selectedMatches.size > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-primary font-medium">已选 {selectedMatches.size} 条匹配商品</span>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={batchConfirmMatches}>
                  <ThumbsUp className="w-3 h-3 mr-1" />批量确认
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={batchRejectMatches}>
                  <ThumbsDown className="w-3 h-3 mr-1" />批量驳回
                </Button>
                <button className="text-xs text-muted-foreground hover:text-foreground ml-1" onClick={() => setSelectedMatches(new Set())}>清除</button>
              </div>
            )}
          </div>
        )}
        {filt.slice((page - 1) * pageSize, page * pageSize).map((g, idx) => (
          <Card key={g.id} className={`overflow-hidden ${selectedGroups.has(g.id) ? "ring-1 ring-primary/30" : ""}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-smooth" onClick={() => setExp(exp === g.id ? null : g.id)}>
              <div className="flex items-center gap-4">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-muted-foreground accent-primary cursor-pointer" checked={selectedGroups.has(g.id)} onChange={(e) => { e.stopPropagation(); toggleGroup(g.id) }} onClick={(e) => e.stopPropagation()} />
                <span className="text-xs text-muted-foreground w-6 text-center">{(page - 1) * pageSize + idx + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><GitCompareArrows className="w-4 h-4 text-primary" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{g.master}</span>
                    <Badge variant="default">主商品</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{g.mSpec}</span><span>·</span><span>{g.mSup}</span><span>·</span><span>{g.cat}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={g.matches.some((m) => m.status === "suggestion") ? "warning" : "success"}>
                  {g.matches.filter((m) => m.status === "confirmed").length}/{g.matches.length} 已确认
                </Badge>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${exp === g.id ? "rotate-180" : ""}`} />
              </div>
            </div>
            {exp === g.id && (
              <div className="border-t">
                <div className="bg-muted/20 px-4 py-2 flex items-center text-xs font-medium text-muted-foreground">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-muted-foreground accent-primary cursor-pointer mr-2 shrink-0"
                    checked={g.matches.length > 0 && g.matches.every((_, i) => selectedMatches.has(`${g.id}-${i}`))}
                    onChange={() => toggleAllMatchesInGroup(g)} />
                  <span className="flex-1">匹配商品</span>
                  {(() => {
                    const groupMatchKeys = g.matches.map((_, i) => `${g.id}-${i}`)
                    const selCnt = groupMatchKeys.filter(k => selectedMatches.has(k)).length
                    return selCnt > 0 ? (
                      <div className="flex items-center gap-1 mr-3">
                        <span className="text-[10px] text-primary mr-1">已选 {selCnt}</span>
                        <button className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-success/10 text-success hover:bg-success/20 transition-smooth" onClick={batchConfirmMatches}>
                          <ThumbsUp className="w-2.5 h-2.5" />确认
                        </button>
                        <button className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-smooth" onClick={batchRejectMatches}>
                          <ThumbsDown className="w-2.5 h-2.5" />驳回
                        </button>
                      </div>
                    ) : null
                  })()}
                  <span className="w-24 text-center">供应商</span>
                  <span className="w-20 text-center">相似度</span>
                  <span className="w-20 text-center">类型</span>
                  <span className="w-20 text-center">状态</span>
                  <span className="w-44 text-center">客户操作</span>
                </div>
                {g.matches.map((m, idx) => (
                  <div key={idx} className={`flex items-center px-4 py-3 border-t transition-smooth ${selectedMatches.has(`${g.id}-${idx}`) ? "bg-primary/5" : m.status === "suggestion" ? "bg-warning/3" : ""} hover:bg-muted/10`}>
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-muted-foreground accent-primary cursor-pointer mr-2 shrink-0" checked={selectedMatches.has(`${g.id}-${idx}`)} onChange={() => toggleMatch(g.id, idx)} />
                    <div className="flex-1 cursor-pointer" onClick={() => setDetail({ g, m, idx })}>
                      <p className="text-sm text-foreground hover:text-primary transition-smooth">{m.adjustedSku || m.sku}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.adjustedSpec || m.spec}</p>
                      {m.adjustedSku && <p className="text-[10px] text-info mt-0.5">已调整 (原: {m.sku})</p>}
                    </div>
                    <span className="w-24 text-center text-xs text-muted-foreground">{m.supplier}</span>
                    <div className="w-20 flex items-center justify-center gap-1.5">
                      <div className="w-8 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${m.score >= 90 ? "bg-success" : m.score >= 75 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${m.score}%` }} />
                      </div>
                      <span className="text-xs font-medium">{m.score}%</span>
                    </div>
                    <div className="w-20 flex justify-center"><Badge variant={m.type === "exact" ? "success" : m.type === "fuzzy" ? "warning" : "destructive"}>{m.type === "exact" ? "精确" : m.type === "fuzzy" ? "模糊" : "不匹配"}</Badge></div>
                    <div className="w-20 flex justify-center"><Badge variant={statusBadge[m.status]}>{statusLabel[m.status]}</Badge></div>
                    <div className="w-44 flex items-center justify-center gap-1">
                      {(m.status === "suggestion" || m.status === "adjusted") && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-success" onClick={() => approve(g.id, idx)}>
                            <ThumbsUp className="w-3.5 h-3.5 mr-0.5" />确认
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => reject(g.id, idx)}>
                            <ThumbsDown className="w-3.5 h-3.5 mr-0.5" />驳回
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setDetail({ g, m, idx })
                        setEditForm({ sku: m.adjustedSku || m.sku, spec: m.adjustedSpec || m.spec })
                        setEditOpen(true)
                      }}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail({ g, m, idx })}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { nav("/badcase"); addToast({ type: "info", title: "提交 BadCase", description: m.sku }) }}>
                        <Bug className="w-3.5 h-3.5 text-warning" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {(() => {
        const totalPages = Math.max(1, Math.ceil(filt.length / pageSize))
        const startRow = filt.length === 0 ? 0 : (page - 1) * pageSize + 1
        const endRow = Math.min(page * pageSize, filt.length)
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
            <span>显示 {startRow}-{endRow} 组，共 {filt.length} 组{(search || catF) ? `（筛选自 ${groups.length} 组）` : ""}</span>
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

      {/* Bottom actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => nav("/data-prep")}>
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" />返回数据准备
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || confirmedCnt === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            导出 CSV ({confirmedCnt} 条)
          </Button>
          <Button variant="premium" size="sm" disabled={!canSubmit} onClick={() => setSubmitOpen(true)}>
            <ShieldCheck className="w-4 h-4 mr-1.5" />最终确认并锁定
          </Button>
        </div>
      </div>

      </>)}

      {simTab === "log" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-4 h-4 text-primary" />操作记录</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { time: "2026-04-10 14:32", user: "张工", action: "批量确认", desc: "确认了紧固件类目下 12 条精确匹配结果", type: "success" as const },
                { time: "2026-04-10 14:28", user: "张工", action: "手动调整", desc: "调整了「PVC绝缘胶带」的匹配商品 SKU 名称", type: "info" as const },
                { time: "2026-04-10 14:15", user: "系统", action: "匹配完成", desc: "本轮匹配生成 52 条建议，其中精确匹配 36 条，模糊匹配 16 条", type: "info" as const },
                { time: "2026-04-10 14:10", user: "张工", action: "启动匹配", desc: "使用「紧固件匹配规则」+ 「向量权重-名称+型号」执行相似匹配", type: "info" as const },
                { time: "2026-04-09 17:45", user: "李工", action: "驳回", desc: "驳回了「电工绝缘鞋 42码」与「防砸防刺穿安全鞋」的匹配关系", type: "warning" as const },
                { time: "2026-04-09 16:30", user: "系统", action: "规则更新", desc: "管理员更新了「宽松匹配策略」，阈值从 75% 调整为 70%", type: "info" as const },
                { time: "2026-04-09 15:20", user: "张工", action: "导出数据", desc: "导出了 28 条已确认匹配结果为 CSV 文件", type: "success" as const },
                { time: "2026-04-08 11:00", user: "系统", action: "匹配完成", desc: "首轮匹配生成 48 条建议，覆盖 9 个一级类目", type: "info" as const },
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-smooth">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.type === "success" ? "bg-success" : log.type === "warning" ? "bg-warning" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{log.action}</span>
                      <Badge variant={log.type === "success" ? "success" : log.type === "warning" ? "warning" : "info"} className="text-[10px]">{log.user}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.desc}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" />{log.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {simTab === "rules" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" />当前生效的匹配规则</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "紧固件匹配规则", type: "匹配规则", desc: "名称+型号+规格 三维度精确匹配，阈值 90%", status: "启用", cats: ["紧固件"] },
                  { name: "向量权重 - 名称+型号", type: "权重配置", desc: "名称 0.5 / 型号 0.3 / 规格 0.2", status: "启用", cats: ["紧固件", "电气电工"] },
                  { name: "宽松匹配策略", type: "匹配规则", desc: "允许跨三级类目模糊匹配，阈值 70%", status: "草稿", cats: ["化工原料", "密封件"] },
                  { name: "名称归一化提示词", type: "提示词配置", desc: "按材料、功能等维度拆分为最小语义单元", status: "启用", cats: ["紧固件", "电气电工", "五金工具"] },
                  { name: "工字头=一字头螺钉", type: "特殊业务规则", desc: "强制建立绑定关系", status: "启用", cats: ["紧固件"] },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-smooth">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{rule.name}</span>
                        <Badge variant="outline" className="text-[10px]">{rule.type}</Badge>
                        <Badge variant={rule.status === "启用" ? "success" : "warning"} className="text-[10px]">{rule.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{rule.desc}</p>
                      <div className="flex gap-1 mt-1">{rule.cats.map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/70">{c}</span>)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => { nav("/rules-config"); addToast({ type: "info", title: "前往规则配置" }) }}>
              <Settings2 className="w-4 h-4 mr-1.5" />前往规则配置管理 →
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detail && !editOpen} onClose={() => setDetail(null)} title="匹配详情" size="lg" description={detail ? `${detail.g.master} vs ${detail.m.adjustedSku || detail.m.sku}` : ""} footer={
        detail ? (
          <>
            <Button variant="outline" onClick={() => setDetail(null)}>关闭</Button>
            {(detail.m.status === "suggestion" || detail.m.status === "adjusted") && (
              <>
                <Button variant="destructive" onClick={() => { reject(detail.g.id, detail.idx); setDetail(null) }}>
                  <ThumbsDown className="w-4 h-4 mr-1" />驳回
                </Button>
                <Button variant="success" onClick={() => { approve(detail.g.id, detail.idx); setDetail(null) }}>
                  <ThumbsUp className="w-4 h-4 mr-1" />确认通过
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => { setEditForm({ sku: detail.m.adjustedSku || detail.m.sku, spec: detail.m.adjustedSpec || detail.m.spec }); setEditOpen(true) }}>
              <Edit3 className="w-4 h-4 mr-1" />调整
            </Button>
          </>
        ) : undefined
      }>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
              <div><p className="text-xs text-muted-foreground mb-1">主商品</p><p className="text-sm font-semibold text-foreground">{detail.g.master}</p><p className="text-xs text-muted-foreground mt-1">{detail.g.mSpec} · {detail.g.mSup}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">匹配商品</p><p className="text-sm font-semibold text-foreground">{detail.m.adjustedSku || detail.m.sku}</p><p className="text-xs text-muted-foreground mt-1">{detail.m.adjustedSpec || detail.m.spec} · {detail.m.supplier}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg border"><p className="text-2xl font-bold text-foreground">{detail.m.score}%</p><p className="text-xs text-muted-foreground">相似度</p></div>
              <div className="text-center p-3 rounded-lg border"><Badge variant={detail.m.type === "exact" ? "success" : detail.m.type === "fuzzy" ? "warning" : "destructive"} className="text-sm">{detail.m.type === "exact" ? "精确匹配" : detail.m.type === "fuzzy" ? "模糊匹配" : "不匹配"}</Badge><p className="text-xs text-muted-foreground mt-1">类型</p></div>
              <div className="text-center p-3 rounded-lg border"><Badge variant={statusBadge[detail.m.status]} className="text-sm">{statusLabel[detail.m.status]}</Badge><p className="text-xs text-muted-foreground mt-1">状态</p></div>
            </div>
            <div className="p-3 rounded-lg border"><p className="text-xs font-medium text-foreground mb-2">匹配维度</p><div className="space-y-2">
              {[{ d: "名称相似度", s: detail.m.score }, { d: "规格匹配", s: detail.m.type === "exact" ? 95 : 60 }, { d: "材质匹配", s: detail.m.type === "exact" ? 100 : 70 }].map((x) => <div key={x.d} className="flex items-center gap-3"><span className="text-xs text-muted-foreground w-20">{x.d}</span><div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden"><div className={`h-full rounded-full ${x.s >= 90 ? "bg-success" : x.s >= 70 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${x.s}%` }} /></div><span className="text-xs font-medium w-10 text-right">{x.s}%</span></div>)}
            </div></div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="调整匹配信息" description={detail ? `调整「${detail.m.sku}」的匹配配置` : ""} size="md" footer={
        <>
          <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="premium" onClick={saveEdit}><Save className="w-4 h-4 mr-1.5" />保存调整</Button>
        </>
      }>
        {detail && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">主商品</p>
              <p className="text-sm text-foreground font-medium">{detail.g.master}</p>
              <p className="text-xs text-muted-foreground">{detail.g.mSpec}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary mb-1">系统建议匹配 (相似度 {detail.m.score}%)</p>
              <p className="text-sm text-foreground font-medium">{detail.m.sku}</p>
              <p className="text-xs text-muted-foreground">{detail.m.spec} · {detail.m.supplier}</p>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-foreground mb-3">您的调整：</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">匹配 SKU 名称</label>
                  <input type="text" value={editForm.sku} onChange={(e) => setEditForm((f) => ({ ...f, sku: e.target.value }))} className="mt-1 w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">匹配规格</label>
                  <input type="text" value={editForm.spec} onChange={(e) => setEditForm((f) => ({ ...f, spec: e.target.value }))} className="mt-1 w-full h-9 px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="最终确认匹配结果" description="确认后结果将锁定，可导出数据" size="md" footer={
        <>
          <Button variant="outline" onClick={() => setSubmitOpen(false)}>返回检查</Button>
          <Button variant="premium" onClick={handleSubmit}><ShieldCheck className="w-4 h-4 mr-1.5" />确认锁定</Button>
        </>
      }>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-2xl font-bold text-success">{confirmedCnt}</p>
              <p className="text-xs text-muted-foreground">已确认匹配</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-2xl font-bold text-destructive">{rejectedCnt}</p>
              <p className="text-xs text-muted-foreground">已驳回</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-foreground">{groups.length}</p>
              <p className="text-xs text-muted-foreground">匹配组</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground">
            <p><strong className="text-foreground">确认说明：</strong></p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li><strong>{confirmedCnt}</strong> 条确认匹配将作为最终结果锁定</li>
              <li><strong>{rejectedCnt}</strong> 条驳回匹配将不纳入最终数据</li>
              <li>锁定后可随时导出 CSV / Excel 格式</li>
              <li>如需调整，可在数据核查中发起回溯</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  )
}
