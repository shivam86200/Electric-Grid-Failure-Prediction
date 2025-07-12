class Simulation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodeRadius = 25;
        this.darkMode = false;
        this.grid = new Grid();
        this.isRunning = false;
        this.speed = 1000;
        this.lastUpdate = 0;
        this.animationFrame = null;

        // Initialize a 3x3 hexagonal grid
        this.initializeHexGrid();
        this.resizeCanvas();

        // Color schemes
        this.colors = {
            healthy: {
                fill: '#4ade80',
                stroke: '#22c55e'
            },
            moderate: {
                fill: '#fbbf24',
                stroke: '#f59e0b'
            },
            warning: {
                fill: '#fb923c',
                stroke: '#ea580c'
            },
            critical: {
                fill: '#f87171',
                stroke: '#dc2626'
            },
            failed: {
                fill: '#b91c1c',
                stroke: '#7f1d1d'
            },
            edge: {
                normal: '#94a3b8',
                power: '#60a5fa'
            },
            text: {
                light: '#1e293b',
                dark: '#f8fafc'
            },
            background: {
                light: '#ffffff',
                dark: '#0f172a'
            }
        };
    }

    initializeHexGrid() {
        // Get canvas dimensions after resize
        this.resizeCanvas();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.2; // Responsive radius
        const hexPoints = [];

        // Calculate hexagon vertices
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6; // Rotate by -30 degrees for better alignment
            hexPoints.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }

        // Add center node
        this.grid.addNode(0, centerX, centerY);

        // Add outer nodes at hexagon vertices
        for (let i = 0; i < 6; i++) {
            this.grid.addNode(i + 1, hexPoints[i].x, hexPoints[i].y);
        }

        // Connect nodes
        for (let i = 1; i <= 6; i++) {
            this.grid.addEdge(0, i); // Connect center to outer nodes
            this.grid.addEdge(i, i === 6 ? 1 : i + 1); // Connect outer nodes
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    setSpeed(value) {
        this.speed = Math.max(100, Math.min(2000, value));
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    reset() {
        this.stop();
        this.grid = new Grid();
        this.initializeHexGrid();
        this.draw();
    }

    animate() {
        const now = Date.now();
        if (now - this.lastUpdate >= this.speed) {
            this.updateRandomNode();
            this.lastUpdate = now;
        }

        this.draw();
        if (this.isRunning) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        }
    }

    updateRandomNode() {
        const nodes = Array.from(this.grid.nodes.values());
        const node = nodes[Math.floor(Math.random() * nodes.length)];
        
        // Update load with random fluctuation
        const loadChange = Math.random() * 20 - 10; // -10 to +10
        node.load = Math.max(0, Math.min(100, node.load + loadChange));
        
        // Update voltage with small random fluctuation
        const voltageChange = Math.random() * 4 - 2; // -2 to +2
        node.voltage = Math.max(90, Math.min(110, node.voltage + voltageChange));
        
        // Update frequency with tiny random fluctuation
        const freqChange = Math.random() * 0.4 - 0.2; // -0.2 to +0.2
        node.frequency = Math.max(59.5, Math.min(60.5, node.frequency + freqChange));
        
        // Update temperature based on load
        const targetTemp = 25 + (node.load / 2); // Higher load = higher temperature
        const tempChange = (targetTemp - node.temperature) * 0.1;
        node.temperature = node.temperature + tempChange;
        
        // Randomly update weather condition (small chance)
        if (Math.random() < 0.01) { // 1% chance each update
            const conditions = ['normal', 'rain', 'storm', 'extreme'];
            node.weatherCondition = conditions[Math.floor(Math.random() * conditions.length)];
        }
        
        // Calculate load forecast error
        const actualLoad = node.load;
        const predictedLoad = node.predictNextLoad();
        node.loadForecastError = Math.abs(actualLoad - predictedLoad);

        // Update predictions and check for critical events
        this.checkAndLogCriticalEvents();
        this.grid.predictSystemFailure();
    }

    checkAndLogCriticalEvents() {
        const criticalNodes = this.grid.calculateLoadDistribution();
        criticalNodes.forEach(({ node, log }) => {
            const path = this.grid.findPathToFailedNode(node.id);
            const pathInfo = path.map(n => `${n.id}(${n.load.toFixed(1)}%)`).join(' → ');
            
            this.logEvent(`⚠️ Node ${node.id} ${log.type} (${log.load}% | Predicted: ${log.predictedLoad}%)\n` +
                         `🔄 Affected nodes: ${log.affectedCount}\n` +
                         `🛣️ Critical path: ${pathInfo}`, log.type);
        });

        // Update metrics display
        this.updateMetrics();
    }

    updateMetrics() {
        const metrics = this.grid.getSystemMetrics();
        
        // Update node status counts
        document.getElementById('totalNodes').textContent = metrics.totalNodes;
        document.getElementById('healthyNodes').textContent = metrics.healthyNodes;
        document.getElementById('moderateNodes').textContent = metrics.moderateNodes;
        document.getElementById('warningNodes').textContent = metrics.warningNodes;
        document.getElementById('criticalNodes').textContent = metrics.criticalNodes;
        document.getElementById('failedNodes').textContent = metrics.failedNodes;
        
        // Update load metrics
        document.getElementById('averageLoad').textContent = `${metrics.averageLoad}%`;
        document.getElementById('predictedLoad').textContent = `${metrics.predictedAverageLoad}%`;
        document.getElementById('systemHealth').textContent = `${metrics.systemHealth}%`;

        // Update power flow metrics
        document.getElementById('systemVoltage').textContent = `${metrics.systemVoltage} kV`;
        document.getElementById('systemFrequency').textContent = `${metrics.systemFrequency} Hz`;
        document.getElementById('avgTemperature').textContent = `${metrics.averageTemperature}°C`;
        document.getElementById('weatherCondition').textContent = metrics.weatherConditions;
        document.getElementById('powerFactor').textContent = metrics.powerFactor.toFixed(2);
        document.getElementById('lineUtilization').textContent = `${metrics.lineUtilization.toFixed(1)}%`;
        document.getElementById('substationStatus').textContent = metrics.substationStatus;

        // Update maintenance and reliability metrics
        document.getElementById('nextMaintenance').textContent = metrics.nextMaintenance;
        document.getElementById('recentFaults').textContent = metrics.recentFaults;
        document.getElementById('loadForecastError').textContent = `${metrics.loadForecastError}%`;
        document.getElementById('equipmentHealth').textContent = metrics.equipmentHealth;
        document.getElementById('outageDuration').textContent = `${Math.floor(metrics.outageDuration / 60)}h ${metrics.outageDuration % 60}m`;
        document.getElementById('restorationTime').textContent = `${Math.floor(metrics.restorationTime / 60)}h ${metrics.restorationTime % 60}m`;

        // Update failure prediction
        document.getElementById('timeToFailure').textContent = metrics.timeToFailure === Infinity ? 'Stable' : `${metrics.timeToFailure.toFixed(1)} min`;
        document.getElementById('criticalNodeId').textContent = metrics.criticalNodeId !== null ? metrics.criticalNodeId : '-';
        document.getElementById('systemStability').textContent = metrics.systemStability;

        // Update health indicator colors
        const healthIndicator = document.getElementById('systemHealth');
        if (metrics.systemHealth >= 80) {
            healthIndicator.className = 'font-medium text-green-500';
        } else if (metrics.systemHealth >= 60) {
            healthIndicator.className = 'font-medium text-yellow-500';
        } else if (metrics.systemHealth >= 40) {
            healthIndicator.className = 'font-medium text-orange-500';
        } else {
            healthIndicator.className = 'font-medium text-red-500';
        }
    }

    logEvent(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = message;
        logContainer.insertBefore(logEntry, logContainer.firstChild);

        // Limit log entries
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    drawNodes() {
        this.grid.nodes.forEach(node => {
            const color = this.colors[node.status];
            const textColor = this.darkMode ? this.colors.text.dark : this.colors.text.light;

            // Draw node circle with power flow effect
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
            
            // Create gradient fill based on load and temperature
            const tempFactor = Math.min(1, node.temperature / 90);
            const gradient = this.ctx.createRadialGradient(
                node.x, node.y, 0,
                node.x, node.y, this.nodeRadius
            );
            gradient.addColorStop(0, color.fill);
            gradient.addColorStop(0.6, color.fill);
            gradient.addColorStop(1, `rgba(${tempFactor * 255}, ${(1 - tempFactor) * 255}, 0, 1)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            this.ctx.strokeStyle = color.stroke;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Draw critical/failed indicator dot
            if (node.status === 'critical' || node.status === 'failed') {
                this.ctx.beginPath();
                this.ctx.arc(node.x + this.nodeRadius * 0.7, node.y - this.nodeRadius * 0.7, 5, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ef4444'; // Red color for the dot
                this.ctx.fill();
            }

            // Draw voltage ring
            const voltageDeviation = Math.abs(100 - node.voltage) / 100;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, this.nodeRadius + 5, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(${voltageDeviation * 255}, ${(1 - voltageDeviation) * 255}, 0, 0.5)`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw frequency indicator
            const freqDeviation = Math.abs(60 - node.frequency) / 10;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, this.nodeRadius + 8, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(0, ${(1 - freqDeviation) * 255}, ${freqDeviation * 255}, 0.5)`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw maintenance indicator
            const maintenanceOverdue = (Date.now() - node.lastMaintenance) > node.maintenanceInterval;
            if (maintenanceOverdue) {
                this.ctx.beginPath();
                this.ctx.arc(node.x - this.nodeRadius * 0.7,
                            node.y - this.nodeRadius * 0.7,
                            8, 0, Math.PI * 2);
                this.ctx.fillStyle = '#eab308';
                this.ctx.fill();
            }

            // Draw weather condition indicator
            const weatherIcons = {
                normal: '☀️',
                rain: '🌧️',
                storm: '⛈️',
                extreme: '🌪️'
            };
            this.ctx.font = '16px Arial';
            this.ctx.fillText(weatherIcons[node.weatherCondition] || '☀️',
                            node.x - this.nodeRadius * 0.7,
                            node.y + this.nodeRadius * 0.7);

            // Draw load and forecast error
            this.ctx.fillStyle = textColor;
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${node.load.toFixed(0)}%`, node.x, node.y - 8);
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`±${node.loadForecastError.toFixed(1)}%`, node.x, node.y + 8);

            // Draw prediction indicator
            if (node.predictedLoad > node.load) {
                this.ctx.beginPath();
                this.ctx.arc(node.x + this.nodeRadius * 0.7,
                            node.y - this.nodeRadius * 0.7,
                            8, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ef4444';
                this.ctx.fill();
            }
        });
    }

    drawEdges() {
        this.grid.edges.forEach(edge => {
            const start = edge.source;
            const end = edge.target;

            // Calculate edge utilization color
            const utilizationColor = this.getUtilizationColor(edge.utilization);

            // Draw power flow line with gradient based on power flow direction
            const gradient = this.ctx.createLinearGradient(start.x, start.y, end.x, end.y);
            gradient.addColorStop(0, utilizationColor);
            gradient.addColorStop(1, this.getUtilizationColor(edge.utilization * 0.8));

            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3 + (edge.utilization / 50); // Line width increases with utilization
            this.ctx.stroke();

            // Draw power flow particles with varying size based on power
            if (edge.power > 0) {
                const particleCount = Math.ceil(edge.power / 20);
                const now = Date.now();
                for (let i = 0; i < particleCount; i++) {
                    const offset = (now / 1000 + i / particleCount) % 1;
                    const x = start.x + (end.x - start.x) * offset;
                    const y = start.y + (end.y - start.y) * offset;

                    // Particle size varies with power
                    const particleSize = 2 + (edge.power / 50);

                    this.ctx.beginPath();
                    this.ctx.arc(x, y, particleSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = this.colors.edge.power;
                    this.ctx.fill();

                    // Add glow effect for high power
                    if (edge.power > 50) {
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, particleSize * 2, 0, Math.PI * 2);
                        this.ctx.fillStyle = `rgba(96, 165, 250, ${edge.power / 200})`;
                        this.ctx.fill();
                    }
            }
                }
            
        });
    }

    getUtilizationColor(utilization) {
        if (utilization >= 90) return '#ef4444';
        if (utilization >= 70) return '#f97316';
        if (utilization >= 50) return '#eab308';
        return this.colors.edge.normal;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = this.darkMode ? 
            this.colors.background.dark : 
            this.colors.background.light;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid elements
        this.drawEdges();
        this.drawNodes();
    }

    handleConfigUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.grid.loadConfiguration(config);
                this.logEvent('✅ Grid configuration loaded successfully');
                this.draw();
            } catch (error) {
                this.logEvent(`❌ Error loading configuration: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    }
    // Export the simulation class
    exportSimulation() {
        return {
            nodes: Array.from(this.grid.nodes.values()).map(node => ({
                id: node.id,
                x: node.x,
                y: node.y,
                load: node.load,
                voltage: node.voltage,
                frequency: node.frequency,
                temperature: node.temperature,
                weatherCondition: node.weatherCondition,
                status: node.status
            })),
            edges: this.grid.edges.map(edge => ({
                source: edge.source.id,
                target: edge.target.id,
                power: edge.power,
                utilization: edge.utilization
            }))
        };
    }
}