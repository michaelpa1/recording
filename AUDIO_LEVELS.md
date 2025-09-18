## Audio Level Meter & Tooltip Specification

This document explains how the audio level meter works in `src/components/Record.tsx`, how colors and tooltips are derived, and what to tweak if needed.

### Goals
- Reflect true input loudness in real time (with browser DSP disabled).
- Provide clear visual feedback with smooth color transitions and brief holds so hot levels are obvious.
- Offer immediate context via inline status text and hover tooltips.

## Signal Acquisition
- Media constraints disable browser processing to reflect real levels:
  - `echoCancellation: false`
  - `noiseSuppression: false`
  - `autoGainControl: false`
- An `AnalyserNode` is created with:
  - `fftSize = 1024`
  - `smoothingTimeConstant = 0.2` (responsive motion)
- Time‑domain samples are read via `getByteTimeDomainData` and converted to float samples in the range \(-1, 1\).

## Metrics Computed
- RMS (root mean square) of time‑domain samples → used to compute dBFS:
  - `dB = 20 * log10(rms)` (clamped to [-100, 0])
- Peak absolute sample (|sample|):
  - Used to detect transient or sustained clipping.
- 300 ms peak hold:
  - Ensures recent peaks visibly affect the meter (prevents missing fast overloads).
- Smoothed UI width value:
  - `audioLevel = 0.8 * prev + 0.2 * min(1, rms * 3)`
  - Used only for the bar width (not for color logic).

## Band Classification (Held With Hysteresis)
We classify an instantaneous band, then apply a hold timer to avoid flicker and reflect sustained loudness.

Instant thresholds (in dBFS):
- Red (clipping): `peakHold >= 0.99` OR `dB >= -1`
- Orange (warning): `-6 <= dB < -1`
- Green (optimal): `-18 <= dB < -6`
- Blue (low/no signal): `dB < -18`

Hold durations (approximate):
- Red: 1500 ms
- Orange: 900 ms
- Green: 500 ms
- Blue: 500 ms

Escalation/de‑escalation policy:
- Escalate (e.g., green → orange → red) immediately.
- De‑escalate only when the corresponding hold timer expires.

Relevant helpers in `Record.tsx`:
- `classifyInstantBand(rms: number, peak: number): LevelBand`
- Held band state: `currentBand`, `bandHoldUntilMs`

## Color Rendering Rules (Gradient)
The meter uses a CSS linear‑gradient background that updates every ~100 ms based on the current dB value:

- dB ≥ 0: Solid Red (`#ef4444`)
- dB < −18: Solid Blue (`#3b82f6`)
- −18 ≤ dB < −6: Green → Orange gradient
  - Start: Green (`#22c55e`)
  - End: Blend(Green→Orange) with t = (dB + 18) / 12
- −6 ≤ dB < 0: Green → Yellow → Red gradient
  - Green (`#22c55e`) to Yellow (`#facc15`) mid‑stop, then to Red (`#ef4444`)
  - Red bias increases as dB approaches 0 (heavier near −1 dB)

Implementation helpers:
- `getCurrentDb(): number` → computes dBFS from RMS and clamps
- `getMeterBackground(db: number): string` → returns either a solid color or a `linear-gradient(...)`
- Hex helpers for blending: `hexToRgb`, `rgbToHex`, `blendHex`

Note: If `lastPeak() >= 0.99`, the meter is forced to solid red regardless of RMS.

## Tooltip & Inline Status Text
Tooltip text (also shown inline next to “Audio Level”) maps to dB:
- dB ≥ 0: "Clipping! Reduce Input"
- −6 ≤ dB < 0: "Warning"
- −18 ≤ dB < −6: "Optimal Level"
- dB < −18: "No Signal / Too Low"

Helpers:
- `getDbTooltip(db: number): string`
- Text color (inline label) is derived from the held band:
  - Red → `text-red-500`
  - Orange → `text-orange-400`
  - Green → `text-green-400`
  - Blue → `text-blue-400`

## UI Binding Summary
- Bar width: `style={{ width: `${audioLevel() * 100}%` }}`
- Bar background: `style={{ background: getMeterBackground(getCurrentDb()) }}`
- Tooltip: `title={getDbTooltip(getCurrentDb())}` on the meter container
- Inline label: `• {getLevelTooltip()}` with `class={getLevelTextClass()}`

## Tuning Guide
- Make the meter more/less responsive:
  - Increase/decrease analyser `smoothingTimeConstant` (0.1–0.6 typical).
  - Adjust meter timer cadence (currently ~100 ms).
- Peak sensitivity:
  - Change clip threshold from `0.99` to a different value (e.g., `0.98`).
  - Change peak hold duration (`peakHoldUntilMs`, currently ~300 ms).
- Band hysteresis:
  - Modify `bandHoldMs` values to hold colors longer or shorter.
- dB thresholds:
  - Red: `-1 dB` cutoff can be tightened/loosened.
  - Orange/Green boundaries: adjust `-6 dB`, `-18 dB` as desired.
- Gradient appearance:
  - Edit hex colors or gradient stop bias inside `getMeterBackground`.

## Known Limitations / Notes
- The width is based on smoothed RMS; instantaneous red (from peaks) may not always reach 100% width, but the color and label/tooltip indicate overload.
- Disabling browser AGC/NS/EC improves metering realism but users can still have OS‑level processing.
- Accurate absolute dBFS depends on the browser’s implementation; thresholds are set for practical UX guidance rather than calibrated metering.


