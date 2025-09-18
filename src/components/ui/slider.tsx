import { type Component, createSignal, type JSX, splitProps } from "solid-js"

interface SliderProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onInput'> {
  value: number
  min?: number
  max?: number
  step?: number
  onValueChange?: (v: number) => void
}

export const Slider: Component<SliderProps> = (props) => {
  const [local, rest] = splitProps(props, ["value", "min", "max", "step", "onValueChange", "class"])
  const [val, setVal] = createSignal(local.value)
  const onInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const n = parseFloat(e.currentTarget.value)
    setVal(n)
    local.onValueChange?.(n)
  }
  return (
    <input
      type="range"
      class={`w-full ${local.class || ""}`}
      value={val()}
      min={local.min ?? 0}
      max={local.max ?? 100}
      step={local.step ?? 1}
      onInput={onInput}
      {...rest}
    />
  )
} 