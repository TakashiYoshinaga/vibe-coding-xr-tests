/**
 * Solar System Components for A-Frame
 * This file contains custom components for the Solar System Viewer
 */

// =====================================
// INDEPENDENT DEBUG SYSTEM
// Comment out this entire section to disable all debug functionality
// =====================================

// Global Debug Manager - handles all debug functionality independently
AFRAME.registerComponent('debug-manager', {
    init: function() {
        // Only one debug manager should exist
        if (window.VR_DEBUG_MANAGER) {
            return;
        }
        window.VR_DEBUG_MANAGER = this;
        
        this.debugMessages = [];
        this.isVR = false;
        this.debugEntity = null;
        
        // Create debug displays immediately
        this.createDesktopDebug();
        this.addDebugMessage('Debug Manager initialized');
        
        // Create VR debug display after a delay
        setTimeout(() => {
            this.createVRDebugDisplay();
        }, 1000);
        
        // Listen for VR mode changes
        this.el.sceneEl.addEventListener('enter-vr', () => {
            this.isVR = true;
            this.addDebugMessage('Entered VR mode');
        });
        
        this.el.sceneEl.addEventListener('exit-vr', () => {
            this.isVR = false;
            this.addDebugMessage('Exited VR mode');
        });
          // Set up controller monitoring with delay to ensure controllers exist
        setTimeout(() => {
            this.setupControllerMonitoring();
        }, 1500);
        
        // Set up gamepad polling for direct input detection
        this.setupGamepadMonitoring();
    },
    setupControllerMonitoring: function() {
        // Monitor both controllers
        const leftController = document.getElementById('left-controller');
        const rightController = document.getElementById('right-controller');
        
        if (leftController) {
            this.monitorController(leftController, 'L');
        }
        
        if (rightController) {
            this.monitorController(rightController, 'R');
        }
        
        // Also monitor global gamepad events
        window.addEventListener('gamepadconnected', (evt) => {
            this.addDebugMessage(`Gamepad connected: ${evt.gamepad.id}`);
        });
        
        window.addEventListener('gamepaddisconnected', (evt) => {
            this.addDebugMessage(`Gamepad disconnected: ${evt.gamepad.id}`);
        });
    },
    
    monitorController: function(controller, side) {
        // Connection events
        controller.addEventListener('controllerconnected', (evt) => {
            this.addDebugMessage(`${side}: Controller connected - ${evt.detail.name || 'unknown'}`);
        });
        
        // Movement events
        controller.addEventListener('axismove', (evt) => {
            if (evt.detail.axis && (Math.abs(evt.detail.axis[0]) > 0.01 || Math.abs(evt.detail.axis[1]) > 0.01)) {
                this.addDebugMessage(`${side}: axismove - [${evt.detail.axis[0]?.toFixed(2)}, ${evt.detail.axis[1]?.toFixed(2)}]`);
            }
        });
        
        controller.addEventListener('thumbstickmoved', (evt) => {
            if (Math.abs(evt.detail.x) > 0.01 || Math.abs(evt.detail.y) > 0.01) {
                this.addDebugMessage(`${side}: thumbstick - x:${evt.detail.x?.toFixed(2)}, y:${evt.detail.y?.toFixed(2)}`);
            }
        });
        
        controller.addEventListener('trackpadmoved', (evt) => {
            this.addDebugMessage(`${side}: trackpad - x:${evt.detail.x?.toFixed(2)}, y:${evt.detail.y?.toFixed(2)}`);
        });
        
        // Button events
        const buttonEvents = ['buttondown', 'buttonup', 'triggerdown', 'triggerup', 
                             'gripdown', 'gripup', 'menudown', 'menuup', 'systemdown', 
                             'systemup', 'thumbstickdown', 'thumbstickup'];
        
        buttonEvents.forEach(eventName => {
            controller.addEventListener(eventName, (evt) => {
                const detail = evt.detail.id !== undefined ? ` (id:${evt.detail.id})` : '';
                this.addDebugMessage(`${side}: ${eventName}${detail}`);
            });
        });
    },
    
    setupGamepadMonitoring: function() {
        // Direct gamepad polling for comprehensive input detection
        this.gamepadInterval = setInterval(() => {
            if (!this.isVR || !navigator.getGamepads) return;
            
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                if (gamepad && gamepad.connected) {
                    // Monitor significant stick movements
                    if (gamepad.axes.length > 3) {
                        const rightStickY = gamepad.axes[3];
                        if (Math.abs(rightStickY) > 0.1) {
                            this.addDebugMessage(`Gamepad[${i}]: Right stick Y = ${rightStickY.toFixed(2)}`);
                        }
                    }
                    if (gamepad.axes.length > 1) {
                        const leftStickY = gamepad.axes[1];
                        if (Math.abs(leftStickY) > 0.1) {
                            this.addDebugMessage(`Gamepad[${i}]: Left stick Y = ${leftStickY.toFixed(2)}`);
                        }
                    }
                }
            }
        }, 200); // Check every 200ms
    },
    
    createDesktopDebug: function() {
        // Remove existing debug display
        let existingDebug = document.getElementById('desktop-debug');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // Create desktop debug console
        let desktopDebug = document.createElement('div');
        desktopDebug.id = 'desktop-debug';
        desktopDebug.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 10000;
            background: rgba(0,0,0,0.95); color: #00ff00; padding: 15px;
            font-family: 'Courier New', monospace; font-size: 12px; 
            border-radius: 8px; max-width: 450px; max-height: 400px; 
            overflow-y: auto; border: 3px solid #00ff00; 
            box-shadow: 0 0 20px rgba(0,255,0,0.3);
            backdrop-filter: blur(5px);
        `;
        desktopDebug.innerHTML = '<div style="font-weight: bold; color: #ffff00;">VR Debug Console</div><div>Debug Manager active</div>';
        document.body.appendChild(desktopDebug);
    },
    
    createVRDebugDisplay: function() {
        // Remove existing VR debug display
        if (this.debugEntity) {
            this.debugEntity.remove();
        }
        
        // Create VR debug panel
        this.debugEntity = document.createElement('a-entity');
        this.debugEntity.id = 'vr-debug-display';
        
        // Position to the right of the camera
        this.debugEntity.setAttribute('position', '1.5 1.8 -2');
        this.debugEntity.setAttribute('rotation', '0 -15 0');
        
        // Text configuration
        this.debugEntity.setAttribute('text', {
            value: 'VR Debug Console\nWaiting for events...',
            color: '#00ff00',
            align: 'left',
            width: 6,
            wrapCount: 35,
            font: 'monoid'
        });
        
        // Background panel
        this.debugEntity.setAttribute('geometry', {
            primitive: 'plane',
            width: 2.5,
            height: 1.8
        });
        this.debugEntity.setAttribute('material', {
            color: '#000000',
            opacity: 0.85,
            transparent: true,
            side: 'double'
        });
        
        // Add to camera rig or scene
        const cameraRig = document.getElementById('rig');
        const camera = document.getElementById('camera');
        
        if (cameraRig) {
            cameraRig.appendChild(this.debugEntity);
        } else if (camera) {
            camera.appendChild(this.debugEntity);
        } else {
            document.querySelector('a-scene').appendChild(this.debugEntity);
        }
        
        this.addDebugMessage('VR debug display created');
    },
    
    addDebugMessage: function(message) {
        const timestamp = new Date().toLocaleTimeString();
        const fullMessage = `${timestamp}: ${message}`;
        
        this.debugMessages.push(fullMessage);
        
        // Keep only the latest 15 messages
        if (this.debugMessages.length > 15) {
            this.debugMessages.shift();
        }
        
        // Update VR display
        if (this.debugEntity) {
            const displayText = ['VR Debug Console', '─'.repeat(20), ...this.debugMessages.slice(-10)].join('\n');
            this.debugEntity.setAttribute('text', 'value', displayText);
        }
        
        // Update desktop display
        let desktopDebug = document.getElementById('desktop-debug');
        if (desktopDebug) {
            const htmlContent = [
                '<div style="font-weight: bold; color: #ffff00; margin-bottom: 5px;">VR Debug Console</div>',
                '<div style="border-bottom: 1px solid #00ff00; margin-bottom: 5px;"></div>',
                ...this.debugMessages.map(msg => `<div>${msg}</div>`)
            ].join('');
            desktopDebug.innerHTML = htmlContent;
            desktopDebug.scrollTop = desktopDebug.scrollHeight;
        }
    },
    
    remove: function() {
        // Clean up intervals
        if (this.gamepadInterval) {
            clearInterval(this.gamepadInterval);
        }
        
        // Remove displays
        if (this.debugEntity) {
            this.debugEntity.remove();
        }
        
        let desktopDebug = document.getElementById('desktop-debug');
        if (desktopDebug) {
            desktopDebug.remove();
        }
        
        // Clear global reference
        window.VR_DEBUG_MANAGER = null;
    }
});

// Simple controller event monitor component
AFRAME.registerComponent('vr-debug', {
    init: function() {
        const controllerId = this.el.id;
        const side = controllerId.includes('left') ? 'L' : 'R';
        
        // Register with debug manager when available
        const registerWithManager = () => {
            if (window.VR_DEBUG_MANAGER) {
                window.VR_DEBUG_MANAGER.addDebugMessage(`Debug monitoring enabled for ${side} controller`);
            } else {
                setTimeout(registerWithManager, 500);
            }
        };
        
        setTimeout(registerWithManager, 100);
    }
});

// =====================================
// END OF DEBUG SYSTEM
// =====================================


// =====================================
// CORE VR FUNCTIONALITY (Clean - no debug mixing)
// =====================================

// Component for creating orbital lines
AFRAME.registerComponent('orbit-line', {
    schema: {
        radius: { type: 'number', default: 1 },
        segments: { type: 'number', default: 64 },
        color: { type: 'color', default: '#FFFFFF' },
        opacity: { type: 'number', default: 1.0 }
    },
    
    init: function() {
        const material = new THREE.LineBasicMaterial({ 
            color: this.data.color,
            transparent: true,
            opacity: this.data.opacity
        });
        
        // Create circle geometry in the XZ plane
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i <= this.data.segments; i++) {
            const theta = (i / this.data.segments) * Math.PI * 2;
            const x = this.data.radius * Math.cos(theta);
            const z = this.data.radius * Math.sin(theta);
            vertices.push(x, 0, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // Create the line
        const line = new THREE.Line(geometry, material);
        this.el.setObject3D('line', line);
    },
    
    remove: function() {
        this.el.removeObject3D('line');
    }
});

// Component for planet rotation and revolution
AFRAME.registerComponent('planet-motion', {
    schema: {
        rotationSpeed: { type: 'number', default: 0.1 },
        revolutionSpeed: { type: 'number', default: 0.01 },
        orbitRadius: { type: 'number', default: 1 }
    },
    
    init: function() {
        // Use the working approach from components-old.js
    },
    
    tick: function(time, delta) {
        const position = this.el.getAttribute('position');
        const angle = this.data.revolutionSpeed * time;
        
        // Calculate new position on orbit
        const x = Math.cos(angle) * this.data.orbitRadius;
        const z = Math.sin(angle) * this.data.orbitRadius;
        
        this.el.setAttribute('position', { x: x, y: position.y, z: z });
        
        // Rotate planet
        const rotation = this.el.getAttribute('rotation');
        this.el.setAttribute('rotation', {
            x: rotation.x,
            y: rotation.y + this.data.rotationSpeed,
            z: rotation.z
        });
    }
});

// Component for VR zoom controls (CLEAN - no debug functionality)
AFRAME.registerComponent('vr-zoom', {
    init: function() {
        this.solarSystem = document.getElementById('solar-system');
        this.isVR = false;
        
        // VR mode detection
        this.el.sceneEl.addEventListener('enter-vr', () => {
            this.isVR = true;
        });
        
        this.el.sceneEl.addEventListener('exit-vr', () => {
            this.isVR = false;
            if (this.solarSystem) {
                this.solarSystem.setAttribute('scale', '1 1 1');
            }
        });
        
        // Thumbstick/axis control for scaling
        this.el.addEventListener('thumbstickmoved', (evt) => {
            if (!this.isVR) return;
            if (evt.detail.y && Math.abs(evt.detail.y) > 0.01) {
                const scaleFactor = 1 - (evt.detail.y * 0.05);
                this.updateScale(scaleFactor);
            }
        });
        
        this.el.addEventListener('axismove', (evt) => {
            if (!this.isVR) return;
            if (evt.detail.axis && evt.detail.axis.length > 1 && Math.abs(evt.detail.axis[1]) > 0.01) {
                const scaleFactor = 1 - (evt.detail.axis[1] * 0.05);
                this.updateScale(scaleFactor);
            }
        });
        
        // Additional gamepad polling for better input detection
        this.gamepadCheckInterval = setInterval(() => {
            if (navigator.getGamepads && this.isVR) {
                const gamepads = navigator.getGamepads();
                for (let i = 0; i < gamepads.length; i++) {
                    const gamepad = gamepads[i];
                    if (gamepad && gamepad.connected) {
                        // Check right stick Y-axis (usually axes[3])
                        if (gamepad.axes.length > 3) {
                            const rightStickY = gamepad.axes[3];
                            if (Math.abs(rightStickY) > 0.1) {
                                const scaleFactor = 1 - (rightStickY * 0.05);
                                this.updateScale(scaleFactor);
                            }
                        }
                        // Check left stick Y-axis (usually axes[1])
                        if (gamepad.axes.length > 1) {
                            const leftStickY = gamepad.axes[1];
                            if (Math.abs(leftStickY) > 0.1) {
                                const scaleFactor = 1 - (leftStickY * 0.05);
                                this.updateScale(scaleFactor);
                            }
                        }
                    }
                }
            }
        }, 100);
    },
    
    updateScale: function(factor) {
        if (!this.solarSystem) return;
        
        const currentScale = this.solarSystem.getAttribute('scale');
        const newX = Math.min(Math.max(currentScale.x * factor, 0.1), 10);
        const newY = Math.min(Math.max(currentScale.y * factor, 0.1), 10);
        const newZ = Math.min(Math.max(currentScale.z * factor, 0.1), 10);
        
        this.solarSystem.setAttribute('scale', `${newX} ${newY} ${newZ}`);
    },
    
    remove: function() {
        if (this.gamepadCheckInterval) {
            clearInterval(this.gamepadCheckInterval);
        }
    }
});

// Component for adjusting solar system scale and position in AR mode
AFRAME.registerComponent('ar-scale-adjuster', {
    schema: {
        arScale: { type: 'number', default: 0.5 },  // Scale in AR mode (half size)
        vrScale: { type: 'number', default: 1.0 },   // Scale in VR/normal mode
        arYOffset: { type: 'number', default: 1.0 }, // Y position offset in AR mode (1m higher)
        vrYOffset: { type: 'number', default: 0.0 }, // Y position offset in VR/normal mode
        defaultPos: { type: 'vec3', default: { x: 0, y: 0, z: -5 } }, // Default position to reset to (fallback)
        defaultPosVR: { type: 'vec3', default: { x: 0, y: 0, z: -5 } }, // Default position for VR/desktop mode
        defaultPosAR: { type: 'vec3', default: { x: 0, y: 0, z: -3 } }  // Default position for AR mode
    },
    
    init: function() {
        // Store references
        this.sceneEl = this.el.sceneEl;
        this.currentScale = this.data.vrScale;
        this.checkDelayTimer = null;
        
        // Store the VR and AR default positions from schema
        this.defaultPositionVR = {
            x: this.data.defaultPosVR.x,
            y: this.data.defaultPosVR.y,
            z: this.data.defaultPosVR.z
        };
        
        this.defaultPositionAR = {
            x: this.data.defaultPosAR.x,
            y: this.data.defaultPosAR.y,
            z: this.data.defaultPosAR.z
        };
        
        // HTMLで明示的に設定された値をそのまま使用

        // Bind methods
        this.onEnterXR = this.onEnterXR.bind(this);
        this.onExitXR = this.onExitXR.bind(this);
        this.checkXRMode = this.checkXRMode.bind(this);

        // Register event listeners
        this.sceneEl.addEventListener('enter-vr', this.onEnterXR);
        this.sceneEl.addEventListener('exit-vr', this.onExitXR);

        // Initial scale and position (VR/desktop mode)
        this.applyTransform(this.data.vrScale, this.data.vrYOffset, false);

        // URL parameter forcing for testing
        this.checkURLParameters();
    },

    onEnterXR: function() {
        // A-Frame 1.7でのXRセッションアクセス方法
        // 少し遅延させてXRセッションが完全に初期化されるまで待つ
        this.checkDelayTimer = setTimeout(this.checkXRMode, 500);
    },
    
    checkXRMode: function() {
        const renderer = this.sceneEl.renderer;
        const xrManager = renderer.xr;
        
        if (xrManager && xrManager.isPresenting) {
            const session = xrManager.getSession();
            
            if (session) {
                const isAR = this.detectARMode(session);
                
                if (isAR) {
                    // ARモード: ARスケールとAR位置を適用
                    document.body.classList.add('ar-mode');
                    document.body.classList.remove('vr-mode');
                    this.applyTransform(this.data.arScale, this.data.arYOffset, true);
                } else {
                    // VRモード: VRスケールとVR位置を適用
                    document.body.classList.add('vr-mode');
                    document.body.classList.remove('ar-mode');
                    this.applyTransform(this.data.vrScale, this.data.vrYOffset, false);
                }
            } else {
                this.applyTransform(this.data.vrScale, this.data.vrYOffset, false);
            }
        } else {
            this.applyTransform(this.data.vrScale, this.data.vrYOffset, false);
        }
    },
    
    detectARMode: function(session) {
        // Method 1: Session mode による検出 (最も確実)
        if (session.mode === 'immersive-ar') {
            return true;
        }
        
        // Method 2: Environment blend mode による検出
        if (session.environmentBlendMode) {
            const arBlendModes = ['additive', 'alpha-blend', 'screen'];
            if (arBlendModes.includes(session.environmentBlendMode)) {
                return true;
            }
        }
        
        // Method 3: Enabled features による検出
        if (session.enabledFeatures) {
            const arFeatures = ['hit-test', 'plane-detection', 'anchors', 'camera-access'];
            const featuresArray = Array.from(session.enabledFeatures);
            const hasARFeature = arFeatures.some(feature => featuresArray.includes(feature));
            if (hasARFeature) {
                return true;
            }
        }
        
        // Method 4: Meta Quest Passthrough 特有の検出
        if (this.isMetaQuestPassthrough()) {
            return true;
        }
        
        return false;
    },
    
    isMetaQuestPassthrough: function() {
        // User agent による Quest 検出
        const isQuest = navigator.userAgent.includes('Quest') || 
                       navigator.userAgent.includes('OculusBrowser');
        
        if (!isQuest) return false;
        
        // Passthrough mode indicators
        const hasPassthroughIndicators = (
            // URL parameters
            window.location.search.includes('passthrough=true') ||
            window.location.search.includes('ar=true') ||
            // DOM indicators
            document.querySelector('[ar-mode]') !== null ||
            // Quest specific APIs
            ('getEnvironmentBlendMode' in navigator)
        );
        
        return hasPassthroughIndicators;
    },
    
    checkURLParameters: function() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('ar') === 'true' || urlParams.get('passthrough') === 'true') {
            this.applyTransform(this.data.arScale, this.data.arYOffset, true);
            document.body.classList.add('ar-mode');
            document.body.classList.add('url-forced-ar');
        }
    },

    onExitXR: function() {
        if (this.checkDelayTimer) {
            clearTimeout(this.checkDelayTimer);
            this.checkDelayTimer = null;
        }
        
        // デスクトップモードに戻る: VRスケールとVR位置を適用
        this.applyTransform(this.data.vrScale, this.data.vrYOffset, false);
        
        // CSSクラスをクリーンアップ
        document.body.classList.remove('ar-mode', 'vr-mode', 'url-forced-ar');
        
        // シーンの可視性を確保
        const scene = this.sceneEl;
        if (scene && scene.object3D) {
            scene.object3D.visible = true;
            scene.object3D.scale.set(1, 1, 1);
        }
    },
    
    applyTransform: function(scale, yOffset, isAR) {
        // スケールと位置を同時に設定
        this.el.setAttribute('scale', scale + ' ' + scale + ' ' + scale);
        
        // モードに応じた基準位置を選択
        const basePosition = isAR ? this.defaultPositionAR : this.defaultPositionVR;
        
        // Y オフセットを適用した位置を設定
        const newPosition = {
            x: basePosition.x,
            y: basePosition.y + yOffset,
            z: basePosition.z
        };
        
        this.el.setAttribute('position', newPosition);
    },
    
    remove: function() {
        // Clean up
        if (this.checkDelayTimer) {
            clearTimeout(this.checkDelayTimer);
        }
        this.sceneEl.removeEventListener('enter-vr', this.onEnterXR);
        this.sceneEl.removeEventListener('exit-vr', this.onExitXR);
        document.body.classList.remove('ar-mode', 'vr-mode', 'url-forced-ar');
    }
});

// Component for creating background stars
AFRAME.registerComponent('stars', {
    schema: {
        count: { type: 'number', default: 1000 },
        radius: { type: 'number', default: 100 },
        color: { type: 'color', default: '#FFFFFF' }
    },
    
    init: function() {
        // Create star particles
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < this.data.count; i++) {
            // Random position on sphere
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            
            const x = this.data.radius * Math.sin(theta) * Math.cos(phi);
            const y = this.data.radius * Math.sin(theta) * Math.sin(phi);
            const z = this.data.radius * Math.cos(theta);
            
            vertices.push(x, y, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // Create star material
        const material = new THREE.PointsMaterial({
            color: this.data.color,
            size: 0.5,
            sizeAttenuation: true
        });
        
        // Create the star system
        const stars = new THREE.Points(geometry, material);
        this.el.setObject3D('stars', stars);
    },
    
    remove: function() {
        this.el.removeObject3D('stars');
    }
});
