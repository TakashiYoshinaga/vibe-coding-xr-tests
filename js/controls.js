import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class Controls {
    constructor(camera, renderer, domElement, scene, solarSystem) {
        this.camera = camera;
        this.renderer = renderer;
        this.domElement = domElement;
        this.scene = scene;
        this.solarSystem = solarSystem;
        
        // Non-VR controls
        this.orbitControls = new OrbitControls(camera, domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.screenSpacePanning = false;
        this.orbitControls.minDistance = 10;
        this.orbitControls.maxDistance = 500;
        this.orbitControls.target.set(0, 0, 0);
        this.orbitControls.enableRotate = true; // Ensure mouse look-around is enabled
        
        // Configure mouse controls to work with left click
        this.orbitControls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        
        // Ensure the DOM element can receive mouse events
        this.domElement.style.touchAction = 'none';
        
        // Keyboard controls state
        this.keysPressed = {};
        this.moveSpeed = 0.5;
        
        // Setup WebXR
        this.setupVR();
        
        // Setup keyboard event listeners
        this.setupKeyboardControls();
    }
    
    setupVR() {
        // Enable WebXR
        this.renderer.xr.enabled = true;
        
        // Add VR button to document
        document.body.appendChild(VRButton.createButton(this.renderer));
        
        // Setup VR controllers
        this.setupVRControllers();
        
        // Add session listeners to handle VR mode transitions
        this.renderer.xr.addEventListener('sessionstart', this.onVRSessionStart.bind(this));
        this.renderer.xr.addEventListener('sessionend', this.onVRSessionEnd.bind(this));
        
        // Store original scale and position for restoration when exiting VR
        this.originalScale = new THREE.Vector3();
        this.originalPosition = new THREE.Vector3();
    }
    
    setupVRControllers() {
        this.controller1 = this.renderer.xr.getController(0);
        this.controller2 = this.renderer.xr.getController(1);
        
        this.scene.add(this.controller1);
        this.scene.add(this.controller2);
        
        // Setup controller models
        const controllerModelFactory = new XRControllerModelFactory();
        
        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
        this.scene.add(this.controllerGrip1);
        
        this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        this.controllerGrip2.add(controllerModelFactory.createControllerModel(this.controllerGrip2));
        this.scene.add(this.controllerGrip2);
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            this.keysPressed[event.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (event) => {
            this.keysPressed[event.key.toLowerCase()] = false;
        });
    }
    
    update() {
        // Process keyboard movement
        this.processKeyboardInput();
        
        // Update orbit controls
        this.orbitControls.update();
        
        // Process VR input if in VR mode
        if (this.renderer.xr.isPresenting) {
            this.processVRInput();
        }
    }
    
    processKeyboardInput() {
        // WASD movement
        if (this.keysPressed['w']) {
            this.camera.position.addScaledVector(this.getForwardVector(), this.moveSpeed);
        }
        if (this.keysPressed['s']) {
            this.camera.position.addScaledVector(this.getForwardVector(), -this.moveSpeed);
        }
        if (this.keysPressed['a']) {
            this.camera.position.addScaledVector(this.getRightVector(), -this.moveSpeed);
        }
        if (this.keysPressed['d']) {
            this.camera.position.addScaledVector(this.getRightVector(), this.moveSpeed);
        }
        
        // Q/E for up/down
        if (this.keysPressed['q']) {
            this.camera.position.y -= this.moveSpeed;
        }
        if (this.keysPressed['e']) {
            this.camera.position.y += this.moveSpeed;
        }
    }
    
    getForwardVector() {
        const vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(this.camera.quaternion);
        return vector;
    }
    
    getRightVector() {
        // Create a vector pointing to the right (x-axis)
        const vector = new THREE.Vector3(1, 0, 0);
        // Apply camera's quaternion to transform it to camera's local space
        vector.applyQuaternion(this.camera.quaternion);
        // Make sure the vector is perpendicular to world up (y-axis) to ensure horizontal movement
        vector.y = 0;
        vector.normalize();
        return vector;
    }
    
    processVRInput() {
        // Get gamepad data for joystick input
        const session = this.renderer.xr.getSession();
        
        if (session) {
            const inputSources = Array.from(session.inputSources);
            
            // Process each controller with joystick
            inputSources.forEach(inputSource => {
                if (inputSource.gamepad) {
                    const gamepad = inputSource.gamepad;
                    const axes = gamepad.axes;
                    
                    // Check if the controller has joystick input (axes data)
                    if (axes && axes.length >= 2) {
                        // For Meta Quest controllers:
                        // Right controller: axes[0] = X, axes[1] = Y (primary joystick)
                        // Left controller: axes[2] = X, axes[3] = Y (secondary joystick) 
                        
                        let joystickY = 0;
                        
                        // Try different axis configurations based on controller
                        if (inputSource.handedness === 'right') {
                            // Right controller - use primary joystick Y-axis
                            joystickY = axes[1] || 0;
                        } else if (inputSource.handedness === 'left') {
                            // Left controller - try both primary and secondary Y-axis
                            joystickY = axes[1] || axes[3] || 0;
                        } else {
                            // Fallback: try first available Y-axis
                            joystickY = axes[1] || 0;
                        }
                        
                        // Apply deadzone to prevent accidental input
                        const deadzone = 0.2;
                        
                        if (Math.abs(joystickY) > deadzone) {
                            // Calculate scale change based on joystick position
                            // Forward (negative value) = zoom in (enlarge)
                            // Backward (positive value) = zoom out (shrink)
                            const scaleRate = 0.01; // Slower, more controlled scaling
                            const scaleChange = -joystickY * scaleRate; // Negative to invert direction
                            
                            // Apply scaling
                            const currentScale = this.solarSystem.scale.x;
                            const newScale = currentScale * (1 + scaleChange);
                            
                            // Clamp to reasonable limits
                            const minScale = 0.01;
                            const maxScale = 2.0;
                            const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
                            
                            this.solarSystem.scale.setScalar(clampedScale);
                            
                            // Debug output (remove in production)
                            console.log(`VR Joystick: Y=${joystickY.toFixed(2)}, Scale=${clampedScale.toFixed(2)}, Hand=${inputSource.handedness}`);
                        }
                    }
                }
            });
        }
    }
    
    // Handler for VR session start
    onVRSessionStart() {
        // Store original scale and position for restoration when exiting VR
        this.originalScale.copy(this.solarSystem.scale);
        this.originalPosition.copy(this.solarSystem.position);
        
        // Scale down the solar system for a bird's-eye view
        // Reduced scale to half of the previous value (from 0.2 to 0.1) for more comfortable viewing
        this.solarSystem.scale.set(0.1, 0.1, 0.1);
        
        // In VR, reset the solar system to a position directly in front of the user
        // Use a fixed position relative to the VR camera's initial forward direction
        
        // Position the solar system directly in front of the user and slightly below eye level
        this.solarSystem.position.set(0, -0.5, -2); // 2 meters forward, 0.5 meters below eye level
    }
    
    // Handler for VR session end
    onVRSessionEnd() {
        // Restore original scale and position
        this.solarSystem.scale.copy(this.originalScale);
        this.solarSystem.position.copy(this.originalPosition);
    }
    
    dispose() {
        this.orbitControls.dispose();
        
        // We should use the same functions for cleanup to properly remove them
        document.removeEventListener('keydown', (event) => {
            this.keysPressed[event.key.toLowerCase()] = true;
        });
        
        document.removeEventListener('keyup', (event) => {
            this.keysPressed[event.key.toLowerCase()] = false;
        });
    }
}