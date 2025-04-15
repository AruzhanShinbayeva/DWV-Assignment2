// Configuration
const config = {
    displayDuration: 10000, // 10 seconds in ms
    dotSize: 6,
    dotColor: '#FF5722',
    fadeDuration: 2000 // 2 seconds fade out
};

// State
let state = {
    data: [],
    isPlaying: true,
    dots: [],
    locationCounts: {},
    timeData: Array(24).fill(0),
    currentIndex: 0,
    lastRenderTime: 0
};

// DOM Elements
const elements = {
    mapContainer: document.getElementById('map'),
    playPauseBtn: document.getElementById('playPause'),
    resetBtn: document.getElementById('reset'),
    durationInput: document.getElementById('duration'),
    durationValue: document.getElementById('durationValue'),
    locationList: document.getElementById('locationList'),
    timeChart: new Chart(
        document.getElementById('timeChart').getContext('2d'),
        {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {}
        }
    )
};

// Initialize the visualization
async function init() {
    setupEventListeners();

    await fetchData();

    setupMap();

    setupCharts();

    if (state.isPlaying) {
        requestAnimationFrame(render);
    }
}

// Set up event listeners
function setupEventListeners() {
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.resetBtn.addEventListener('click', resetVisualization);
    elements.durationInput.addEventListener('input', updateDuration);
}

async function getCityFromIP(ip) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const { city, country, status } = await response.json();

    if (status !== "success") {
      return { city: "Unknown", country: "Unknown" };
    }

    return { city, country };
  } catch (error) {
    console.error("Error fetching city from IP:", error);
    return {"city": "Unknown", "country": "Unknown"};
  }
}

// Fetch data from server
async function fetchData() {
    try {
        const response = await fetch('/api/visualization-data');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const rawData = await response.json();

        state.data = await Promise.all(rawData.map(async item => {
            const { city, country } = await getCityFromIP(item.ip);
            return {
                ...item,
                city,
                country
            };
        }));
        processData();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Process the data for visualization
function processData() {
    state.locationCounts = {};
    state.timeData = Array(24).fill(0);

    state.data.forEach(item => {
        // Count locations
        const locationKey = `${item.city}, ${item.country}`;
        state.locationCounts[locationKey] = (state.locationCounts[locationKey] || 0) + 1;

        // Count by hour
        const hour = new Date(item.timestamp).getHours();
        state.timeData[hour]++;
    });
}

// Set up the world map
function setupMap() {
    const width = elements.mapContainer.clientWidth;
    const height = elements.mapContainer.clientHeight;

    const projection = d3.geoMercator()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 2]);

    const svg = d3.select(elements.mapContainer)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Load and draw world map
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
        const countries = topojson.feature(world, world.objects.countries);

        svg.append("g")
            .selectAll("path")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("fill", "#ddd")
            .attr("d", d3.geoPath().projection(projection))
            .style("stroke", "#fff");
    });
}

// Set up charts
function setupCharts() {
    // Time distribution chart
    elements.timeChart.data = {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
            label: 'Traffic per hour',
            data: state.timeData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };
    elements.timeChart.options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of traffics'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Hour of day'
                }
            }
        }
    };
    elements.timeChart.update();

    // Update location list
    updateLocationList();
}

// Update the top locations list
function updateLocationList() {
    const sortedLocations = Object.entries(state.locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    elements.locationList.innerHTML = '';

    sortedLocations.forEach(([location, count]) => {
        const div = document.createElement('div');
        div.className = 'location-item';
        div.innerHTML = `
            <span>${location}</span>
            <span>${count}</span>
        `;
        elements.locationList.appendChild(div);
    });
}

// Main render loop
function render(timestamp) {
    if (!state.isPlaying) return;

    // Calculate time since last render
    const deltaTime = timestamp - state.lastRenderTime;
    state.lastRenderTime = timestamp;

    // Process next batch of data
    processNextDataBatch();

    // Update dots visibility based on age
    updateDotsVisibility(timestamp);

    // Continue animation loop
    requestAnimationFrame(render);
}

// Process next batch of data points
function processNextDataBatch() {
    const batchSize = Math.ceil(state.data.length / 100); // Process ~1% of data at a time

    for (let i = 0; i < batchSize && state.currentIndex < state.data.length; i++) {
        const item = state.data[state.currentIndex];
        addDot(item);
        state.currentIndex++;
    }

    if (state.currentIndex % 50 === 0) {
        updateLocationList();
    }
}

// Add a new dot to the map
function addDot(item) {
    const dot = document.createElement('div');
    dot.className = 'dot';

    const x = (item.longitude + 180) / 360 * elements.mapContainer.clientWidth;
    const y = (90 - item.latitude) / 180 * elements.mapContainer.clientHeight;

    Object.assign(dot.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${config.dotSize}px`,
        height: `${config.dotSize}px`,
        backgroundColor: config.dotColor,
        opacity: '1',
        createdAt: Date.now()
    });

    dot.setAttribute('title', `${item.city}, ${item.country}\n${new Date(item.timestamp).toLocaleString()}`);

    elements.mapContainer.appendChild(dot);
    state.dots.push(dot);
}

// Update dots visibility based on their age
function updateDotsVisibility(currentTime) {
    state.dots.forEach(dot => {
        const age = currentTime - parseInt(dot.style.createdAt);

        if (age > config.displayDuration) {
            const fadeProgress = Math.min(1, (age - config.displayDuration) / config.fadeDuration);
            dot.style.opacity = 1 - fadeProgress;

            if (fadeProgress >= 1) {
                dot.remove();
            }
        }
    });

    state.dots = state.dots.filter(dot =>
        currentTime - parseInt(dot.style.createdAt) < config.displayDuration + config.fadeDuration
    );
}

// Toggle play/pause
function togglePlayPause() {
    state.isPlaying = !state.isPlaying;
    elements.playPauseBtn.textContent = state.isPlaying ? 'Pause' : 'Play';

    if (state.isPlaying) {
        state.lastRenderTime = performance.now();
        requestAnimationFrame(render);
    }
}

// Reset visualization
function resetVisualization() {
    // Clear all dots
    state.dots.forEach(dot => dot.remove());
    state.dots = [];

    // Reset data index
    state.currentIndex = 0;

    // Reset charts
    processData();
    setupCharts();

    // Restart if paused
    if (!state.isPlaying) {
        togglePlayPause();
    }
}

// Update display duration
function updateDuration() {
    config.displayDuration = parseInt(elements.durationInput.value) * 1000;
    elements.durationValue.textContent = elements.durationInput.value;
}

// Generate mock data for demo purposes
function generateMockData(count) {
    const cities = [
        { ip: "173.198.105.40", latitude: 35.3696, longitude: -119.0105 },
        { ip: '5.165.146.0', latitude: 56.1089, longitude: 47.4821 },
        { ip: '70.118.96.132', latitude: 29.4227, longitude: -98.4927 },
    ];

    const data = [];
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < count; i++) {
        const location = cities[Math.floor(Math.random() * cities.length)];
        const timestamp = new Date(now - Math.random() * oneYear).toISOString();

        data.push({
            ...location,
            timestamp,
            // Add slight random variation to coordinates
            latitude: location.latitude + (Math.random() - 0.5) * 2,
            longitude: location.longitude + (Math.random() - 0.5) * 2
        });
    }

    return data;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);