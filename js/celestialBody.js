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
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            shininess: 25,
            flatShading: false
        });
        
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