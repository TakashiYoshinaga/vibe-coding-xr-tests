// Solar system data with relative values for visualization purposes
// Not to actual scale, but maintains relative relationships for visual appeal

export const PLANETS = [
    {
        name: 'Mercury',
        radius: 0.38, // Relative size
        distance: 5, // Distance from sun
        rotationSpeed: 0.01, // Self-rotation speed
        orbitSpeed: 0.04, // Orbit speed around sun
        color: 0x8a8a8a, // Gray
        tilt: 0.03 // Axial tilt in radians
    },
    {
        name: 'Venus',
        radius: 0.95,
        distance: 7,
        rotationSpeed: 0.005, // Slow retrograde rotation
        orbitSpeed: 0.015,
        color: 0xe39e1c, // Yellowish
        tilt: 0.05
    },
    {
        name: 'Earth',
        radius: 1,
        distance: 10,
        rotationSpeed: 0.02,
        orbitSpeed: 0.01,
        color: 0x3498db, // Blue
        tilt: 0.41 // ~23.5 degrees
    },
    {
        name: 'Mars',
        radius: 0.53,
        distance: 15,
        rotationSpeed: 0.018,
        orbitSpeed: 0.008,
        color: 0xc0392b, // Red
        tilt: 0.44
    },
    {
        name: 'Jupiter',
        radius: 11.2,
        distance: 28,
        rotationSpeed: 0.04, // Fast rotation
        orbitSpeed: 0.002,
        color: 0xe67e22, // Orange-ish
        tilt: 0.05
    },
    {
        name: 'Saturn',
        radius: 9.45,
        distance: 47,
        rotationSpeed: 0.038,
        orbitSpeed: 0.0009,
        color: 0xf1c40f, // Yellow
        tilt: 0.47
    },
    {
        name: 'Uranus',
        radius: 4.0,
        distance: 84,
        rotationSpeed: 0.03,
        orbitSpeed: 0.0004,
        color: 0x1abc9c, // Cyan
        tilt: 1.48 // Extreme tilt
    },
    {
        name: 'Neptune',
        radius: 3.88,
        distance: 140,
        rotationSpeed: 0.032,
        orbitSpeed: 0.0001,
        color: 0x3498db, // Blue
        tilt: 0.49
    }
];

export const SUN = {
    name: 'Sun',
    radius: 4, // Base size of the sun (scaled)
    color: 0xffff00 // Yellow
};