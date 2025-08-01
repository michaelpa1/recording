import { type Component, JSX, splitProps } from "solid-js"
import { cn } from "../../lib/utils"

export interface BadgeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

const badgeVariants = {
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground"
  }
}

export const Badge: Component<BadgeProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "variant"])
  
  return (
    <div
      class={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        badgeVariants.variant[local.variant || "default"],
        local.class
      )}
      {...rest}
    />
  )
} 