class OverlayRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.penPaths = new Map(); // Store active pen paths by color
            // Test drawing
    console.log("Testing canvas drawing...");
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(0, 0, 100, 100);
    }

    resize(width, height) {
        console.log("Resizing overlay to:", width, height);
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: ${width}px;
            height: ${height}px;
        `;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawCorners(corners) {
        console.log("test");
        corners.forEach((point, index) => {
            console.log(point.x + "," + point.y);
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'red';
            this.ctx.fill();

            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(index + 1, point.x + 10, point.y + 10);
        });
    }

    drawBoard(gridPoints) {
        if (!gridPoints) return;
        
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;

        // Draw horizontal lines
        for (let y = 0; y < gridPoints.length; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(gridPoints[y][0].x, gridPoints[y][0].y);
            for (let x = 1; x < gridPoints[y].length; x++) {
                this.ctx.lineTo(gridPoints[y][x].x, gridPoints[y][x].y);
            }
            this.ctx.stroke();
        }
        
        // Draw vertical lines
        for (let x = 0; x < gridPoints[0].length; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(gridPoints[0][x].x, gridPoints[0][x].y);
            for (let y = 1; y < gridPoints.length; y++) {
                this.ctx.lineTo(gridPoints[y][x].x, gridPoints[y][x].y);
            }
            this.ctx.stroke();
        }
    }

    drawStone(point, color, gridPoints) {
        if (!point || !gridPoints) return;

        const stoneSize = Math.min(
            Math.abs(gridPoints[0][1].x - gridPoints[0][0].x),
            Math.abs(gridPoints[1][0].y - gridPoints[0][0].y)
        ) * 0.5;
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, stoneSize, 0, 2 * Math.PI);
        
        const gradient = this.ctx.createRadialGradient(
            point.x - stoneSize/3, 
            point.y - stoneSize/3, 
            stoneSize/10,
            point.x,
            point.y,
            stoneSize
        );
        
        if (color === 1) {
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
        } else if (color === -1) {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    startPenStroke(position, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(position.x, position.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Store the path
        this.penPaths.set(color, [{x: position.x, y: position.y}]);
    }

    continuePenStroke(position, color) {
        const path = this.penPaths.get(color);
        if (!path) return;

        path.push({x: position.x, y: position.y});
        
        // Draw the new segment
        this.ctx.beginPath();
        this.ctx.moveTo(path[path.length - 2].x, path[path.length - 2].y);
        this.ctx.lineTo(position.x, position.y);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    clearPenStrokes() {
        this.penPaths.clear();
        // Note: This doesn't clear the canvas - that should be handled by redrawing the board
    }
}

module.exports = { OverlayRenderer };