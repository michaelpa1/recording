import { createSignal, createEffect, onCleanup, Show, onMount } from "solid-js"
import type { Component } from "solid-js"
import { Mic, Type, Play, Pause, Square, RotateCcw, Volume2, HelpCircle } from "lucide-solid"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Slider } from "./ui/slider"
import { Textarea } from "./ui/textarea"

export const Record: Component = () => {
  // Recording state
  const [isRecording, setIsRecording] = createSignal(false)
  const [isPaused, setIsPaused] = createSignal(false)
  const [recordingTime, setRecordingTime] = createSignal(0)
  const [audioLevel, setAudioLevel] = createSignal(0)
  const [recordingFormat] = createSignal("WAV")
  const [showCountdown, setShowCountdown] = createSignal(false)
  const [countdown, setCountdown] = createSignal(3)
  const [lastRms, setLastRms] = createSignal(0)
  const [lastPeak, setLastPeak] = createSignal(0)
  type LevelBand = 'blue' | 'green' | 'orange' | 'red'
  const [currentBand, setCurrentBand] = createSignal<LevelBand>('blue')
  let bandHoldUntilMs: number = 0
  const bandHoldMs: Record<LevelBand, number> = {
    red: 1500,
    orange: 900,
    green: 500,
    blue: 500,
  }
  // Peak hold to ensure peaks visibly influence the meter color
  let peakHold = 0
  let peakHoldUntilMs = 0
  
  // Teleprompter state
  const [teleprompterText, setTeleprompterText] = createSignal(`[line left blank — keep reading to learn why]

Welcome to the Voice ReGen teleprompter.
This tool is here to make your recordings easier, smoother, and more professional.
For the best results, start your script from the second line down—leave the first line blank. Then follow along with the orange-highlighted prompt line you’ll see in the Preview.

When you’re speaking off the cuff, it’s easy to lose your place, stumble on words, or drift off track. A teleprompter gives you a guide—so your voice stays clear, confident, and consistent from start to finish.

Even in audio-only projects, structure matters. A well-paced script keeps your delivery natural, your timing on point, and your message sharp. With this teleprompter, you can focus on performance, not memory.

Take your time, adjust the speed, and let the words guide you.
When you’re ready—hit record and bring your script to life.`)
  const [scrollSpeed, setScrollSpeed] = createSignal(1)
  const [fontSize, setFontSize] = createSignal(16)
  const [scrollPosition, setScrollPosition] = createSignal(0)
  const [showEditor, setShowEditor] = createSignal(true) // Default to true so you can see the editor initially
  
  // Rehearsal state (scroll without recording)
  const [isRehearsing, setIsRehearsing] = createSignal(false)
  // Add countdown duration setting
  const [countdownDuration, setCountdownDuration] = createSignal(3)
  // Add teleprompter visibility toggle
  const [showTeleprompter, setShowTeleprompter] = createSignal(true)
  // Add microphone selection
  const [availableMics, setAvailableMics] = createSignal<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = createSignal("")
  
  // Media recording
  let mediaRecorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let recordingInterval: number | null = null
  let scrollInterval: number | null = null
  let countdownInterval: number | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let meterInterval: number | null = null
  // Recorded preview state
  const [recordedBlob, setRecordedBlob] = createSignal<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = createSignal<string | null>(null)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get recording status
  const getRecordingStatus = () => {
    if (isRecording()) {
      return isPaused() ? "PAUSED" : "RECORDING"
    }
    return "READY"
  }

  // Get status badge variant
  const getStatusVariant = () => {
    if (isRecording()) {
      return isPaused() ? "secondary" : "destructive"
    }
    return "default"
  }

  // Start countdown and recording
  const startRecording = async () => {
    try {
      // Ensure we have a monitoring stream and analyser ready
      if (!mediaStream) {
        const constraints = { 
          audio: selectedMicId() ? {
            deviceId: { exact: selectedMicId() },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        }
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        // Refresh device list after permission is granted so labels populate
        await enumerateMicrophones()
      }
      if (mediaStream && !analyser) {
        setupAnalyser(mediaStream)
      }
      
      // Always show countdown before recording
      setShowCountdown(true)
      setCountdown(countdownDuration())
      
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval!)
            setShowCountdown(false)
            startActualRecording()
            return countdownDuration() // Reset to the correct duration
          }
          return prev - 1
        })
      }, 1000)
      
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }

  // Start actual recording after countdown
  const startActualRecording = () => {
    if (!mediaStream) return
    
    // Stop rehearsal if active
    if (isRehearsing()) setIsRehearsing(false)

    // Clear any previous preview
    if (recordedUrl()) {
      try { URL.revokeObjectURL(recordedUrl()!) } catch (_) {}
      setRecordedUrl(null)
      setRecordedBlob(null)
    }

    const chunks: Blob[] = []
    mediaRecorder = new MediaRecorder(mediaStream)
    
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data)
    }
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: `audio/${recordingFormat().toLowerCase()}` })
      const url = URL.createObjectURL(blob)
      setRecordedBlob(blob)
      setRecordedUrl(url)
    }
    
    mediaRecorder.start()
    setIsRecording(true)
    setIsPaused(false)
    setRecordingTime(0)
    
    // Start timer
    recordingInterval = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
  }

  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorder) return
    
    if (isPaused()) {
      mediaRecorder.resume()
      setIsPaused(false)
    } else {
      mediaRecorder.pause()
      setIsPaused(true)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
    }
    if (recordingInterval) {
      clearInterval(recordingInterval)
    }
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    // Keep monitoring after stopping; ensure analyser exists for the stream
    if (mediaStream && !analyser) {
      setupAnalyser(mediaStream)
    }
  }

  // Cancel the countdown before recording starts
  const cancelCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    setShowCountdown(false)
    cleanupMedia() // This is the key part that releases the mic
  }

  // Clean up media resources
  const cleanupMedia = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }
    if (sourceNode) {
      try { sourceNode.disconnect() } catch (_) {}
      sourceNode = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    if (analyser) {
      analyser = null
    }
    if (mediaRecorder) {
      mediaRecorder = null
    }
    if (recordedUrl()) {
      try { URL.revokeObjectURL(recordedUrl()!) } catch (_) {}
      setRecordedUrl(null)
      setRecordedBlob(null)
    }
  }

  // Allow user to save the recorded preview
  const saveRecording = () => {
    const blob = recordedBlob()
    const url = recordedUrl()
    if (!blob || !url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${recordingFormat().toLowerCase()}`
    a.click()
  }

  // Discard the current preview and allow re-record
  const discardRecording = () => {
    if (recordedUrl()) {
      try { URL.revokeObjectURL(recordedUrl()!) } catch (_) {}
    }
    setRecordedUrl(null)
    setRecordedBlob(null)
  }

  // Create or refresh analyser chain for the given stream
  const setupAnalyser = (stream: MediaStream) => {
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    // Resume the context in case it is suspended due to autoplay policy
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {})
    }
    if (sourceNode) {
      try { sourceNode.disconnect() } catch (_) {}
      sourceNode = null
    }
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.2
    sourceNode = audioContext.createMediaStreamSource(stream)
    sourceNode.connect(analyser)
  }

  // Start passive level monitoring of selected mic
  const startLevelMonitor = async () => {
    try {
      // Stop previous monitor stream if any
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
        mediaStream = null
      }
      const constraints = {
        audio: selectedMicId() ? {
          deviceId: { exact: selectedMicId() },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } : {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      }
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      await enumerateMicrophones()
      setupAnalyser(mediaStream)
    } catch (error) {
      console.error("Error starting level monitor:", error)
    }
  }

  // Start a persistent UI meter loop on mount
  onMount(() => {
    if (!meterInterval) {
      meterInterval = setInterval(() => {
        if (!analyser) {
          setAudioLevel(0)
          setCurrentBand('blue')
          return
        }
        const timeDomain = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(timeDomain)
        let sumSquares = 0
        let peak = 0
        for (let i = 0; i < timeDomain.length; i++) {
          const sample = (timeDomain[i] - 128) / 128
          sumSquares += sample * sample
          const a = Math.abs(sample)
          if (a > peak) peak = a
        }
        const rms = Math.sqrt(sumSquares / timeDomain.length)
        setLastRms(rms)
        // Peak hold (~300ms)
        const now = performance.now()
        if (peak > peakHold || now >= peakHoldUntilMs) {
          peakHold = peak
          peakHoldUntilMs = now + 300
        }
        setLastPeak(peakHold)
        const boosted = Math.min(1, rms * 3)
        const smoothed = 0.8 * audioLevel() + 0.2 * boosted
        setAudioLevel(smoothed)

        // Sustained band logic with hold
        const instantBand = classifyInstantBand(rms, peakHold)
        const held = currentBand()
        if (instantBand !== held) {
          // Escalate immediately to a higher severity band
          const order: LevelBand[] = ['blue','green','orange','red']
          if (order.indexOf(instantBand) > order.indexOf(held)) {
            setCurrentBand(instantBand)
            bandHoldUntilMs = now + bandHoldMs[instantBand]
          } else {
            // De-escalate only if hold expired
            if (now >= bandHoldUntilMs) {
              setCurrentBand(instantBand)
              bandHoldUntilMs = now + bandHoldMs[instantBand]
            }
          }
        } else {
          // Extend hold while staying in same band
          if (now >= bandHoldUntilMs) {
            bandHoldUntilMs = now + bandHoldMs[held]
          }
        }
      }, 100) as unknown as number
    }
  })

  // Auto-scroll teleprompter (during recording or rehearsal)
  createEffect(() => {
    if ((isRecording() && !isPaused()) || isRehearsing()) {
      scrollInterval = setInterval(() => {
        setScrollPosition(prev => prev + scrollSpeed())
      }, 100)
    } else if (scrollInterval) {
      clearInterval(scrollInterval)
      scrollInterval = null
    }
  })

  // Reset scroll position
  const resetScroll = () => {
    setScrollPosition(0)
  }

  // Enumerate available microphones
  const enumerateMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter(device => device.kind === 'audioinput')
      setAvailableMics(mics)
      
      // Set default to first available mic if none selected
      if (mics.length > 0 && !selectedMicId()) {
        setSelectedMicId(mics[0].deviceId)
      }
    } catch (error) {
      console.error("Error enumerating microphones:", error)
    }
  }

  // Enumerate microphones when component mounts and when devices change
  onMount(() => {
    enumerateMicrophones()
    // Begin passive monitoring on load (will prompt permission once)
    startLevelMonitor()
    const handleDeviceChange = () => {
      enumerateMicrophones()
      if (!isRecording()) {
        startLevelMonitor()
      }
    }
    if (navigator.mediaDevices && "addEventListener" in navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)
    } else if (navigator.mediaDevices && "ondevicechange" in navigator.mediaDevices) {
      // Fallback for older browsers
      // @ts-ignore
      navigator.mediaDevices.ondevicechange = handleDeviceChange
    }

    onCleanup(() => {
      if (navigator.mediaDevices && "removeEventListener" in navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange)
      } else if (navigator.mediaDevices && "ondevicechange" in navigator.mediaDevices) {
        // @ts-ignore
        navigator.mediaDevices.ondevicechange = null
      }
    })
  })

  // When the selected microphone changes, restart monitoring if not recording
  createEffect(() => {
    selectedMicId()
    if (!isRecording()) {
      startLevelMonitor()
    }
  })

  // Clean up on unmount
  onCleanup(() => {
    if (recordingInterval) clearInterval(recordingInterval)
    if (scrollInterval) clearInterval(scrollInterval)
    if (countdownInterval) clearInterval(countdownInterval)
    if (meterInterval) clearInterval(meterInterval)
    cleanupMedia()
  })

  // Map current held band to text color/tooltip (bar color is gradient-based below)
  const getLevelTextClass = () => {
    const band = currentBand()
    if (band === 'red') return 'text-red-500'
    if (band === 'orange') return 'text-orange-400'
    if (band === 'green') return 'text-green-400'
    return 'text-blue-400'
  }

  const classifyInstantBand = (rms: number, peak: number): LevelBand => {
    if (peak >= 0.99) return 'red'
    const db = rms > 1e-6 ? 20 * Math.log10(rms) : -Infinity
    if (db >= -1) return 'red'
    if (db >= -6) return 'orange'
    if (db >= -18) return 'green'
    return 'blue'
  }

  // Convert current RMS/peak to dBFS (0 dB = full scale). Caps clipping by peak.
  const getCurrentDb = (): number => {
    const peak = lastPeak()
    if (peak >= 0.99) return 0 // Treat near-full-scale peak as clipping
    const rms = lastRms()
    if (rms <= 1e-6) return -100
    const db = 20 * Math.log10(rms)
    return Math.max(-100, Math.min(0, db))
  }

  // Simple HEX color utilities for blending
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '')
    const bigint = parseInt(h, 16)
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
  }
  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (v: number) => v.toString(16).padStart(2, '0')
    return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`
  }
  const blendHex = (a: string, b: string, t: number) => {
    const ca = hexToRgb(a)
    const cb = hexToRgb(b)
    const r = ca.r + (cb.r - ca.r) * t
    const g = ca.g + (cb.g - ca.g) * t
    const b2 = ca.b + (cb.b - ca.b) * t
    return rgbToHex(r, g, b2)
  }

  // Build a CSS linear-gradient background based on current dB
  // Rules:
  // - Below -18 dB: solid blue
  // - -18..-6 dB: green -> orange gradient (more orange near -6 dB)
  // - -6..0 dB: green -> yellow (mid) -> red gradient (more red near 0 dB)
  // - >= 0 dB: solid red
  const getMeterBackground = (db: number): string => {
    const blue = '#3b82f6'   // tailwind blue-500
    const green = '#22c55e'  // green-500
    const orange = '#f59e0b' // orange-500
    const yellow = '#facc15' // yellow-400
    const red = '#ef4444'    // red-500

    // If peak hold indicates clipping, enforce solid red
    if (lastPeak() >= 0.99 || db >= 0) return red
    if (db < -18) return blue

    if (db < -6) {
      const t = (db + 18) / 12 // 0 at -18dB, 1 at -6dB
      const end = blendHex(green, orange, Math.min(1, Math.max(0, t)))
      return `linear-gradient(90deg, ${green} 0%, ${end} 100%)`
    }

    // -6..0 dB — bias more strongly towards red near -1 dB
    const t2 = (db + 6) / 6 // 0 at -6dB, 1 at 0dB
    const bias = Math.min(1, Math.max(0, (db + 6) / 5)) // grows faster near 0
    const midStop = Math.round(Math.min(100, Math.max(0, (t2 * 100))))
    const safeMid = Math.max(20, Math.min(80, midStop))
    const start = blendHex(green, yellow, 0.3)
    const mid = blendHex(yellow, red, bias)
    return `linear-gradient(90deg, ${start} 0%, ${mid} ${safeMid}%, ${red} 100%)`
  }

  // Tooltip label per dB rules
  const getDbTooltip = (db: number): string => {
    if (db >= 0) return 'Clipping! Reduce Input'
    if (db >= -6) return 'Warning'
    if (db >= -18) return 'Optimal Level'
    return 'No Signal / Too Low'
  }

  // Tooltip text for inline label (held band)
  const getLevelTooltip = () => {
    const band = currentBand()
    if (band === 'red') return 'Clipping! Reduce Input'
    if (band === 'orange') return 'Warning'
    if (band === 'green') return 'Optimal Level'
    return 'No Signal / Too Low'
  }

  return (
    <div class="min-h-screen bg-gray-900">
            {/* Mobile Layout - REVISED */}
      <div class="block lg:hidden p-4 space-y-4">

        {/* Teleprompter Toggle Button */}
        <div class="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setShowTeleprompter(!showTeleprompter())}
            class="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            {showTeleprompter() ? "Hide Teleprompter" : "Show Teleprompter"}
          </Button>
        </div>

        {/* 1. Teleprompter Preview */}
        <Show when={showTeleprompter()}>
          <Card class="bg-gray-800 border-gray-700">
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle class="flex items-center gap-2 text-white text-sm">
                  <Type class="w-4 h-4" />
                  Teleprompter
                </CardTitle>
                <div class="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setIsRehearsing(prev => !prev)} class="text-gray-200 hover:text-white px-2 py-1 text-xs">
                    {isRehearsing() ? "Stop" : "Rehearse"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={resetScroll} class="text-gray-400 hover:text-white">
                    <RotateCcw class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div class="relative">
                <div class="bg-black rounded-lg p-4 overflow-hidden h-48" style={{ "font-size": `${fontSize()}px` }}>
                  <div class="text-white leading-relaxed transition-transform duration-100 whitespace-pre-wrap" style={{ transform: `translateY(-${scrollPosition()}px)` }}>
                    {teleprompterText()}
                  </div>
                </div>
                
                {/* UPDATED Focus line with a help icon/tooltip */}
                <div class="group absolute top-1/3 left-2 right-2 flex items-center">
                  <div class="h-px bg-orange-500 opacity-75 flex-grow"></div>
                  <HelpCircle class="w-4 h-4 text-gray-500 ml-2 flex-shrink-0" />

                  {/* The Tooltip itself */}
                  <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 border border-gray-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Keep your eyes here for a steady reading pace
                  </div>
                </div>
                
                {(isRecording() && !isPaused()) || isRehearsing() ? (
                  <Badge class="absolute bottom-2 right-2 bg-orange-600">
                    SCROLLING
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </Show>

        {/* 2. Recording Controls OR Preview (mobile) */}
        <Show when={!recordedUrl() || isRecording()} fallback={
          <Card class="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle class="text-white text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <audio src={recordedUrl() ?? undefined} controls class="w-full" />
              <div class="flex gap-2">
                <Button onClick={saveRecording} class="flex-1 bg-green-600 hover:bg-green-700">Save</Button>
                <Button onClick={discardRecording} variant="outline" class="flex-1">Discard</Button>
              </div>
            </CardContent>
          </Card>
        }>
        <Card class="bg-gray-800 border-gray-700">
          <CardContent class="space-y-4 pt-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-gray-300">Status:</span>
                  <Badge variant={getStatusVariant()}>{getRecordingStatus()}</Badge>
                </div>
              </div>
              
              <div class="flex items-center gap-4">
                {/* Countdown Duration Dropdown */}
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-300">Countdown:</span>
                  <select 
                    value={countdownDuration()}
                    onChange={(e) => setCountdownDuration(parseInt(e.target.value, 10))}
                    class="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-sm"
                  >
                    <option value={2}>2s</option>
                    <option value={3}>3s</option>
                    <option value={4}>4s</option>
                    <option value={5}>5s</option>
                    <option value={6}>6s</option>
                    <option value={7}>7s</option>
                    <option value={8}>8s</option>
                    <option value={9}>9s</option>
                    <option value={10}>10s</option>
                    <option value={11}>11s</option>
                    <option value={12}>12s</option>
                    <option value={13}>13s</option>
                    <option value={14}>14s</option>
                    <option value={15}>15s</option>
                  </select>
                </div>
                
                {/* Microphone Selection Dropdown */}
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-300">Mic:</span>
                  <select 
                    value={selectedMicId()}
                    onChange={(e) => setSelectedMicId(e.target.value)}
                    class="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-sm"
                  >
                    {availableMics().map(mic => (
                      <option value={mic.deviceId}>
                        {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-mono text-white">{formatTime(recordingTime())}</div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Volume2 class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-300">Audio Level</span>
                <span class={`text-sm ${getLevelTextClass()}`}>• {getLevelTooltip()}</span>
              </div>
              <div class="h-4 bg-gray-700 rounded-full overflow-hidden" title={getDbTooltip(getCurrentDb())}>
                <div class="h-full transition-all duration-100" style={{ width: `${audioLevel() * 100}%`, "background": getMeterBackground(getCurrentDb()) }} />
              </div>
            </div>
            <div class="flex gap-2">
              {!isRecording() ? (
                <Button onClick={startRecording} class="flex-1 bg-orange-600 hover:bg-orange-700">
                  Start Recording
                </Button>
              ) : (
                <>
                  <Button onClick={togglePause} variant="outline" class="flex-1">
                    {isPaused() ? <Play class="w-4 h-4" /> : <Pause class="w-4 h-4" />}
                    {isPaused() ? "Resume" : "Pause"}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive" class="flex-1">
                    <Square class="w-4 h-4" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        </Show>
        
        {/* 3. Collapsible Script Editor & Settings */}
        <Show when={showTeleprompter()}>
          <Card class="bg-gray-800 border-gray-700">
            <CardHeader class="cursor-pointer" onClick={() => setShowEditor(!showEditor())}>
              <div class="flex items-center justify-between">
                <CardTitle class="flex items-center gap-2 text-white text-sm">
                  <Type class="w-4 h-4" />
                  Script & Settings
                </CardTitle>
                {/* This is a simple visual indicator for open/close */}
                <span class="text-white transform transition-transform" classList={{ "rotate-180": !showEditor() }}>
                  ▼
                </span>
              </div>
            </CardHeader>
            
            {/* Use SolidJS <Show> component to conditionally render the content */}
            <Show when={showEditor()}>
              <CardContent class="space-y-4">
                <Textarea
                  value={teleprompterText()}
                  onInput={(e) => setTeleprompterText(e.target.value)}
                  placeholder="Enter your script here..."
                  class="h-32 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                                      <div class="flex justify-between text-sm text-gray-300">
                    <span>Speed: {scrollSpeed()}x</span>
                  </div>
                    <Slider min={0.5} max={5} step={0.1} value={scrollSpeed()} onValueChange={setScrollSpeed} />
                  </div>
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm text-gray-300">
                      <span>Font: {fontSize()}px</span>
                    </div>
                    <Slider min={12} max={32} step={1} value={fontSize()} onValueChange={setFontSize} />
                  </div>
                </div>
              </CardContent>
            </Show>
          </Card>
        </Show>

      </div>
      
      {/* Desktop Layout - REVISED */}
      <div class="hidden lg:block p-6">
        <div class="grid grid-cols-2 gap-6">
        
          {/* Left Column - Teleprompter and Script Settings */}
          <div class="space-y-6">
          
            {/* Teleprompter Toggle Button */}
            <div class="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setShowTeleprompter(!showTeleprompter())}
                class="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                {showTeleprompter() ? "Hide Teleprompter" : "Show Teleprompter"}
              </Button>
            </div>
          
            {/* Teleprompter Preview Card */}
            <Show when={showTeleprompter()}>
              <Card class="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div class="flex items-center justify-between">
                    <CardTitle class="flex items-center gap-2 text-white">
                      <Type class="w-5 h-5" />
                      Teleprompter Preview
                    </CardTitle>
                    <div class="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => setIsRehearsing(prev => !prev)} class="text-gray-200 hover:text-white px-3 py-1 text-sm">
                        {isRehearsing() ? "Stop Rehearsal" : "Rehearse"}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={resetScroll} class="text-gray-400 hover:text-white">
                        <RotateCcw class="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div class="relative">
                    <div class="h-64 bg-black rounded-lg p-4 overflow-hidden" style={{ "font-size": `${fontSize()}px` }}>
                      <div class="text-white leading-relaxed transition-transform duration-100 whitespace-pre-wrap" style={{ transform: `translateY(-${scrollPosition()}px)` }}>
                        {teleprompterText()}
                      </div>
                    </div>
                    
                    {/* UPDATED Focus line with a help icon/tooltip */}
                    <div class="group absolute top-1/3 left-2 right-2 flex items-center">
                      <div class="h-px bg-orange-500 opacity-75 flex-grow"></div>
                      <HelpCircle class="w-4 h-4 text-gray-500 ml-2 flex-shrink-0" />

                      {/* The Tooltip itself */}
                      <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 border border-gray-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Keep your eyes here for a steady reading pace
                      </div>
                    </div>

                    {(isRecording() && !isPaused()) || isRehearsing() ? (
                      <Badge class="absolute bottom-2 right-2 bg-orange-600">
                        SCROLLING
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              
              {/* Script & Settings Card */}
              <Card class="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle class="flex items-center gap-2 text-white">
                  <Type class="w-5 h-5" />
                  Script & Settings
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <Textarea
                  value={teleprompterText()}
                  onInput={(e) => setTeleprompterText(e.target.value)}
                  placeholder="Enter your script here..."
                  class="h-40 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm text-gray-300">
                      <span>Scroll Speed: {scrollSpeed()}x</span>
                    </div>
                    <Slider min={0.5} max={5} step={0.1} value={scrollSpeed()} onValueChange={setScrollSpeed}/>
                  </div>
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm text-gray-300">
                      <span>Font Size: {fontSize()}px</span>
                    </div>
                    <Slider min={12} max={32} step={1} value={fontSize()} onValueChange={setFontSize} />
                  </div>
                </div>
              </CardContent>
            </Card>
            </Show>
          </div>
          
          {/* Right Column - Recording Controls (remains the same) */}
          {/* Recording Controls OR Preview (desktop right column) */}
          <Show when={!recordedUrl() || isRecording()} fallback={
            <Card class="bg-gray-800 border-gray-700 h-fit">
              <CardHeader>
                <CardTitle class="flex items-center gap-2 text-white">Preview</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <audio src={recordedUrl() ?? undefined} controls class="w-full" />
                <div class="flex gap-2">
                  <Button onClick={saveRecording} class="flex-1 bg-green-600 hover:bg-green-700">Save</Button>
                  <Button onClick={discardRecording} variant="outline" class="flex-1">Discard</Button>
                </div>
              </CardContent>
            </Card>
          }>
            <Card class="bg-gray-800 border-gray-700 h-fit">
              <CardHeader>
                <div class="flex items-center justify-between">
                  <CardTitle class="flex items-center gap-2 text-white">
                    <Mic class="w-5 h-5" />
                    Recording Controls
                  </CardTitle>
                  {/* Countdown Duration Dropdown */}
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-300">Countdown:</span>
                    <select 
                      value={countdownDuration()}
                      onChange={(e) => setCountdownDuration(parseInt(e.target.value, 10))}
                      class="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-sm"
                    >
                      <option value={2}>2s</option>
                      <option value={3}>3s</option>
                      <option value={4}>4s</option>
                      <option value={5}>5s</option>
                      <option value={6}>6s</option>
                      <option value={7}>7s</option>
                      <option value={8}>8s</option>
                      <option value={9}>9s</option>
                      <option value={10}>10s</option>
                      <option value={11}>11s</option>
                      <option value={12}>12s</option>
                      <option value={13}>13s</option>
                      <option value={14}>14s</option>
                      <option value={15}>15s</option>
                    </select>
                  </div>
                  
                  {/* Microphone Selection Dropdown */}
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-300">Mic:</span>
                    <select 
                      value={selectedMicId()}
                      onChange={(e) => setSelectedMicId(e.target.value)}
                      class="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-sm"
                    >
                      {availableMics().map(mic => (
                        <option value={mic.deviceId}>
                          {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="flex items-center justify-between">
                  <span class="text-gray-300">Status:</span>
                  <Badge variant={getStatusVariant()}>{getRecordingStatus()}</Badge>
                </div>
                <div class="text-center">
                  <div class="text-4xl font-mono text-white">{formatTime(recordingTime())}</div>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <Volume2 class="w-4 h-4 text-gray-400" />
                    <span class="text-sm text-gray-300">Audio Level</span>
                    <span class={`text-sm ${getLevelTextClass()}`}>• {getLevelTooltip()}</span>
                  </div>
                  <div class="h-4 bg-gray-700 rounded-full overflow-hidden" title={getDbTooltip(getCurrentDb())}>
                    <div class="h-full transition-all duration-100" style={{ width: `${audioLevel() * 100}%`, "background": getMeterBackground(getCurrentDb()) }} />
                  </div>
                </div>
                <div class="flex gap-2">
                  {!isRecording() ? (
                    <Button onClick={startRecording} class="flex-1 bg-orange-600 hover:bg-orange-700 text-lg py-6">
                      Start Recording
                    </Button>
                  ) : (
                    <>
                      <Button onClick={togglePause} variant="outline" class="flex-1">
                        {isPaused() ? <Play class="w-4 h-4" /> : <Pause class="w-4 h-4" />}
                        {isPaused() ? "Resume" : "Pause"}
                      </Button>
                      <Button onClick={stopRecording} variant="destructive" class="flex-1">
                        <Square class="w-4 h-4" />
                        Stop
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </Show>
        </div>
      </div>
      
      {/* Countdown Overlay */}
      <Show when={showCountdown()}>
        <div class="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 space-y-6">
          <div class="text-8xl font-bold text-white">{countdown()}</div>
          <Button 
            variant="outline" 
            onClick={cancelCountdown}
            class="bg-transparent border-white text-white hover:bg-white hover:text-black px-8 py-2 text-lg"
          >
            Cancel
          </Button>
        </div>
      </Show>
      

    </div>
  )
}