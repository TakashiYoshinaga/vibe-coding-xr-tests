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
        
        // XR Mode state management
        this.isARMode = false; // false = VR mode, true = AR mode
        this.lastTriggerState = { 0: false, 1: false }; // Use controller index instead of handedness
        
        // Add visual feedback for mode switching
        this.modeIndicator = null;
        this.createModeIndicator();
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
        
        // Add simple visual ray to controllers for debugging
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        
        const ray1 = new THREE.Line(rayGeometry, rayMaterial);
        const ray2 = new THREE.Line(rayGeometry, rayMaterial.clone());
        
        this.controller1.add(ray1);
        this.controller2.add(ray2);
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
            const inputSources = session.inputSources;
            
            // Process each controller by index
            for (let i = 0; i < inputSources.length; i++) {
                const inputSource = inputSources[i];
                
                if (inputSource && inputSource.gamepad) {
                    const gamepad = inputSource.gamepad;
                    const axes = gamepad.axes;
                    const buttons = gamepad.buttons;
                    
                    // Debug: Log button states
                    if (buttons.length > 0 && buttons[0].value > 0.5) {
                        console.log(`Controller ${i} - Trigger value: ${buttons[0].value}`);
                    }
                    
                    // Check trigger button (index 0 for Meta Quest)
                    if (buttons && buttons.length > 0) {
                        const triggerValue = buttons[0].value;
                        const triggerPressed = triggerValue > 0.9; // Use threshold for full press
                        
                        // Check if this is a new press (not held)
                        if (triggerPressed && !this.lastTriggerState[i]) {
                            console.log(`✅ Trigger NEW PRESS on controller ${i}`);
                            this.toggleXRMode();
                        }
                        
                        // Update last state
                        this.lastTriggerState[i] = triggerPressed;
                    }
                    
                    // Handle joystick for scaling (existing code)
                    if (axes && axes.length >= 2) {
                        const handedness = inputSource.handedness || 'unknown';
                        let joystickY = 0;
                        
                        // For Meta Quest, try different axis configurations
                        if (handedness === 'left' || i === 0) {
                            // Left controller typically uses axes[1]
                            joystickY = axes[1];
                        } else if (handedness === 'right' || i === 1) {
                            // Right controller might use axes[3]
                            if (axes.length > 3) {
                                joystickY = axes[3];
                            } else {
                                joystickY = axes[1];
                            }
                        }
                        
                        // Apply deadzone to prevent accidental input
                        const deadzone = 0.2;
                        
                        if (Math.abs(joystickY) > deadzone) {
                            // Calculate scale change based on joystick position
                            const scaleRate = 0.01;
                            const scaleChange = -joystickY * scaleRate;
                            
                            // Apply scaling
                            const currentScale = this.solarSystem.scale.x;
                            const newScale = currentScale * (1 + scaleChange);
                            
                            // Clamp to reasonable limits
                            const minScale = 0.01;
                            const maxScale = 2.0;
                            const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
                            
                            this.solarSystem.scale.setScalar(clampedScale);
                        }
                    }
                }
            }
        }
    }
    
    // XRモード切り替え関数
    toggleXRMode() {
        this.isARMode = !this.isARMode;
        console.log(`🔄 XR Mode switched to: ${this.isARMode ? 'AR' : 'VR'}`);
        
        // モードに応じて太陽系の表示設定を変更
        this.updateSolarSystemForMode();
        
        // UIの更新
        this.updateModeDisplay();
        
        // Show mode indicator briefly
        this.showModeIndicator();
    }
    
    // モードに応じた太陽系の設定更新
    updateSolarSystemForMode() {
        // Smooth transition animation
        const targetScale = this.isARMode ? 0.02 : 0.2;
        const targetPosition = this.isARMode ? 
            new THREE.Vector3(0, -0.3, -0.5) : 
            new THREE.Vector3(0, 0, 0);
        
        // Simple immediate update (you could add tweening here for smooth transitions)
        this.solarSystem.scale.setScalar(targetScale);
        this.solarSystem.position.copy(targetPosition);
        
        console.log(`${this.isARMode ? '📱 AR' : '🥽 VR'} Mode: Scale=${targetScale}, Position=${targetPosition.toArray()}`);
    }
    
    // モード表示の更新
    updateModeDisplay() {
        // ここで画面上のモード表示を更新することができます
        // 将来的にはVR空間内にテキストを表示することも可能
        console.log(`Current XR Mode: ${this.isARMode ? 'AR (Augmented Reality)' : 'VR (Virtual Reality)'}`);
    }

    // Handler for VR session start
    onVRSessionStart() {
        // Store original scale and position for restoration when exiting VR
        this.originalScale.copy(this.solarSystem.scale);
        this.originalPosition.copy(this.solarSystem.position);
        
        // 初期状態に基づいて設定を適用
        this.updateSolarSystemForMode();
    }
    
    // Handler for VR session end
    onVRSessionEnd() {
        // Restore original scale and position
        this.solarSystem.scale.copy(this.originalScale);
        this.solarSystem.position.copy(this.originalPosition);
    }
    
    createModeIndicator() {
        // Create a 3D text sprite to indicate the current mode
        const loader = new THREE.FontLoader();
        loader.load('fonts/helvetiker_regular.typeface.json', (font) => {
            const textGeometry = new THREE.TextGeometry('Mode: VR', {
                font: font,
                size: 0.1,
                height: 0.01,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.005,
                bevelSize: 0.005,
                bevelOffset: 0,
                bevelSegments: 5
            });
            
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            this.modeIndicator = new THREE.Mesh(textGeometry, textMaterial);
            
            // Position it in front of the camera
            this.modeIndicator.position.set(0, 0, -1);
            this.modeIndicator.visible = false; // Initially hidden
            
            this.scene.add(this.modeIndicator);
        });
    }
    
    showModeIndicator() {
        if (this.modeIndicator && this.renderer.xr.isPresenting) {
            // Get XR camera
            const xrCamera = this.renderer.xr.getCamera();
            
            // Position indicator in front of camera
            const offset = new THREE.Vector3(0, 0, -1.5); // 1.5 meters in front
            offset.applyQuaternion(xrCamera.quaternion);
            
            this.modeIndicator.position.copy(xrCamera.position).add(offset);
            this.modeIndicator.position.y += 0.2; // Slightly above center
            
            // Show the indicator
            this.modeIndicator.visible = true;
            
            // Hide after 2 seconds
            clearTimeout(this.modeIndicatorTimeout);
            this.modeIndicatorTimeout = setTimeout(() => {
                if (this.modeIndicator) {
                    this.modeIndicator.visible = false;
                }
            }, 2000);
        }
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