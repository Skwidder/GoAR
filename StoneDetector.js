class SmoothStoneDetector {
    constructor(gridSize = 19, historyLength = 10) {
        this.gridSize = gridSize;
        this.historyLength = historyLength;
        this.emptyBoardColors = null;
        
        // Initialize history arrays for each intersection
        this.history = Array(gridSize).fill().map(() => 
            Array(gridSize).fill().map(() => ({
                readings: [],         // Store recent detections
                lastStable: null      // Last stable state
            }))
        );
    }

    // Calibrate by sampling empty board
    calibrateEmpty(ctx, gridPoints) {
        this.emptyBoardColors = [];
        
        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            for (let x = 0; x < this.gridSize; x++) {
                const brightness = this.samplePoint(ctx, gridPoints[y][x]);
                row.push(brightness);
            }
            this.emptyBoardColors.push(row);
        }
        console.log(this.emptyBoardColors);
    }

    // Sample average brightness around a point
    samplePoint(ctx, point, radius = 5) {
        const imageData = ctx.getImageData(
            point.x - radius, 
            point.y - radius, 
            radius * 2, 
            radius * 2
        );
        console.log(point.x + "," + point.y);

        let total = 0;
        let count = 0;

        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const brightness = (r + g + b) / 3;
            total += brightness;
            count++;
        }
        return total / count;
    }

    // Update history with new readings
    updateReadings(ctx, gridPoints) {
        const timestamp = Date.now();

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const currentBrightness = this.samplePoint(ctx, gridPoints[y][x]);
                const emptyBrightness = this.emptyBoardColors[y][x];
                const difference = currentBrightness - emptyBrightness;

                console.log(x + "," + y +": " + difference + ":" + emptyBrightness + ":" + currentBrightness);
                // Determine stone color and confidence
                let reading = {
                    timestamp,
                    brightness: currentBrightness,
                    difference,
                    stone: null,
                    confidence: 0
                };

                if (difference < -30) {  // Likely black stone
                    reading.stone = 'B';
                    reading.confidence = Math.min(1, Math.abs(difference) / 50);
                } else if (difference > 30) {  // Likely white stone
                    reading.stone = 'W';
                    reading.confidence = Math.min(1, Math.abs(difference) / 50);
                } else {  // Likely empty
                    reading.stone = null;
                    reading.confidence = 1 - (Math.abs(difference) / 30);
                }

                // Add to history
                this.history[y][x].readings.push(reading);
                
                // Keep only recent readings
                if (this.history[y][x].readings.length > this.historyLength) {
                    this.history[y][x].readings.shift();
                }
            }
        }
    }

    // Get the smoothed state of the board
    getSmoothedState() {
        const state = [];

        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            for (let x = 0; x < this.gridSize; x++) {
                row.push(this.getIntersectionState(y, x));
            }
            state.push(row);
        }
        console.log(state);
        return state;
    }

    // Analyze history for a single intersection
    getIntersectionState(y, x) {
        const readings = this.history[y][x].readings;
        if (readings.length === 0) return null;

        // Count weighted votes for each state
        const votes = {
            'B': 0,
            'W': 0,
            'null': 0
        };

        // Weight recent readings more heavily
        readings.forEach((reading, index) => {
            const recency = (index + 1) / readings.length;  // 0-1, higher for more recent
            const weight = reading.confidence * recency;
            const key = reading.stone === null ? 'null' : reading.stone;
            votes[key] += weight;
        });


        const total = votes.B + votes.W + votes.null;
        const threshold = 0.6;  // 60% confidence required

        if (votes.B / total > threshold) {
            this.history[y][x].lastStable = 'B';
            return 'B';
        } else if (votes.W / total > threshold) {
            this.history[y][x].lastStable = 'W';
            return 'W';
        } else if (votes.null / total > threshold) {
            this.history[y][x].lastStable = null;
            return null;
        }

        // If no clear winner, return last stable state
        return this.history[y][x].lastStable;
    }

    // Debug visualization
    drawDebug(ctx, gridPoints) {
        const radius = 5;
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const point = gridPoints[y][x];
                const readings = this.history[y][x].readings;
                const current = readings[readings.length - 1];
                
                if (!current) continue;

                // Draw sample area
                ctx.strokeStyle = current.stone === 'B' ? 'red' : 
                                current.stone === 'W' ? 'blue' : 
                                'green';
                ctx.lineWidth = current.confidence * 3;
                ctx.strokeRect(
                    point.x - radius,
                    point.y - radius,
                    radius * 2,
                    radius * 2
                );
                
                // Show confidence value
                ctx.fillStyle = 'yellow';
                ctx.font = '10px Arial';
                ctx.fillText(
                    `${Math.round(current.confidence * 100)}%`,
                    point.x + radius + 2,
                    point.y
                );
            }
        }
    }
}