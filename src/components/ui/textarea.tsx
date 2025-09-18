import { type Component, type JSX, splitProps } from "solid-js"

export const Textarea: Component<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  return (
    <textarea
      class={`w-full rounded border bg-transparent ${local.class || ""}`}
      {...rest}
    />
  )
} 