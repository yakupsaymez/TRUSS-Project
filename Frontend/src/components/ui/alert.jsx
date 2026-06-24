import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm flex gap-3 items-start [&>svg]:size-4 [&>svg]:mt-0.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-card text-foreground border-border",
        destructive: "border-destructive/40 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        warning:     "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 [&>svg]:text-amber-500",
        info:        "border-primary/40 bg-primary/10 text-primary [&>svg]:text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Alert({ className, variant, ...props }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
