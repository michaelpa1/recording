import { type Component, type JSX, splitProps } from "solid-js"

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive"
}

export const Badge: Component<BadgeProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "variant"])
  const variantClass =
    local.variant === "secondary"
      ? "bg-gray-600 text-white"
      : local.variant === "destructive"
      ? "bg-red-600 text-white"
      : "bg-gray-700 text-white"

  return (
    <span
      class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClass} ${local.class || ""}`}
      {...rest}
    />
  )
} 