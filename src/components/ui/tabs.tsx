import { type Component, createSignal, JSX, splitProps, createContext, useContext } from "solid-js"
import { cn } from "../../lib/utils"

interface TabsContextType {
  value: () => string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType>()

export interface TabsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

export const Tabs: Component<TabsProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "defaultValue", "value", "onValueChange"])
  const [internalValue, setInternalValue] = createSignal(local.defaultValue || "")
  
  const value = () => local.value !== undefined ? local.value : internalValue()
  
  const handleValueChange = (newValue: string) => {
    if (local.value === undefined) {
      setInternalValue(newValue)
    }
    local.onValueChange?.(newValue)
  }
  
  const contextValue: TabsContextType = {
    value,
    onValueChange: handleValueChange
  }
  
  return (
    <TabsContext.Provider value={contextValue}>
      <div class={cn("", local.class)} {...rest}>
        {props.children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const TabsList: Component<TabsListProps> = (props) => {
  const [local, rest] = splitProps(props, ["class"])
  
  return (
    <div
      class={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        local.class
      )}
      {...rest}
    />
  )
}

export interface TabsTriggerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTrigger: Component<TabsTriggerProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "value"])
  const context = useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component")
  }
  
  const isActive = () => context.value() === local.value
  
  return (
    <button
      class={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive() ? "bg-background text-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground",
        local.class
      )}
      onClick={() => context.onValueChange(local.value)}
      {...rest}
    />
  )
}

export interface TabsContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent: Component<TabsContentProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "value"])
  const context = useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component")
  }
  
  const isActive = () => context.value() === local.value
  
  return (
    <div
      class={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !isActive() && "hidden",
        local.class
      )}
      {...rest}
    />
  )
} 