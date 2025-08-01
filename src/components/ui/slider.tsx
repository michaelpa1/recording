import { type Component, createSignal, JSX, splitProps } from "solid-js"
import { cn } from "../../lib/utils"

export interface SliderProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
  min?: number
  max?: number
  step?: number
  value?: number
  onValueChange?: (value: number) => void
}

export const Slider: Component<SliderProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "min", "max", "step", "value", "onValueChange"])
  const [internalValue, setInternalValue] = createSignal(local.value || 0)
  
  const value = () => local.value !== undefined ? local.value : internalValue()
  
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newValue = parseFloat(target.value)
    if (local.value === undefined) {
      setInternalValue(newValue)
    }
    local.onValueChange?.(newValue)
  }
  
  return (
    <div class={cn("relative flex w-full touch-none select-none items-center", local.class)}>
      <input
        type="range"
        min={local.min || 0}
        max={local.max || 100}
        step={local.step || 1}
        value={value()}
        onInput={handleChange}
        class="relative h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary"
        {...rest}
      />
    </div>
  )
} 