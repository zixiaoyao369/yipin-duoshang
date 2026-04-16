import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "up" | "down" | "neutral"
  icon: LucideIcon
  iconColor?: string
  description?: string
  className?: string
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, iconColor, description, className }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-2xl bg-card p-5 shadow-card transition-apple hover:shadow-elevated group",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground tracking-tight animate-count-up">{value}</p>
          {change && (
            <p className={cn(
              "text-xs font-medium",
              changeType === "up" && "text-success",
              changeType === "down" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-apple group-hover:scale-105",
          iconColor || "bg-primary/8"
        )}>
          <Icon className="w-5 h-5 text-primary" strokeWidth={1.6} />
        </div>
      </div>
    </div>
  )
}
