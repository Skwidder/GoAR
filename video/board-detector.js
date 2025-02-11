const EventEmitter = require('events');

class BoardDetector extends EventEmitter {
    constructor() {
        super();
        this.corners = [];
        this.gridSize = 19; // Standard Go board size
    }

    addCorner(x, y) {
        if (this.corners.length >= 4) return false;
        
        this.corners.push({x, y});

        return true;
    }

    reset() {
        this.corners = [];
        this.emit('reset');
    }

    calculateGridPoints() {
        if (this.corners.length !== 4) return null;

        const gridPoints = [];

        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            const t = y / (this.gridSize - 1);
            
            const leftEdge = this.interpolate(this.corners[0], this.corners[3], t);
            const rightEdge = this.interpolate(this.corners[1], this.corners[2], t);
            
            for (let x = 0; x < this.gridSize; x++) {
                const s = x / (this.gridSize - 1);
                row.push(this.interpolate(leftEdge, rightEdge, s));
            }
            
            gridPoints.push(row);
        }

        return gridPoints;
    }

    interpolate(p1, p2, t) {
        return {
            x: Math.round(p1.x + (p2.x - p1.x) * t),
            y: Math.round(p1.y + (p2.y - p1.y) * t)
        };
    }

    getCorners() {
        return [...this.corners];
    }

    // Convert board coordinates (0-18) to screen coordinates
    boardToScreen(boardX, boardY) {
        const grid = this.calculateGridPoints();
        if (!grid || boardX < 0 || boardX >= this.gridSize || 
            boardY < 0 || boardY >= this.gridSize) return null;
        
        return grid[boardY][boardX];
    }

    // Attempt to convert screen coordinates to nearest board position
    screenToBoard(screenX, screenY) {
        const grid = this.calculateGridPoints();
        if (!grid) return null;

        let closestDist = Infinity;
        let closestPoint = null;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const point = grid[y][x];
                const dist = Math.hypot(point.x - screenX, point.y - screenY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPoint = {x, y};
                }
            }
        }

        return closestPoint;
    }
}

module.exports = { BoardDetector };