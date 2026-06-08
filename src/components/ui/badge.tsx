import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface BadgeProps extends React.ComponentProps<"div"> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  let variantClasses = "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
  
  if (variant === "secondary") variantClasses = "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
  if (variant === "destructive") variantClasses = "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80"
  if (variant === "outline") variantClasses = "text-foreground"
  if (variant === "success") variantClasses = "border-transparent bg-green-500/10 text-green-600 hover:bg-green-500/20"

  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variantClasses, className)} {...props} />
  )
}

export { Badge }
