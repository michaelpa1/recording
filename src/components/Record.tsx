import { Component, createSignal, createEffect, onCleanup, Show } from "solid-js"
import { Mic, Type, Play, Pause, Square, RotateCcw, Volume2, Settings, X, HelpCircle } from "lucide-solid"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Slider } from "./ui/slider"
import { Textarea } from "./ui/textarea"

export const Record: Component = () => {
  // Recording state
  const [isRecording, setIsRecording] = createSignal(false)
  const [isPaused, setIsPaused] = createSignal(false)
  const [recordingTime, setRecordingTime] = createSignal(0)
  const [audioLevel, setAudioLevel] = createSignal(0)
  const [recordingFormat, setRecordingFormat] = createSignal("WAV")
  const [showCountdown, setShowCountdown] = createSignal(false)
  const [countdown, setCountdown] = createSignal(3)
  
  // Teleprompter state
  const [teleprompterText, setTeleprompterText] = createSignal("Welcome to Waves Voice ReGen! Type your script in the teleprompter tab to see it here while you record.")
  const [isScrolling, setIsScrolling] = createSignal(false)
  const [scrollSpeed, setScrollSpeed] = createSignal(1)
  const [fontSize, setFontSize] = createSignal(16)
  const [scrollPosition, setScrollPosition] = createSignal(0)
  const [showEditor, setShowEditor] = createSignal(true) // Default to true so you can see the editor initially
  const [showSettingsModal, setShowSettingsModal] = createSignal(false)
  const [availableMics, setAvailableMics] = createSignal<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = createSignal("")
  // Add these two new signals for countdown settings
  const [countdownEnabled, setCountdownEnabled] = createSignal(true)
  const [countdownDuration, setCountdownDuration] = createSignal(3)
  
  // Media recording
  let mediaRecorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let recordingInterval: number | null = null
  let scrollInterval: number | null = null
  let countdownInterval: number | null = null
  
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
      const constraints = { 
        audio: selectedMicId() ? { deviceId: { exact: selectedMicId() } } : true 
      }
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Set up audio analysis
      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(mediaStream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      
      // Check if the countdown is enabled before starting it
      if (countdownEnabled()) {
        setShowCountdown(true)
        setCountdown(countdownDuration()) // Use our new state for the duration
        
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
      } else {
        // If countdown is disabled, start recording immediately
        startActualRecording()
      }
      
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }
  
  // Start actual recording after countdown
  const startActualRecording = () => {
    if (!mediaStream) return
    
    const chunks: Blob[] = []
    mediaRecorder = new MediaRecorder(mediaStream)
    
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data)
    }
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: `audio/${recordingFormat().toLowerCase()}` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${recordingFormat().toLowerCase()}`
      a.click()
      URL.revokeObjectURL(url)
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
    cleanupMedia()
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
  }
  
  // Monitor audio levels
  createEffect(() => {
    if (analyser && isRecording() && !isPaused()) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser!.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
      };
      const levelInterval = setInterval(updateLevel, 100);
      
      // onCleanup runs when the effect re-runs or the component unmounts
      onCleanup(() => {
        clearInterval(levelInterval);
        setAudioLevel(0); // Reset level here
      });
    } else {
      // Also reset the level if not recording or if paused
      setAudioLevel(0);
    }
  });
  
  // Auto-scroll teleprompter
  createEffect(() => {
    if (isRecording() && !isPaused()) {
      scrollInterval = setInterval(() => {
        setScrollPosition(prev => prev + scrollSpeed())
      }, 100)
    } else if (scrollInterval) {
      clearInterval(scrollInterval)
      scrollInterval = null
    }
  })
  
  // Enumerate microphones when settings modal opens
  createEffect(() => {
    if (showSettingsModal()) {
      enumerateMicrophones()
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
  
  // Clean up on unmount
  onCleanup(() => {
    if (recordingInterval) clearInterval(recordingInterval)
    if (scrollInterval) clearInterval(scrollInterval)
    if (countdownInterval) clearInterval(countdownInterval)
    cleanupMedia()
  })
  
  return (
    <div class="min-h-screen bg-gray-900">
            {/* Mobile Layout - REVISED */}
      <div class="block lg:hidden p-4 space-y-4">

        {/* 1. Teleprompter Preview */}
        <Card class="bg-gray-800 border-gray-700">
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle class="flex items-center gap-2 text-white text-sm">
                <Type class="w-4 h-4" />
                Teleprompter
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={resetScroll} class="text-gray-400 hover:text-white">
                <RotateCcw class="w-4 h-4" />
              </Button>
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
              
              {isRecording() && !isPaused() && (
                <Badge class="absolute bottom-2 right-2 bg-orange-600">
                  SCROLLING
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Recording Controls */}
        <Card class="bg-gray-800 border-gray-700">
          <CardContent class="space-y-4 pt-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-gray-300">Status:</span>
                <Badge variant={getStatusVariant()}>{getRecordingStatus()}</Badge>
              </div>
              
              {/* ADD THIS BUTTON FOR MOBILE SETTINGS */}
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => setShowSettingsModal(true)}
                class="text-gray-400 hover:text-white"
              >
                <Settings class="w-5 h-5" />
              </Button>
            </div>
            <div class="text-center">
              <div class="text-2xl font-mono text-white">{formatTime(recordingTime())}</div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Volume2 class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-300">Audio Level</span>
              </div>
              <div class="h-4 bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-green-500 transition-all duration-100" style={{ width: `${audioLevel() * 100}%` }} />
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
        
        {/* 3. Collapsible Script Editor & Settings */}
        <Card class="bg-gray-800 border-gray-700">
          <CardHeader class="cursor-pointer" onClick={() => setShowEditor(!showEditor())}>
            <div class="flex items-center justify-between">
              <CardTitle class="flex items-center gap-2 text-white text-sm">
                <Settings class="w-4 h-4" />
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

      </div>
      
      {/* Desktop Layout - REVISED */}
      <div class="hidden lg:block p-6">
        <div class="grid grid-cols-2 gap-6">
        
          {/* Left Column - Teleprompter and Script Settings */}
          <div class="space-y-6">
          
            {/* Teleprompter Preview Card */}
            <Card class="bg-gray-800 border-gray-700">
              <CardHeader>
                <div class="flex items-center justify-between">
                  <CardTitle class="flex items-center gap-2 text-white">
                    <Type class="w-5 h-5" />
                    Teleprompter Preview
                  </CardTitle>
                  <Button size="icon" variant="ghost" onClick={resetScroll} class="text-gray-400 hover:text-white">
                    <RotateCcw class="w-4 h-4" />
                  </Button>
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

                  {isRecording() && !isPaused() && (
                    <Badge class="absolute bottom-2 right-2 bg-orange-600">
                      SCROLLING
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* UPDATED: Script & Settings Card */}
            <Card class="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle class="flex items-center gap-2 text-white">
                  <Settings class="w-5 h-5" />
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
          </div>
          
          {/* Right Column - Recording Controls (remains the same) */}
          <Card class="bg-gray-800 border-gray-700 h-fit">
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle class="flex items-center gap-2 text-white">
                  <Mic class="w-5 h-5" />
                  Recording Controls
                </CardTitle>
                {/* Settings Button for Desktop */}
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => setShowSettingsModal(true)}
                  class="text-gray-400 hover:text-white"
                >
                  <Settings class="w-4 h-4" />
                </Button>
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
                </div>
                <div class="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-green-500 transition-all duration-100" style={{ width: `${audioLevel() * 100}%` }}/>
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
      
      {/* Settings Modal */}
      <Show when={showSettingsModal()}>
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96 max-w-[90vw]">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Settings</h3>
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => setShowSettingsModal(false)}
                class="text-gray-400 hover:text-white"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>
            
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-sm text-gray-300">Microphone</label>
                <select 
                  value={selectedMicId()}
                  onChange={(e) => setSelectedMicId(e.target.value)}
                  class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                >
                  {availableMics().map(mic => (
                    <option value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>

              {/* ADD THIS NEW SECTION for Countdown Settings */}
              <div class="space-y-2">
                <label class="text-sm text-gray-300">Countdown Timer</label>
                <div class="flex items-center justify-between bg-gray-700 rounded-md p-3">
                  <span class="text-white font-medium">Enable Countdown</span>
                  <input 
                    type="checkbox"
                    checked={countdownEnabled()}
                    onChange={(e) => setCountdownEnabled(e.currentTarget.checked)}
                    class="h-5 w-5 rounded border-gray-500 bg-gray-600 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <Show when={countdownEnabled()}>
                  <div class="flex items-center justify-between bg-gray-700 rounded-md p-3">
                    <span class="text-white font-medium">Duration (seconds)</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="10"
                      value={countdownDuration()}
                      onInput={(e) => setCountdownDuration(parseInt(e.currentTarget.value, 10))}
                      class="w-20 bg-gray-600 border border-gray-500 rounded-md px-2 py-1 text-white text-center"
                    />
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}