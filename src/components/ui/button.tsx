import { type Component, type JSX, splitProps } from "solid-js"

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive" | "ghost"
  size?: "default" | "icon"
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "variant", "size"])
  const variantClass =
    local.variant === "outline"
      ? "border border-gray-600 text-white"
      : local.variant === "destructive"
      ? "bg-red-600 text-white"
      : local.variant === "ghost"
      ? "text-gray-300 hover:bg-gray-800/60"
      : "bg-gray-700 text-white"
  const sizeClass = local.size === "icon" ? "h-8 w-8 p-0" : "px-3 py-2"

  return (
    <button
      class={`inline-flex items-center justify-center rounded ${variantClass} ${sizeClass} ${local.class || ""}`}
      {...rest}
    />
  )
} 