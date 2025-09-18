import { type Component, type JSX, splitProps } from "solid-js"
import { cn } from "../../lib/utils"

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const Card: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  return <div class={`rounded-lg border ${local.class || ""}`} {...rest} />
}

export interface CardHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const CardHeader: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  return <div class={`p-6 ${local.class || ""}`} {...rest} />
}

export interface CardTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle: Component<JSX.HTMLAttributes<HTMLHeadingElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  return <h3 class={`text-lg font-semibold leading-none tracking-tight ${local.class || ""}`} {...rest} />
}

export interface CardDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription: Component<CardDescriptionProps> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  
  return (
    <p
      class={cn("text-sm text-muted-foreground", local.class)}
      {...rest}
    />
  )
}

export interface CardContentProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const CardContent: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  return <div class={`p-6 pt-0 ${local.class || ""}`} {...rest} />
}

export interface CardFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: Component<CardFooterProps> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  
  return (
    <div
      class={cn("flex items-center p-6 pt-0", local.class)}
      {...rest}
    />
  )
} 