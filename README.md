# Solar System Viewer - WebXR Application

An interactive 3D Solar System Viewer built with A-Frame that works in both VR mode (Meta Quest) and desktop browsers.

## Features

- **WebXR Compatible**: Works on VR devices like Meta Quest and standard desktop browsers
- **Celestial Mechanics**: Accurately models planetary rotation and revolution
- **Interactive Controls**:
  - **VR Mode**: Use the right joystick for zooming in/out
  - **Desktop Mode**: WASD + QE for movement, mouse for camera control
- **Visual Elements**:
  - Sun with emissive lighting
  - 8 planets with unique colors and relative sizes
  - Orbital paths visualization
  - Saturn with rings
  - Star background for immersion

## Controls

### VR Mode (Meta Quest)
- Push right joystick forward: Zoom in (scale up)
- Pull right joystick backward: Zoom out (scale down)
- Use standard VR controller movement

### Desktop Mode
- W/S: Move forward/backward
- A/D: Move left/right
- Q/E: Move up/down
- Mouse: Look around

## Technical Implementation

The application uses:
- **A-Frame**: WebXR framework for 3D/VR content
- **ES6 Modules**: Organized component structure
- **Custom Components**:
  - `planet-motion`: Handles rotation and orbital mechanics
  - `vr-zoom`: Implements VR controller zoom functionality
  - `stars`: Creates the background star system

## Usage

Simply open `index.html` in a WebXR-compatible browser. For VR mode, use a device like Meta Quest and click the "Enter VR" button.