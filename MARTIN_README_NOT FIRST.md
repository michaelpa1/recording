# Instructions: Integrating the Teleprompter Recorder

## Goal

The objective is to replace the current UI and logic of the `audio-recorder.tsx` component with the new, feature-rich version that includes an integrated teleprompter, responsive layouts, and advanced recording controls.

This involves a "heart transplant": we will replace the existing recording logic and UI with new files that encapsulate this functionality.

## Required Files

You will need the following files from Michael's development branch to complete this integration:

1.  **The new UI Component**: `src/Record.tsx` (This is the file containing the teleprompter and new layout).
2.  **The new Logic Manager**: `src/components/recorder/recorder-manager.ts` (This is the new, centralized logic that the `Record.tsx` component depends on).
3.  **UI Primitives**: The new `Record.tsx` component uses a set of UI components (like `<Card>`, `<Button>`, `<Slider>`). You will need to either copy these from a `/src/ui/` directory or, preferably, adapt the code to use the existing `@suid/material` components from the main project for consistency.

## Step-by-Step Instructions

### Step 1: Backup Existing Files

Before making any changes, please create a backup of your existing files so you can revert if needed:
- `src/components/recorder/audio-recorder.tsx`
- `src/components/recorder/recorder-manager.ts`

### Step 2: Replace the Core Files

1.  **Replace the Recorder Component:**
    - Take the entire content of Michael's `Record.tsx` file.
    - Use it to **completely replace** the content of your existing `src/components/recorder/audio-recorder.tsx` file. You may need to rename the exported component at the bottom from `Record` to `AudioRecorder` to match the old filename.

2.  **Replace the Recorder Logic:**
    - Take the entire content of Michael's `recorder-manager.ts` file.
    - Use it to **completely replace** the content of your existing `src/components/recorder/recorder-manager.ts` file.

### Step 3: Resolve Dependencies & Adapt UI

After replacing the files, the app will likely have errors due to different dependencies. This step is crucial for making the new component work within the existing project.

1.  **UI Components (`<Card>`, `<Button>`, etc.):**
    - The new recorder uses custom UI components. The main project uses `@suid/material`.
    - **Action:** Go through the new `audio-recorder.tsx` file and replace the custom components with their SUID equivalents.
        - Replace `<Card>` with `<Paper>`.
        - Replace `<Button>` with `<MuiButton>`.
        - Replace `<Slider>` with `<MuiSlider>`.
        - Replace `<Textarea>` with a multiline `<TextField>`.
    - You will need to adapt the styling from Tailwind CSS `class="..."` props to SUID's `sx={{ ... }}` prop for styling.

2.  **Icons (`lucide-solid`):**
    - The new recorder uses icons from the `lucide-solid` library.
    - **Action:** Either add `lucide-solid` as a project dependency (`npm install lucide-solid`) or replace the icons with equivalent icons from your existing assets or SUID.

3.  **Global Store (`voice-regen.store.ts`):**
    - The new `recorder-manager.ts` makes calls to a global store, for example: `voiceRegen.listNewRecording(audioFile)`.
    - **Action:** Please verify that these function calls match the methods available in your project's `voice-regen.store.ts` file. You may need to update the names or logic slightly to match.

### Step 4: Verify Routing

The `audio-recorder.tsx` component is loaded via the router in `src/components/layout/body.tsx`. No changes should be needed here, but please ensure the component still loads correctly at the `/record` path.

### Step 5: Final Testing

Once all dependencies are resolved and the code compiles, please test the following features thoroughly:
- Microphone permission request flow.
- Recording, pausing, resuming, and stopping.
- Saving a recording and seeing it appear in the file list.
- The countdown timer functionality (including cancellation).
- The teleprompter's script editor and controls (font size, speed).
- The responsive layout on both desktop and mobile screen sizes.

---

This process will successfully integrate the new, advanced recorder into the main application, providing a unified and feature-rich user experience.