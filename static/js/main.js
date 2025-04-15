let scene, camera, renderer, particles;
const ipMeshes = {}; // Stores IP objects
const maxParticles = 200;
const colors = {
    low: 0x00ff00,    // Green
    medium: 0xffa500,  // Orange
    high: 0xff0000     // Red
};

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);

    // Start animation loop
    animate();

    // Start data polling
    setInterval(fetchData, 1000); // Update every second

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function fetchData() {
    fetch('/api/visualization-data')
        .then(response => response.json())
        .then(data => updateVisualization(data.particles));
}

function updateVisualization(particles) {
    // Clear old particles
    Object.values(ipMeshes).forEach(mesh => scene.remove(mesh));

    // Create new particles
    particles.forEach(p => {
        const ip = p.ip;
        const activity = p.size;

        // Determine color based on activity level
        let color;
        if (activity < 3) color = colors.low;
        else if (activity < 7) color = colors.medium;
        else color = colors.high;

        // Create sphere for IP
        const geometry = new THREE.SphereGeometry(activity * 0.5, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);

        // Position randomly if new IP
        if (!ipMeshes[ip]) {
            sphere.position.x = Math.random() * 40 - 20;
            sphere.position.y = Math.random() * 40 - 20;
            sphere.position.z = Math.random() * 40 - 20;
        } else {
            // Smooth movement for existing IPs
            sphere.position.copy(ipMeshes[ip].position);
        }

        scene.add(sphere);
        ipMeshes[ip] = sphere;
    });
}

function animate() {
    requestAnimationFrame(animate);

    // Rotate camera for better view
    camera.position.x = Math.sin(Date.now() * 0.001) * 50;
    camera.position.z = Math.cos(Date.now() * 0.001) * 50;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start the visualization
init();