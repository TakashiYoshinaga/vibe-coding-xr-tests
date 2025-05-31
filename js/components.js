/**
 * Solar System Components for A-Frame
 * This file contains custom components for the Solar System Viewer
 */

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
        // Optimize performance with throttled tick
        this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 16, this.el);
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

// Component for VR zoom controls
AFRAME.registerComponent('vr-zoom', {
    init: function() {
        console.log('🔧 vr-zoom component initialized on:', this.el.id || this.el.tagName);
        this.solarSystem = document.getElementById('solar-system');
        this.isVR = false;
        this.lastScale = { x: 1, y: 1, z: 1 };
        
        // 少し遅延してデバッグ表示を作成（A-Frameの初期化完了を待つ）
        setTimeout(() => {
            this.createDebugDisplay();
        }, 1000);
        
        // VRモード判定
        this.el.sceneEl.addEventListener('enter-vr', () => {
            this.isVR = true;
            this.addDebugMessage('Entered VR mode');
        });
        this.el.sceneEl.addEventListener('exit-vr', () => {
            this.isVR = false;
            this.addDebugMessage('Exited VR mode');
            if (this.solarSystem) this.solarSystem.setAttribute('scale', '1 1 1');
        });
        
        // axismoveイベントを監視
        this.el.addEventListener('axismove', (evt) => {
            this.addDebugMessage(`axismove: ${JSON.stringify(evt.detail)}`);
            if (!this.isVR) {
                this.addDebugMessage('Not in VR mode, ignoring');
                return;
            }
            if (evt.detail.axis && evt.detail.axis.length > 1 && Math.abs(evt.detail.axis[1]) > 0.01) {
                this.addDebugMessage(`Joystick Y: ${evt.detail.axis[1]}`);
                const scaleFactor = 1 - (evt.detail.axis[1] * 0.05);
                this.updateScale(scaleFactor);
            }
        });
        
        // コントローラー接続チェック
        this.el.addEventListener('controllerconnected', (evt) => {
            this.addDebugMessage(`Controller connected: ${JSON.stringify(evt.detail)}`);
        });
        
        // より多くのイベントを監視
        this.el.addEventListener('thumbstickmoved', (evt) => {
            this.addDebugMessage(`thumbstickmoved: ${JSON.stringify(evt.detail)}`);
            if (!this.isVR) return;
            if (evt.detail.y && Math.abs(evt.detail.y) > 0.01) {
                const scaleFactor = 1 - (evt.detail.y * 0.05);
                this.updateScale(scaleFactor);
            }
        });
        
        this.el.addEventListener('trackpadmoved', (evt) => {
            this.addDebugMessage(`trackpadmoved: ${JSON.stringify(evt.detail)}`);
        });
        
        // ボタンイベントも監視
        this.el.addEventListener('buttondown', (evt) => {
            this.addDebugMessage(`buttondown: ${JSON.stringify(evt.detail)}`);
        });
        
        this.el.addEventListener('buttonup', (evt) => {
            this.addDebugMessage(`buttonup: ${JSON.stringify(evt.detail)}`);
        });
    },
    
    createDebugDisplay: function() {
        // VR内で見えるデバッグテキストエンティティを作成
        this.debugEntity = document.createElement('a-entity');
        // カメラの前方、やや上に配置
        this.debugEntity.setAttribute('position', '0 2.5 -1.5');
        this.debugEntity.setAttribute('rotation', '0 0 0');
        this.debugEntity.setAttribute('text', {
            value: 'VR Debug Console\nWaiting for events...',
            color: '#00ff00',
            align: 'center',
            width: 8,
            wrapCount: 40
        });
        // 背景を追加して見やすくする
        this.debugEntity.setAttribute('geometry', {
            primitive: 'plane',
            width: 3,
            height: 2
        });
        this.debugEntity.setAttribute('material', {
            color: '#000000',
            opacity: 0.8,
            transparent: true
        });
        
        // カメラリグに追加してカメラと一緒に動くようにする
        const cameraRig = document.getElementById('rig');
        if (cameraRig) {
            cameraRig.appendChild(this.debugEntity);
        } else {
            document.querySelector('a-scene').appendChild(this.debugEntity);
        }
        
        this.debugMessages = ['VR Debug Console', 'Component initialized'];
        this.addDebugMessage('Debug display created');
    },
    
    addDebugMessage: function(message) {
        const timestamp = new Date().toLocaleTimeString();
        const fullMessage = `${timestamp}: ${message}`;
        this.debugMessages.push(fullMessage);
        
        // 最新の10メッセージのみ保持
        if (this.debugMessages.length > 10) {
            this.debugMessages.shift();
        }
        
        // VR内のテキストを更新
        if (this.debugEntity) {
            this.debugEntity.setAttribute('text', 'value', this.debugMessages.join('\n'));
        }
        
        // デスクトップ用のデバッグ表示も更新
        let desktopDebug = document.getElementById('desktop-debug');
        if (!desktopDebug) {
            desktopDebug = document.createElement('div');
            desktopDebug.id = 'desktop-debug';
            desktopDebug.style.cssText = `
                position: fixed; top: 10px; right: 10px; z-index: 1000;
                background: rgba(0,0,0,0.8); color: #00ff00; padding: 10px;
                font-family: monospace; font-size: 12px; border-radius: 5px;
                max-width: 300px; max-height: 300px; overflow-y: auto;
            `;
            document.body.appendChild(desktopDebug);
        }
        desktopDebug.innerHTML = this.debugMessages.join('<br>');
        
        console.log(`🔧 VR Debug: ${fullMessage}`);
    },
    
    updateScale: function(factor) {
        if (!this.solarSystem) {
            this.addDebugMessage('Solar system not found!');
            return;
        }
        const currentScale = this.solarSystem.getAttribute('scale');
        const newX = Math.min(Math.max(currentScale.x * factor, 0.1), 10);
        const newY = Math.min(Math.max(currentScale.y * factor, 0.1), 10);
        const newZ = Math.min(Math.max(currentScale.z * factor, 0.1), 10);
        this.addDebugMessage(`Scale: ${currentScale.x.toFixed(2)} → ${newX.toFixed(2)}`);
        this.solarSystem.setAttribute('scale', `${newX} ${newY} ${newZ}`);
    }
});

