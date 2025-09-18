import { type Component, createSignal, type JSX, splitProps, createContext, useContext } from "solid-js"

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
}

const TabsContext = createContext<TabsContextValue>()

export const Tabs: Component<{ defaultValue: string } & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, rest] = splitProps(props, ["defaultValue", "class"])
  const [value, setValue] = createSignal(local.defaultValue)
  return (
    <TabsContext.Provider value={{ value: value(), setValue }}>
      <div class={local.class || ""} {...rest} />
    </TabsContext.Provider>
  )
}

export const TabsList: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  return <div class={`flex gap-2 ${local.class || ""}`} {...rest} />
}

export const TabsTrigger: Component<{ value: string } & JSX.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  const [local, rest] = splitProps(props, ["value", "class"])
  const ctx = useContext(TabsContext)!
  const active = ctx.value === local.value
  return (
    <button
      class={`px-3 py-2 rounded ${active ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-300"} ${local.class || ""}`}
      onClick={() => ctx.setValue(local.value)}
      {...rest}
    />
  )
}

export const TabsContent: Component<{ value: string } & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, rest] = splitProps(props, ["value", "class"])
  const ctx = useContext(TabsContext)!
  if (ctx.value !== local.value) return null as unknown as JSX.Element
  return <div class={local.class || ""} {...rest} />
} 