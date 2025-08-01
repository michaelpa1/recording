

# Voice ReGen - Recording Page

Welcome to the Voice ReGen Recording Studio, a professional recording tool designed for content creators who value quality and efficiency. This tool combines a high-fidelity audio recorder with a smart teleprompter, ensuring you can deliver your script flawlessly in any environment.


---

## Core Features

The recording page is built around a unified interface that adapts seamlessly between desktop and mobile devices. It provides everything you need to script, configure, record, and manage your audio from a single screen.

### 1. Recording Controls & Status

The heart of the page. This panel provides at-a-glance information and immediate control over your recording session.

* **Status Indicator**: A clear badge shows the current state of the recorder: `READY`, `RECORDING`, `PAUSED`, or `COUNTDOWN`.
* **Recording Timer**: A large, easy-to-read `MM:SS` timer tracks your recording duration.
* **Audio Level Meter**: A real-time visual meter shows the input volume from your microphone, helping you avoid clipping or recording too quietly.
* **Primary Controls**:
    * **Start Recording**: Initiates the recording process, starting with a customizable countdown.
    * **Pause/Resume**: Allows you to temporarily pause the recording and resume when ready.
    * **Stop**: Ends the recording session. The recorder then prompts you to either **Save** or **Discard** the take.

### 2. Integrated Teleprompter

The smart teleprompter is designed to make your delivery smooth and natural, keeping your eyes engaged with the camera.

* **Script Editor**: A dedicated text area where you can write, paste, and edit your script directly on the recording page.
* **Live Preview**: The teleprompter preview displays your script in a clean, readable format. It automatically begins scrolling when you start recording.
* **Focus Line**: A subtle, semi-transparent horizontal line is overlaid on the preview screen. This visual guide helps you keep your reading pace steady and maintain focus on the current line. A tooltip explains its purpose to new users.

* **Customizable Controls**:
    * **Scroll Speed**: A slider allows you to adjust how fast the text scrolls to match your natural speaking pace.
    * **Font Size**: Increase or decrease the text size for optimal readability from any distance.
    * **Reset Scroll**: Instantly returns the teleprompter script to the beginning.

### 3. Settings & Configuration

A centralized settings modal gives you fine-grained control over your recording setup, ensuring professional-quality results every time.

* **Microphone Selection**: Choose your desired audio input from a dropdown list of all available devices. This is crucial for users with multiple microphones (e.g., built-in, USB, Bluetooth) to confirm the correct one is active.
* **Countdown Timer Control**:
    * **Enable/Disable**: You can turn the pre-roll countdown on or off entirely. If disabled, recording starts instantly.
    * **Adjustable Duration**: Set the countdown length to any number of seconds (e.g., 3, 5, or 10) to give yourself the perfect amount of time to prepare.
    * **Cancel Function**: If you start the countdown and need to stop, a **Cancel** button on the overlay lets you immediately abort the recording before it begins.

I've also made it available on mobile, because there will be users who want to use one microphone while they also might have their AirPods connected or some other connective reason, so this way they get to chose what they record through.

---

## 📱 Responsive Design

The entire recording page is designed with a mobile-first approach to ensure a seamless experience on any device.

* **Desktop Layout**: A spacious two-column layout places the teleprompter and script editor on the left and the dedicated recording controls on the right.
* **Mobile Layout**: On smaller screens, the layout intelligently stacks into a single, scrollable column. The **Teleprompter** and **Recording Controls** are prioritized at the top for easy access during a recording session, while the **Script & Settings** are tucked into a collapsible panel at the bottom to save space. The settings cog is available on mobile to provide the same level of control and confirmation as the desktop experience.

This ensures that all features are fully accessible and useful, whether you're at your desk or recording on the go.
```