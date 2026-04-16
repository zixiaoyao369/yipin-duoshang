import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  max?: number
  className?: string
  indicatorClassName?: string
  size?: "sm" | "md" | "lg"
}

export function Progress({ value, max = 100, className, indicatorClassName, size = "md" }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" }

  return (
    <div className={cn("w-full rounded-full bg-secondary overflow-hidden", heights[size], className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-primary transition-all duration-500 ease-out", indicatorClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
