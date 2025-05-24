import * as THREE from 'three';

export class CelestialBody {
    constructor(name, radius, distance, rotationSpeed, orbitSpeed, color, tilt = 0) {
        this.name = name;
        this.radius = radius;
        this.distance = distance;
        this.rotationSpeed = rotationSpeed;
        this.orbitSpeed = orbitSpeed;
        this.color = color;
        this.tilt = tilt;
        this.angle = Math.random() * Math.PI * 2; // Random initial position
        
        this.object = null;
        this.orbit = null;
        
        this._createBody();
        if (distance > 0) {
            this._createOrbit();
        }
    }
    
    _createBody() {
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        
        let material;
        
        // Special case for the Sun
        if (this.name === 'Sun') {
            material = new THREE.MeshBasicMaterial({
                color: this.color,
                emissive: this.color,
                emissiveIntensity: 1
            });
        } else {
            // For planets, use standard material with some random surface variation
            material = new THREE.MeshStandardMaterial({
                color: this.color,
                roughness: 0.7,
                metalness: 0.2,
                flatShading: false
            });
            
            // Add some random surface variation using noise
            if (this.name !== 'Earth') {
                const textureSize = 128;
                const canvas = document.createElement('canvas');
                canvas.width = textureSize;
                canvas.height = textureSize;
                
                const context = canvas.getContext('2d');
                context.fillStyle = new THREE.Color(this.color).getStyle();
                context.fillRect(0, 0, textureSize, textureSize);
                
                // Add some noise for texture
                for (let y = 0; y < textureSize; y++) {
                    for (let x = 0; x < textureSize; x++) {
                        // Get a smooth noise value (0-255)
                        const noise = Math.floor(Math.random() * 30);
                        
                        // Get current pixel color
                        context.fillStyle = `rgba(${noise}, ${noise}, ${noise}, 0.1)`;
                        context.fillRect(x, y, 1, 1);
                    }
                }
                
                // Create texture from canvas
                const texture = new THREE.CanvasTexture(canvas);
                material.map = texture;
            }
            
            // Special case for Earth to make it recognizable
            if (this.name === 'Earth') {
                // Create simple texture with continents
                const textureSize = 256;
                const canvas = document.createElement('canvas');
                canvas.width = textureSize;
                canvas.height = textureSize;
                
                const context = canvas.getContext('2d');
                
                // Blue for oceans
                context.fillStyle = '#0066ff';
                context.fillRect(0, 0, textureSize, textureSize);
                
                // Green for continents (very simple shapes)
                context.fillStyle = '#00aa00';
                
                // Draw simple continent shapes
                context.beginPath();
                context.ellipse(textureSize/4, textureSize/2, textureSize/6, textureSize/8, 0, 0, Math.PI*2);
                context.fill();
                
                context.beginPath();
                context.ellipse(textureSize/1.5, textureSize/3, textureSize/7, textureSize/5, 0, 0, Math.PI*2);
                context.fill();
                
                context.beginPath();
                context.ellipse(textureSize/1.7, textureSize/1.5, textureSize/8, textureSize/6, 0, 0, Math.PI*2);
                context.fill();
                
                // Draw some white for cloud/snow
                context.fillStyle = 'rgba(255, 255, 255, 0.5)';
                context.beginPath();
                context.arc(textureSize/5, textureSize/6, textureSize/12, 0, Math.PI*2);
                context.fill();
                
                context.beginPath();
                context.arc(textureSize/1.2, textureSize/1.1, textureSize/10, 0, Math.PI*2);
                context.fill();
                
                // Create texture from canvas
                const texture = new THREE.CanvasTexture(canvas);
                material.map = texture;
            }
        }
        
        this.object = new THREE.Mesh(geometry, material);
        
        // Apply axial tilt
        this.object.rotation.x = this.tilt;
    }
    
    _createOrbit() {
        const orbitGeometry = new THREE.BufferGeometry();
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2
        });
        
        // Create orbit circle
        const vertices = [];
        const segments = 128;
        
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            vertices.push(
                Math.cos(theta) * this.distance,
                0,
                Math.sin(theta) * this.distance
            );
        }
        
        orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    }
    
    update() {
        // Self-rotation
        this.object.rotation.y += this.rotationSpeed;
        
        // Orbital movement
        if (this.distance > 0) {
            this.angle += this.orbitSpeed;
            this.object.position.x = Math.cos(this.angle) * this.distance;
            this.object.position.z = Math.sin(this.angle) * this.distance;
        }
    }

    // Add special effects or features to a celestial body
    addFeature(feature) {
        if (feature === 'glow' && this.name === 'Sun') {
            // Add a glow effect to the sun
            const glowGeometry = new THREE.SphereGeometry(this.radius * 1.2, 32, 32);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.15
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            this.object.add(glow);
        }
    }
}