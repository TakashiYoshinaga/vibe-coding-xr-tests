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
        // Add event listeners for squeeze events (controller triggers)
        if (!this.controller1.userData.hasEventListeners) {
            this.controller1.addEventListener('selectstart', () => {
                // Right controller - scale up (zoom in)
                this.solarSystem.scale.multiplyScalar(1.01);
            });
            this.controller1.userData.hasEventListeners = true;
        }
        
        if (!this.controller2.userData.hasEventListeners) {
            this.controller2.addEventListener('selectstart', () => {
                // Left controller - scale down (zoom out)
                this.solarSystem.scale.multiplyScalar(0.99);
            });
            this.controller2.userData.hasEventListeners = true;
        }
    }
    
    // Handler for VR session start
    onVRSessionStart() {
        // Store original scale and position for restoration when exiting VR
        this.originalScale.copy(this.solarSystem.scale);
        this.originalPosition.copy(this.solarSystem.position);
        
        // Scale down the solar system for a bird's-eye view
        this.solarSystem.scale.set(0.2, 0.2, 0.2);
        
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