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
        this.scale = { x: 1, y: 1, z: 1 };
        this.scene = document.querySelector('a-scene');
        this.isVR = false;
        
        // Handle VR mode changes
        this.scene.addEventListener('enter-vr', () => {
            this.isVR = true;
        });
        
        this.scene.addEventListener('exit-vr', () => {
            this.isVR = false;
        });
        
        // For Oculus/Meta Quest controllers
        this.el.sceneEl.addEventListener('thumbstickmoved', (evt) => {
            if (!this.isVR) return;
            
            // Check if it's the right joystick (index 1)
            if (evt.detail.y !== 0 && evt.detail.controller.id === 1) {
                const scaleFactor = 1 - (evt.detail.y * 0.05);
                this.updateScale(scaleFactor);
            }
        });

        // Alternative for older versions of A-Frame
        this.el.sceneEl.addEventListener('axismove', (evt) => {
            if (!this.isVR) return;
            
            // Check if it's the right joystick Y-axis
            if (evt.detail.axis[1] !== 0 && evt.detail.axis.length > 1) {
                const scaleFactor = 1 - (evt.detail.axis[1] * 0.05);
                this.updateScale(scaleFactor);
            }
        });
    },
    
    updateScale: function(factor) {
        // Get the scene's current scale
        const currentScale = this.scene.object3D.scale;
        
        // Calculate new scale (clamped between 0.1 and 10)
        const newX = Math.min(Math.max(currentScale.x * factor, 0.1), 10);
        const newY = Math.min(Math.max(currentScale.y * factor, 0.1), 10);
        const newZ = Math.min(Math.max(currentScale.z * factor, 0.1), 10);
        
        // Apply the new scale to the scene
        this.scene.object3D.scale.set(newX, newY, newZ);
    }
});

// Component for adjusting solar system scale in AR mode
AFRAME.registerComponent('ar-scale-adjuster', {
    schema: {
        arScale: { type: 'number', default: 0.5 },  // Scale in AR mode (half size)
        vrScale: { type: 'number', default: 1.0 }   // Scale in VR/normal mode
    },
    
    init: function() {
        // Store references
        this.sceneEl = this.el.sceneEl;
        this.currentScale = this.data.vrScale;

        // Register event listeners
        this.sceneEl.addEventListener('enter-vr', this.onEnterXR.bind(this));
        this.sceneEl.addEventListener('exit-vr', this.onExitXR.bind(this));

        // Initial scale
        this.applyScale(this.data.vrScale);

        // Debug info
        console.log('AR Scale Adjuster initialized');
    },

    onEnterXR: function() {
        console.log('XR mode entered');
        
        // 最も信頼性の高いAR/VR検出方法
        const xrSession = this.sceneEl.xrSession;
        
        if (xrSession) {
            // environmentBlendModeはARセッションを識別する最も信頼性の高い方法
            console.log('XR Session found: ', xrSession);
            console.log('Environment Blend Mode: ', xrSession.environmentBlendMode);
            
            // ARモードの検出条件
            const isAR = (
                // Meta Quest PassthroughやARCore/ARKitなどはこれらのモードを使用
                xrSession.environmentBlendMode === 'additive' || 
                xrSession.environmentBlendMode === 'alpha-blend' ||
                xrSession.environmentBlendMode === 'screen' ||
                // 一部のデバイスではセッション情報からARを確認
                (xrSession.domOverlayState && xrSession.domOverlayState.type) ||
                // Oculusブラウザ用の追加チェック
                (navigator.userAgent.includes('Quest') && this.isOculusInPassthrough())
            );
            
            if (isAR) {
                // ARモード
                this.currentScale = this.data.arScale;
                console.log('AR MODE DETECTED - Scaling to:', this.data.arScale);
                document.body.classList.add('ar-mode');
                document.body.classList.remove('vr-mode');
            } else {
                // VRモード
                this.currentScale = this.data.vrScale;
                console.log('VR MODE DETECTED - Scaling to:', this.data.vrScale);
                document.body.classList.add('vr-mode');
                document.body.classList.remove('ar-mode');
            }
            
            this.applyScale(this.currentScale);
        }
    },
    
    // Oculusがパススルーモードかどうかを確認する補助メソッド
    isOculusInPassthrough: function() {
        // OculusブラウザのパススルーモードをURLパラメータで確認
        return window.location.search.includes('passthroughMode=true') || 
               window.location.search.includes('ar=true');
    },

    onExitXR: function() {
        // Reset to default when exiting XR
        this.currentScale = this.data.vrScale;
        this.applyScale(this.currentScale);
        console.log('Exited XR - resetting scale to:', this.data.vrScale);
    },
    
    applyScale: function(scale) {
        this.el.setAttribute('scale', scale + ' ' + scale + ' ' + scale);
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
