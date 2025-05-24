import * as THREE from 'three';
import { CelestialBody } from './celestialBody.js';
import { Controls } from './controls.js';
import { PLANETS, SUN } from './constants.js';

class SolarSystem {
    constructor() {
        this.init();
    }
    
    init() {
        // Create Scene
        this.scene = new THREE.Scene();
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 20, 100);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Container for the solar system
        this.solarSystemObj = new THREE.Object3D();
        this.scene.add(this.solarSystemObj);
        
        // Setup lighting
        this.setupLights();
        
        // Create starfield background
        this.createStarfield();
        
        // Create celestial bodies
        this.createCelestialBodies();
        
        // Setup controls
        this.controls = new Controls(
            this.camera, 
            this.renderer, 
            this.renderer.domElement,
            this.scene,
            this.solarSystemObj
        );
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start animation loop
        this.animate();
    }
    
    setupLights() {
        // Ambient light for general illumination - increased intensity for better planet visibility
        const ambientLight = new THREE.AmbientLight(0x808080, 2.0);
        this.scene.add(ambientLight);
        
        // Point light at the sun's position with increased intensity and range
        const sunLight = new THREE.PointLight(0xffffff, 3.0, 1000);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        this.solarSystemObj.add(sunLight);
    }
    
    createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: false
        });
        
        const starsVertices = [];
        const starsCount = 5000;
        
        for (let i = 0; i < starsCount; i++) {
            const x = THREE.MathUtils.randFloatSpread(2000);
            const y = THREE.MathUtils.randFloatSpread(2000);
            const z = THREE.MathUtils.randFloatSpread(2000);
            
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);
    }
    
    createCelestialBodies() {
        // Create Sun
        this.sun = new CelestialBody(
            SUN.name,
            SUN.radius,
            0, // No orbit for the sun
            0.001, // Very slow rotation
            0, // No orbit
            SUN.color
        );
        
        // Add glow effect to sun
        this.sun.addFeature('glow');
        
        // Add sun to the solar system
        this.solarSystemObj.add(this.sun.object);
        
        // Create planets
        this.planets = [];
        
        PLANETS.forEach(planet => {
            const planetObj = new CelestialBody(
                planet.name,
                planet.radius,
                planet.distance,
                planet.rotationSpeed,
                planet.orbitSpeed,
                planet.color,
                planet.tilt
            );
            
            this.planets.push(planetObj);
            this.solarSystemObj.add(planetObj.object);
            
            // Add orbit line
            if (planetObj.orbit) {
                this.solarSystemObj.add(planetObj.orbit);
            }
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        this.renderer.setAnimationLoop(this.render.bind(this));
    }
    
    render() {
        // Update controls
        this.controls.update();
        
        // Update celestial bodies
        this.sun.update();
        this.planets.forEach(planet => planet.update());
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SolarSystem();
});