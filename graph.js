class Node {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.load = 0;
        this.voltage = 100;
        this.frequency = 60;
        this.temperature = 25;
        this.weatherCondition = 'normal';
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        this.faultHistory = [];
        this.loadForecastError = 0;
        this.status = 'healthy';
        this.connections = [];
        this.lastStatusChange = Date.now();
        this.isBlinking = false;
        this.predictedLoad = 0;
        this.loadHistory = [];
        this.maxHistoryLength = 10;
    }

    updateStatus() {
        const oldStatus = this.status;
        const maintenanceOverdue = (Date.now() - this.lastMaintenance) > this.maintenanceInterval;
        const voltageDeviation = Math.abs(100 - this.voltage);
        const frequencyDeviation = Math.abs(60 - this.frequency);
        const weatherImpact = this.weatherCondition !== 'normal' ? 10 : 0;
        
        // Calculate stress factors
        const loadStress = this.load;
        const voltageStress = voltageDeviation * 2;
        const frequencyStress = frequencyDeviation * 5;
        const temperatureStress = (this.temperature / 90) * 100;
        const maintenanceStress = maintenanceOverdue ? 20 : 0;
        
        // Calculate total stress
        const totalStress = loadStress + voltageStress + frequencyStress + 
                           temperatureStress + maintenanceStress + weatherImpact;
        
        if (totalStress >= 90) {
            this.status = 'failed';
            this.faultHistory.push({
                timestamp: Date.now(),
                type: 'System Stress Critical',
                load: this.load,
                voltage: this.voltage,
                frequency: this.frequency,
                temperature: this.temperature,
                weather: this.weatherCondition
            });
            if (this.faultHistory.length > 50) this.faultHistory.shift();
        } else if (totalStress >= 80) {
            this.status = 'critical';
        } else if (totalStress >= 60) {
            this.status = 'warning';
        } else if (totalStress >= 40) {
            this.status = 'moderate';
        } else {
            this.status = 'healthy';
        }

        if (oldStatus !== this.status) {
            this.lastStatusChange = Date.now();
            this.isBlinking = ['critical', 'failed'].includes(this.status);
        }
    }

    updateLoadHistory() {
        this.loadHistory.push(this.load);
        if (this.loadHistory.length > this.maxHistoryLength) {
            this.loadHistory.shift();
        }
    }

    predictNextLoad() {
        if (this.loadHistory.length < 2) return this.load;

        // Calculate load trend using linear regression
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = this.loadHistory.length;

        this.loadHistory.forEach((load, i) => {
            sumX += i;
            sumY += load;
            sumXY += i * load;
            sumX2 += i * i;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Predict next load value
        this.predictedLoad = Math.max(0, Math.min(100, intercept + slope * n));
        return this.predictedLoad;
    }

    predictFailure() {
        const totalStress = this.calculateStress();
        if (totalStress < 80) {
            return { timeToFailure: Infinity, reason: 'Stable' };
        }

        const stressRate = (totalStress - 80) / 20; // Rate of stress increase
        const timeToFailure = (100 - totalStress) / (stressRate * 60); // in minutes

        let reason = 'High Load';
        if (this.voltage < 95 || this.voltage > 105) reason = 'Voltage Deviation';
        if (this.frequency < 59.8 || this.frequency > 60.2) reason = 'Frequency Instability';
        if (this.temperature > 80) reason = 'High Temperature';

        return { timeToFailure, reason };
    }

    calculateStress() {
        const maintenanceOverdue = (Date.now() - this.lastMaintenance) > this.maintenanceInterval;
        const voltageDeviation = Math.abs(100 - this.voltage);
        const frequencyDeviation = Math.abs(60 - this.frequency);
        const weatherImpact = this.weatherCondition !== 'normal' ? 10 : 0;

        const loadStress = this.load;
        const voltageStress = voltageDeviation * 2;
        const frequencyStress = frequencyDeviation * 5;
        const temperatureStress = (this.temperature / 90) * 100;
        const maintenanceStress = maintenanceOverdue ? 20 : 0;

        return loadStress + voltageStress + frequencyStress +
               temperatureStress + maintenanceStress + weatherImpact;
    }
}

class Edge {
    constructor(source, target) {
        this.source = source;
        this.target = target;
        this.power = 0;
        this.capacity = 100;
        this.utilization = 0;
    }

    calculatePower() {
        const loadDiff = Math.abs(this.source.load - this.target.load);
        const voltageRatio = Math.min(this.source.voltage, this.target.voltage) / 100;
        this.power = loadDiff * voltageRatio;
        this.utilization = (this.power / this.capacity) * 100;
        return this.power;
    }
}

class Grid {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.failureLog = [];
        this.predictionWindow = 5; // seconds to look ahead
        this.powerFactor = 0.95;
        this.lineUtilization = 0;
        this.substationStatus = 'Online';
        this.equipmentHealth = 'Good';
        this.outageDuration = 0;
        this.restorationTime = 0;
        this.timeToFailure = Infinity;
        this.criticalNodeId = null;
        this.systemStability = 'Stable';
    }

    addNode(id, x, y) {
        const node = new Node(id, x, y);
        this.nodes.set(id, node);
        return node;
    }

    addEdge(sourceId, targetId) {
        const source = this.nodes.get(sourceId);
        const target = this.nodes.get(targetId);
        if (source && target) {
            const edge = new Edge(source, target);
            this.edges.push(edge);
            source.connections.push(target);
            target.connections.push(source);
            return edge;
        }
        return null;
    }

    findAffectedNodes(startNodeId) {
        const startNode = this.nodes.get(startNodeId);
        if (!startNode) return [];

        const visited = new Set();
        const affected = [];

        const dfs = (node, loadThreshold, depth = 0) => {
            visited.add(node.id);
            if (node.load >= loadThreshold || node.predictedLoad >= loadThreshold) {
                affected.push(node);
            }

            if (depth < 3) { // Limit propagation depth
                for (const neighbor of node.connections) {
                    if (!visited.has(neighbor.id)) {
                        // Load propagation decreases with distance and edge utilization
                        const edge = this.edges.find(e => 
                            (e.source === node && e.target === neighbor) ||
                            (e.source === neighbor && e.target === node)
                        );
                        const propagationFactor = Math.max(0.5, 1 - (edge.utilization / 100));
                        const propagatedThreshold = loadThreshold * propagationFactor;
                        dfs(neighbor, propagatedThreshold, depth + 1);
                    }
                }
            }
        };

        dfs(startNode, 70); // Start DFS from nodes with load >= 70%
        return affected;
    }

    findPathToFailedNode(startNodeId) {
        const startNode = this.nodes.get(startNodeId);
        if (!startNode) return [];

        const queue = [[startNode]];
        const visited = new Set([startNode.id]);

        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];

            if (node.status === 'failed' || node.predictedLoad >= 90) {
                return path;
            }

            for (const neighbor of node.connections) {
                if (!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    queue.push([...path, neighbor]);
                }
            }
        }

        return [];
    }

    logFailure(node, affectedNodes) {
        const timestamp = new Date().toLocaleTimeString();
        const predictedLoads = affectedNodes.map(n => ({
            id: n.id,
            current: n.load.toFixed(1),
            predicted: n.predictedLoad.toFixed(1)
        }));

        const log = {
            timestamp,
            nodeId: node.id,
            load: node.load.toFixed(1),
            predictedLoad: node.predictedLoad.toFixed(1),
            affectedCount: affectedNodes.length,
            affectedNodes: predictedLoads,
            type: node.status
        };

        this.failureLog.unshift(log);
        if (this.failureLog.length > 50) this.failureLog.pop();
        return log;
    }

    calculateLoadDistribution() {
        const criticalNodes = [];

        // Update load histories and predictions
        this.nodes.forEach(node => {
            node.updateLoadHistory();
            node.predictNextLoad();
        });

        // Update edge power flows
        this.edges.forEach(edge => edge.calculatePower());

        // Distribute load and identify critical nodes
        this.nodes.forEach(node => {
            if (node.load >= 70 || node.predictedLoad >= 80) {
                const affectedNodes = this.findAffectedNodes(node.id);
                if (affectedNodes.length > 0) {
                    const log = this.logFailure(node, affectedNodes);
                    criticalNodes.push({ node, log });
                }

                // Distribute excess load based on edge utilization
                const excessLoad = (node.load - 60) / node.connections.length;
                node.connections.forEach(neighbor => {
                    const edge = this.edges.find(e => 
                        (e.source === node && e.target === neighbor) ||
                        (e.source === neighbor && e.target === node)
                    );
                    const loadFactor = 1 - (edge.utilization / 100);
                    neighbor.load = Math.min(100, neighbor.load + (excessLoad * loadFactor));
                    neighbor.updateStatus();
                });
            }
            node.updateStatus();
        });

        return criticalNodes;
    }

    getSystemMetrics() {
        let totalLoad = 0;
        let totalPredictedLoad = 0;
        let totalVoltage = 0;
        let totalFrequency = 0;
        let totalTemperature = 0;
        let totalForecastError = 0;
        let healthyCount = 0;
        let moderateCount = 0;
        let warningCount = 0;
        let criticalCount = 0;
        let failedCount = 0;
        let recentFaultsCount = 0;

        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        this.nodes.forEach(node => {
            totalLoad += node.load;
            totalPredictedLoad += node.predictedLoad;
            totalVoltage += node.voltage;
            totalFrequency += node.frequency;
            totalTemperature += node.temperature;
            totalForecastError += node.loadForecastError;

            // Count recent faults (within last hour)
            recentFaultsCount += node.faultHistory.filter(fault => 
                now - fault.timestamp < oneHour
            ).length;

            switch (node.status) {
                case 'healthy':
                    healthyCount++;
                    break;
                case 'moderate':
                    moderateCount++;
                    break;
                case 'warning':
                    warningCount++;
                    break;
                case 'critical':
                    criticalCount++;
                    break;
                case 'failed':
                    failedCount++;
                    break;
            }
        });

        const nodeCount = this.nodes.size;
        const nextMaintenanceNode = Array.from(this.nodes.values())
            .sort((a, b) => (a.lastMaintenance + a.maintenanceInterval) - 
                           (b.lastMaintenance + b.maintenanceInterval))[0];

        return {
            totalNodes: nodeCount,
            healthyNodes: healthyCount,
            moderateNodes: moderateCount,
            warningNodes: warningCount,
            criticalNodes: criticalCount,
            failedNodes: failedCount,
            averageLoad: (totalLoad / nodeCount).toFixed(1),
            predictedAverageLoad: (totalPredictedLoad / nodeCount).toFixed(1),
            systemHealth: ((healthyCount / nodeCount) * 100).toFixed(1),
            systemVoltage: (totalVoltage / nodeCount).toFixed(1),
            systemFrequency: (totalFrequency / nodeCount).toFixed(2),
            averageTemperature: (totalTemperature / nodeCount).toFixed(1),
            loadForecastError: (totalForecastError / nodeCount).toFixed(2),
            recentFaults: recentFaultsCount,
            nextMaintenance: new Date(nextMaintenanceNode.lastMaintenance + 
                                    nextMaintenanceNode.maintenanceInterval).toLocaleDateString(),
            weatherConditions: Array.from(new Set(
                Array.from(this.nodes.values()).map(n => n.weatherCondition)
            )).join(', '),
            powerFactor: this.powerFactor,
            lineUtilization: this.lineUtilization,
            substationStatus: this.substationStatus,
            equipmentHealth: this.equipmentHealth,
            outageDuration: this.outageDuration,
            restorationTime: this.restorationTime,
            timeToFailure: this.timeToFailure,
            criticalNodeId: this.criticalNodeId,
            systemStability: this.systemStability
        };
    }

    predictSystemFailure() {
        let minTimeToFailure = Infinity;
        let criticalNode = null;

        this.nodes.forEach(node => {
            const { timeToFailure } = node.predictFailure();
            if (timeToFailure < minTimeToFailure) {
                minTimeToFailure = timeToFailure;
                criticalNode = node;
            }
        });

        this.timeToFailure = minTimeToFailure;
        this.criticalNodeId = criticalNode ? criticalNode.id : null;

        if (minTimeToFailure < 5) {
            this.systemStability = 'Critical';
        } else if (minTimeToFailure < 30) {
            this.systemStability = 'Unstable';
        } else {
            this.systemStability = 'Stable';
        }
    }

    loadConfiguration(config) {
        this.nodes.clear();
        this.edges = [];
        this.failureLog = [];

        config.nodes.forEach(node => {
            const newNode = this.addNode(node.id, node.x, node.y);
            if (node.load) newNode.load = node.load;
            if (node.voltage) newNode.voltage = node.voltage;
        });

        config.edges.forEach(edge => {
            this.addEdge(edge.source, edge.target);
        });

        return this;
    }
}