// Component for adjusting solar system scale and position in AR mode
AFRAME.registerComponent('ar-scale-adjuster', {
    schema: {
        arScale: { type: 'number', default: 0.5 },  // Scale in AR mode (half size)
        vrScale: { type: 'number', default: 1.0 },   // Scale in VR/normal mode
        arYOffset: { type: 'number', default: 1.0 }, // Y position offset in AR mode (1m higher)
        vrYOffset: { type: 'number', default: 0.0 }  // Y position offset in VR/normal mode
    },
    
    init: function() {
        // Store references
        this.sceneEl = this.el.sceneEl;
        this.currentScale = this.data.vrScale;
        this.checkDelayTimer = null;
        
        // Store original position from the element's current position attribute
        this.originalPosition = this.el.getAttribute('position');
        console.log('🏁 AR Scale Adjuster initialized with original position:', this.originalPosition);
        console.log('🏁 Schema values - arYOffset:', this.data.arYOffset, 'vrYOffset:', this.data.vrYOffset);

        // Bind methods
        this.onEnterXR = this.onEnterXR.bind(this);
        this.onExitXR = this.onExitXR.bind(this);
        this.checkXRMode = this.checkXRMode.bind(this);

        // Register event listeners
        this.sceneEl.addEventListener('enter-vr', this.onEnterXR);
        this.sceneEl.addEventListener('exit-vr', this.onExitXR);

        // Initial scale and position
        this.applyTransform(this.data.vrScale, this.data.vrYOffset);

        // URL parameter forcing for testing
        this.checkURLParameters();
    },

    onEnterXR: function() {
        console.log('XR mode entered - checking mode...');
        
        // A-Frame 1.7でのXRセッションアクセス方法
        // 少し遅延させてXRセッションが完全に初期化されるまで待つ
        this.checkDelayTimer = setTimeout(this.checkXRMode, 500);
    },
    
    checkXRMode: function() {
        // A-Frame 1.7での正しいXRセッションアクセス方法
        const renderer = this.sceneEl.renderer;
        const xrManager = renderer.xr;
        
        if (xrManager && xrManager.isPresenting) {
            const session = xrManager.getSession();
            
            if (session) {
                console.log('XR Session found');
                console.log('Session mode:', session.mode);
                console.log('Environment Blend Mode:', session.environmentBlendMode);
                console.log('Session enabled features:', session.enabledFeatures);
                
                // ARモードの検出
                const isAR = this.detectARMode(session);
                
                if (isAR) {
                    // ARモード
                    this.currentScale = this.data.arScale;
                    console.log('🟢 AR MODE DETECTED - Scaling to:', this.data.arScale, 'Y offset:', this.data.arYOffset);
                    document.body.classList.add('ar-mode');
                    document.body.classList.remove('vr-mode');
                    this.applyTransform(this.currentScale, this.data.arYOffset);
                } else {
                    // VRモード
                    this.currentScale = this.data.vrScale;
                    console.log('🔵 VR MODE DETECTED - Scaling to:', this.data.vrScale, 'Y offset:', this.data.vrYOffset);
                    document.body.classList.add('vr-mode');
                    document.body.classList.remove('ar-mode');
                    this.applyTransform(this.currentScale, this.data.vrYOffset);
                }
            } else {
                console.log('⚠️ No XR session found, defaulting to VR scale');
                this.applyTransform(this.data.vrScale, this.data.vrYOffset);
            }
        } else {
            console.log('⚠️ XR Manager not presenting, defaulting to VR scale');
            this.applyTransform(this.data.vrScale, this.data.vrYOffset);
        }
    },
    
    detectARMode: function(session) {
        // Method 1: Session mode による検出 (最も確実)
        if (session.mode === 'immersive-ar') {
            console.log('✅ AR detected via session mode: immersive-ar');
            return true;
        }
        
        // Method 2: Environment blend mode による検出
        if (session.environmentBlendMode) {
            const arBlendModes = ['additive', 'alpha-blend', 'screen'];
            if (arBlendModes.includes(session.environmentBlendMode)) {
                console.log('✅ AR detected via environmentBlendMode:', session.environmentBlendMode);
                return true;
            }
        }
        
        // Method 3: Enabled features による検出
        if (session.enabledFeatures) {
            const arFeatures = ['hit-test', 'plane-detection', 'anchors', 'camera-access'];
            const featuresArray = Array.from(session.enabledFeatures);
            const hasARFeature = arFeatures.some(feature => featuresArray.includes(feature));
            if (hasARFeature) {
                console.log('✅ AR detected via enabled features:', featuresArray);
                return true;
            }
        }
        
        // Method 4: Meta Quest Passthrough 特有の検出
        if (this.isMetaQuestPassthrough()) {
            console.log('✅ AR detected via Meta Quest Passthrough indicators');
            return true;
        }
        
        console.log('❌ No AR indicators found, assuming VR mode');
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
        
        console.log('Quest device detected:', isQuest, 'Passthrough indicators:', hasPassthroughIndicators);
        return hasPassthroughIndicators;
    },
    
    checkURLParameters: function() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('ar') === 'true' || urlParams.get('passthrough') === 'true') {
            console.log('🔧 AR mode forced via URL parameters');
            this.currentScale = this.data.arScale;
            this.applyTransform(this.currentScale, this.data.arYOffset);
            document.body.classList.add('ar-mode');
            document.body.classList.add('url-forced-ar');
        }
        
        if (urlParams.get('debug') === 'true') {
            console.log('🔧 Debug mode enabled');
        }
    },

    onExitXR: function() {
        // Clear any pending timers
        if (this.checkDelayTimer) {
            clearTimeout(this.checkDelayTimer);
            this.checkDelayTimer = null;
        }
        
        // Reset to default when exiting XR
        this.currentScale = this.data.vrScale;
        this.applyTransform(this.currentScale, this.data.vrYOffset);
        console.log('🚪 Exited XR - resetting scale to:', this.data.vrScale, 'Y offset to:', this.data.vrYOffset);
        
        // Clean up classes
        document.body.classList.remove('ar-mode', 'vr-mode', 'url-forced-ar');
        
        // Ensure scene is visible and properly reset
        const scene = this.sceneEl;
        if (scene && scene.object3D) {
            scene.object3D.visible = true;
            // Reset scene scale if it was modified
            scene.object3D.scale.set(1, 1, 1);
        }
    },
    
    applyTransform: function(scale, yOffset) {
        console.log('🔧 applyTransform called with:', { scale, yOffset });
        console.log('🔧 originalPosition:', this.originalPosition);
        
        // Apply scale
        this.el.setAttribute('scale', scale + ' ' + scale + ' ' + scale);
        
        // Apply position with Y offset
        const newPosition = {
            x: this.originalPosition.x,
            y: this.originalPosition.y + yOffset,
            z: this.originalPosition.z
        };
        
        console.log('🔧 Calculated newPosition:', newPosition);
        this.el.setAttribute('position', newPosition);
        
        // Verify the position was actually set
        const verifyPosition = this.el.getAttribute('position');
        console.log('🔧 Verified position after setting:', verifyPosition);
        
        console.log('📏 Applied transform - Scale:', scale, 'Y offset:', yOffset, 'to element:', this.el.id || this.el.tagName);
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
