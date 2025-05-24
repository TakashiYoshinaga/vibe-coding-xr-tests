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

        // Remove existing VR button if present (safety)
        const oldVRButton = document.getElementById('VRButton');
        if (oldVRButton) oldVRButton.remove();

        // Add VR button to document (let three.js handle it)
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
        this.lastTriggerState = [false, false]; // index-based for controllers
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

        // Remove selectstart event listeners (handled in processVRInput)
        // this.controller1.addEventListener('selectstart', () => {
        //     this.toggleXRMode();
        // });
        // this.controller2.addEventListener('selectstart', () => {
        //     this.toggleXRMode();
        // });
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
            
            // Process each controller by index
            inputSources.forEach((inputSource, idx) => {
                if (inputSource.gamepad) {
                    const gamepad = inputSource.gamepad;
                    const axes = gamepad.axes;
                    const buttons = gamepad.buttons;
                    
                    // Trigger button state (Meta Quest: buttons[0])
                    if (buttons && buttons.length > 0) {
                        const triggerPressed = buttons[0].pressed;
                        if (triggerPressed && !this.lastTriggerState[idx]) {
                            this.toggleXRMode();
                            console.log(`Trigger pressed on controller ${idx} - Toggling VR/AR mode`);
                        }
                        this.lastTriggerState[idx] = triggerPressed;
                    }
                    
                    // Check if the controller has joystick input (axes data)
                    if (axes && axes.length >= 2) {
                        // Quest3 での軸配置を詳細にデバッグ
                        let joystickY = 0;
                        let axisUsed = -1;
                        
                        // デバッグ: 全ての軸の値を表示
                        if (handedness === 'right') {
                            console.log(`Right Controller Axes: [${axes.map((v, i) => `${i}:${v.toFixed(2)}`).join(', ')}]`);
                            
                            // Quest3での右コントローラーの軸パターンを試す
                            // パターン1: axes[3] (一般的なQuest3右ジョイスティックY軸)
                            if (axes.length > 3 && Math.abs(axes[3]) > 0.1) {
                                joystickY = axes[3];
                                axisUsed = 3;
                            }
                            // パターン2: axes[1] (標準的なY軸)
                            else if (Math.abs(axes[1]) > 0.1) {
                                joystickY = axes[1];
                                axisUsed = 1;
                            }
                            // パターン3: axes[5] (一部のQuest3での配置)
                            else if (axes.length > 5 && Math.abs(axes[5]) > 0.1) {
                                joystickY = axes[5];
                                axisUsed = 5;
                            }
                        } else if (handedness === 'left') {
                            console.log(`Left Controller Axes: [${axes.map((v, i) => `${i}:${v.toFixed(2)}`).join(', ')}]`);
                            
                            // 左コントローラーは動作しているので既存のロジックを保持
                            if (Math.abs(axes[1]) > 0.1) {
                                joystickY = axes[1];
                                axisUsed = 1;
                            } else if (axes.length > 3 && Math.abs(axes[3]) > 0.1) {
                                joystickY = axes[3];
                                axisUsed = 3;
                            }
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
                            
                            // Enhanced debug output
                            console.log(`✅ VR Joystick ACTIVE: Hand=${handedness}, Axis=${axisUsed}, Y=${joystickY.toFixed(2)}, Scale=${clampedScale.toFixed(2)}`);
                        }
                    }
                }
            });
        }
    }
    
    // XRモード切り替え関数
    toggleXRMode() {
        this.isARMode = !this.isARMode;
        console.log(`XR Mode switched to: ${this.isARMode ? 'AR' : 'VR'}`);
        
        // モードに応じて太陽系の表示設定を変更
        this.updateSolarSystemForMode();
        
        // UIの更新
        this.updateModeDisplay();
    }
    
    // モードに応じた太陽系の設定更新
    updateSolarSystemForMode() {
        if (this.isARMode) {
            // ARモード: 小さくして手の前に配置
            this.solarSystem.scale.set(0.05, 0.05, 0.05);
            this.solarSystem.position.set(0, -0.2, -0.8); // より近く、少し下に
        } else {
            // VRモード: 中程度のサイズで目の前に配置
            this.solarSystem.scale.set(0.1, 0.1, 0.1);
            this.solarSystem.position.set(0, -0.5, -2); // 2メートル前、少し下に
        }
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