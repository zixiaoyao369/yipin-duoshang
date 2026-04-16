import { createContext, useContext, useState, type ReactNode } from "react"

/** 三级类目树结构，和 DataPrep / SimilarityMatch 中 catTree 一致 */
export interface CatTreeNode {
  name: string
  children: { name: string; children: string[] }[]
}

/**
 * 模拟「数据准备页面用户提交匹配」后可用的类目数据。
 * 在实际系统中这会从后端接口获取；原型中硬编码模拟。
 */
const submittedCatTree: CatTreeNode[] = [
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
  { name: "密封件", children: [
    { name: "密封圈", children: ["丁腈橡胶O型圈", "氟橡胶O型圈"] },
  ]},
  { name: "管阀件", children: [
    { name: "管材管件", children: ["PPR管", "PVC-U排水管", "镀锌管"] },
    { name: "法兰", children: ["板式平焊法兰", "带颈对焊法兰", "盲板法兰"] },
    { name: "阀门", children: ["不锈钢球阀", "明杆闸阀", "蝶阀"] },
  ]},
  { name: "化工原料", children: [
    { name: "润滑油", children: ["液压油"] },
    { name: "清洗剂", children: ["工业清洗剂"] },
  ]},
  { name: "办公用品", children: [
    { name: "标签", children: ["热敏标签"] },
    { name: "打印耗材", children: ["碳带"] },
  ]},
  { name: "仪器仪表", children: [
    { name: "流量计", children: ["电磁流量计", "涡街流量计"] },
    { name: "液位计", children: ["磁翻板液位计", "超声波液位计"] },
  ]},
]

interface SubmittedCategoriesValue {
  /** 完整的已提交类目树 (一二三级) */
  catTree: CatTreeNode[]
  /** 已提交的一级类目名称列表 */
  submittedCat1Names: string[]
  /** 添加一级类目 (模拟提交匹配) */
  addCategory: (cat: CatTreeNode) => void
}

const Ctx = createContext<SubmittedCategoriesValue>({
  catTree: submittedCatTree,
  submittedCat1Names: submittedCatTree.map((c) => c.name),
  addCategory: () => {},
})

export function SubmittedCategoriesProvider({ children }: { children: ReactNode }) {
  const [catTree, setCatTree] = useState<CatTreeNode[]>(submittedCatTree)
  const submittedCat1Names = catTree.map((c) => c.name)

  const addCategory = (cat: CatTreeNode) => {
    setCatTree((prev) => {
      if (prev.some((c) => c.name === cat.name)) return prev
      return [...prev, cat]
    })
  }

  return <Ctx.Provider value={{ catTree, submittedCat1Names, addCategory }}>{children}</Ctx.Provider>
}

export const useSubmittedCategories = () => useContext(Ctx)
