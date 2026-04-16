import { type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  footer?: ReactNode
}

export function Modal({ open, onClose, title, description, children, size = "md", footer }: ModalProps) {
  if (!open) return null

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — Apple frosted glass */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xl animate-fade-in" onClick={onClose} />
      {/* Content — Apple modal style: no border, strong shadow */}
      <div className={cn(
        "relative w-full mx-4 bg-card rounded-2xl shadow-apple animate-scale-in overflow-hidden",
        sizes[size]
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-apple"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 pb-4 max-h-[60vh] overflow-y-auto">{children}</div>
        {/* Footer — Subtle separator */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-background/50">{footer}</div>
        )}
      </div>
    </div>
  )
}
