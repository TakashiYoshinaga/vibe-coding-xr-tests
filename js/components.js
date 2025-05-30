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
