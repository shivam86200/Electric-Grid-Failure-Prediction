document.addEventListener('DOMContentLoaded', () => {
    const simulation = new Simulation('gridCanvas');

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');

    // Set initial theme based on system preference or local storage
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        simulation.darkMode = true;
    } else {
        document.body.classList.remove('dark');
        simulation.darkMode = false;
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDarkMode = document.body.classList.contains('dark');
        localStorage.theme = isDarkMode ? 'dark' : 'light';
        simulation.darkMode = isDarkMode;
        const startSimBtn = document.getElementById('startSimBtn');
        const stopSimBtn = document.getElementById('stopSimBtn');

        if (startSimBtn && stopSimBtn) {
            startSimBtn.addEventListener('click', () => {
                simulation.start();
                startSimBtn.disabled = true;
                stopSimBtn.disabled = false;
            });
            stopSimBtn.addEventListener('click', () => {
                simulation.stop();
                startSimBtn.disabled = false;
                stopSimBtn.disabled = true;
            });
            stopSimBtn.disabled = true;
        }

        // --- Node Load Slider: update all nodes for demo ---
        const loadSlider = document.getElementById('loadSlider');
        if (loadSlider) {
            loadSlider.oninput = function() {
                document.getElementById('loadValue').innerText = this.value + '%';
                simulation.grid.nodes.forEach(node => {
                    node.load = parseFloat(this.value);
                });
                simulation.draw();
            };
        }

        // --- Settings Panel: Live Update ---
        function applySettings() {
            // Number of Nodes
            const numNodes = parseInt(document.getElementById('numNodes').value);
            if (!isNaN(numNodes) && numNodes !== simulation.grid.nodes.size) {
                simulation.reset();
                // Optionally, re-initialize grid with new node count (if supported)
            }
            // Grid Complexity
            const gridType = document.getElementById('gridComplexity').value;
            // You could modify simulation.grid based on gridType if your logic supports it
            // Component Types
            const compType = document.getElementById('componentTypes').value;
            // Noise Level
            const noise = parseFloat(document.getElementById('noiseLevel').value);
            simulation.noiseLevel = noise;
            // Prediction Logic (example for thresholds)
            // Add more as needed for your logic
            // Sensitivity, thresholds, etc.
            // ...
            simulation.draw();
            showToast('Settings updated', 'warning');
        }
        // Listen for changes on all relevant settings inputs
        [
            'numNodes','gridComplexity','componentTypes','noiseLevel',
            // Add more IDs for prediction logic inputs here
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', applySettings);
        });
    });

    // Load slider
    const loadSlider = document.getElementById('loadSlider');
    loadSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        document.getElementById('loadValue').textContent = `${value}%`;
    });

    loadSlider.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        const nodes = Array.from(simulation.grid.nodes.values());
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        randomNode.load = value;
        simulation.checkAndLogCriticalEvents();
        simulation.draw();
    });

    // Speed control
    const speedControl = document.getElementById('speedControl');
    speedControl.addEventListener('change', (e) => {
        const speeds = {
            'slow': 2000,
            'medium': 1000,
            'fast': 500
        };
        simulation.setSpeed(speeds[e.target.value]);
    });

    // Simulation controls
    document.getElementById('startButton').addEventListener('click', () => {
        simulation.start();
        document.getElementById('startButton').classList.add('hidden');
        document.getElementById('stopButton').classList.remove('hidden');
    });

    document.getElementById('stopButton').addEventListener('click', () => {
        simulation.stop();
        document.getElementById('stopButton').classList.add('hidden');
        document.getElementById('startButton').classList.remove('hidden');
    });

    document.getElementById('resetButton').addEventListener('click', () => {
        simulation.reset();
        document.getElementById('stopButton').classList.add('hidden');
        document.getElementById('startButton').classList.remove('hidden');
    });

    document.getElementById('downloadButton').addEventListener('click', () => {
        const data = simulation.exportSimulation();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "simulation_state.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // File upload
    const fileInput = document.getElementById('configUpload');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            simulation.handleConfigUpload(e.target.files[0]);
        }
    });

    // Update power flow metrics
    function updatePowerFlowMetrics() {
        const grid = simulation.grid;
        document.getElementById('systemVoltage').textContent = `${grid.systemVoltage.toFixed(1)} kV`;
        document.getElementById('systemFrequency').textContent = `${grid.systemFrequency.toFixed(2)} Hz`;
        document.getElementById('avgTemperature').textContent = `${grid.averageTemperature.toFixed(1)}°C`;
        document.getElementById('weatherCondition').textContent = grid.weatherCondition;
        document.getElementById('powerFactor').textContent = grid.powerFactor.toFixed(2);
        document.getElementById('lineUtilization').textContent = `${grid.lineUtilization.toFixed(1)}%`;
        document.getElementById('substationStatus').textContent = grid.substationStatus;
    }

    // Update maintenance and reliability metrics
    function updateMaintenanceMetrics() {
        const grid = simulation.grid;
        document.getElementById('nextMaintenance').textContent = grid.nextMaintenanceDate;
        document.getElementById('recentFaults').textContent = grid.recentFaults;
        document.getElementById('loadForecastError').textContent = `${grid.loadForecastError.toFixed(2)}%`;
        document.getElementById('equipmentHealth').textContent = grid.equipmentHealth;
        document.getElementById('outageDuration').textContent = `${Math.floor(grid.outageDuration / 60)}h ${grid.outageDuration % 60}m`;
        document.getElementById('restorationTime').textContent = `${Math.floor(grid.restorationTime / 60)}h ${grid.restorationTime % 60}m`;
    }

    // Add update calls to simulation loop
    const originalDraw = simulation.draw.bind(simulation);
    simulation.draw = () => {
        originalDraw();
        updatePowerFlowMetrics();
        updateMaintenanceMetrics();
    };

    // Initial draw
    simulation.draw();

    // --- Tab Navigation Logic ---
    const dashboardSection = document.getElementById('dashboardSection');
    const settingsSection = document.getElementById('settingsSection');
    const aboutSection = document.getElementById('aboutSection');
    document.getElementById('navDashboard').addEventListener('click', function() {
        dashboardSection.classList.remove('hidden');
        settingsSection.classList.add('hidden');
        if (aboutSection) aboutSection.classList.add('hidden');
    });
    document.getElementById('navSettings').addEventListener('click', function() {
        dashboardSection.classList.add('hidden');
        settingsSection.classList.remove('hidden');
        if (aboutSection) aboutSection.classList.add('hidden');
    });
    if (document.getElementById('navAbout')) {
        document.getElementById('navAbout').addEventListener('click', function() {
            dashboardSection.classList.add('hidden');
            settingsSection.classList.add('hidden');
            aboutSection.classList.remove('hidden');
        });
    }

});