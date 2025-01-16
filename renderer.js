let ctx;
let corners = [];
let videoElement;
let videoContext; 
let overlay;
let stoneDetec;
let cvLoading = false;

async function initializeCamera() {
    try {

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 60 }
            } 
        });

        videoElement = document.getElementById('webcam');
        videoElement.srcObject = stream;

        await new Promise(resolve => videoElement.onloadedmetadata = resolve);

        const videoCanvas = document.createElement('canvas');
        videoCanvas.width = videoElement.videoWidth;
        videoCanvas.height = videoElement.videoHeight;
        videoContext = videoCanvas.getContext('2d');

        // Start frame capture loop
        function captureFrame() {
            videoContext.drawImage(videoElement, 0, 0, videoCanvas.width, videoCanvas.height);
            requestAnimationFrame(captureFrame);
        }
        captureFrame();

        console.log('Canvas dimensions:', {
            width: videoContext.canvas.width,
            height: videoContext.canvas.height
        });

        // Set up overlay canvas
        overlay = document.getElementById('overlay');
        ctx = overlay.getContext('2d');
        
        setupResizeHandling();
        setupBoardControls();
        setupCornerSelection();
        stoneDetec = new SmoothStoneDetector();

    } catch (err) {
        console.error('Error accessing camera:', err);
    }
}

// Rest of your functions remain the same
function setupResizeHandling() {
    const resizeCanvas = () => {
        const videoRect = videoElement.getBoundingClientRect();
        overlay.width = videoRect.width;
        overlay.height = videoRect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function setupCornerSelection() {
    overlay.addEventListener('click', (e) => {
        if (corners.length >= 4) return;

        const rect = overlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        corners.push({x,y});
        drawCorners();

        if (corners.length === 4) {
            drawBoard();
            console.log('Corner points:', corners);
        }
    });
}

function setupBoardControls() {
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Corners';
    resetBtn.onclick = () => {
        corners = [];
        ctx.clearRect(0, 0, overlay.width, overlay.height);
    };
    document.getElementById('controls').appendChild(resetBtn);
}

function calculateGridPoints() {
    function interpolate(p1, p2, t) {
        return {
            x: Math.round(p1.x + (p2.x - p1.x) * t),
            y: Math.round(p1.y + (p2.y - p1.y) * t)
        };
    }

    const gridPoints = [];

    for (let y = 0; y < 19; y++) {
        const row = [];
        const t = y / 18;
        
        const leftEdge = interpolate(corners[0], corners[3], t);
        const rightEdge = interpolate(corners[1], corners[2], t);
        
        for (let x = 0; x < 19; x++) {
            const s = x / 18;
            row.push(interpolate(leftEdge, rightEdge, s));
        }
        
        gridPoints.push(row);
    }
    return gridPoints;
}

function drawBoard() {
    const grid = calculateGridPoints();
    if (!grid) return;
    
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 5;

    // Draw horizontal lines
    for (let y = 0; y < 19; y++) {
        ctx.beginPath();
        ctx.moveTo(grid[y][0].x, grid[y][0].y);
        for (let x = 1; x < 19; x++) {
            ctx.lineTo(grid[y][x].x, grid[y][x].y);
        }
        ctx.stroke();
    }
    
    // Draw vertical lines
    for (let x = 0; x < 19; x++) {
        ctx.beginPath();
        ctx.moveTo(grid[0][x].x, grid[0][x].y);
        for (let y = 1; y < 19; y++) {
            ctx.lineTo(grid[y][x].x, grid[y][x].y);
        }
        ctx.stroke();
    }
    
    drawCorners();

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept Grid';
    acceptBtn.onclick = () => {
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        stoneDetec.calibrateEmpty(videoContext, grid);
        const read = document.createElement('button');
        read.textContent = 'read';
        read.onclick = () => {
            stoneDetec.updateReadings(videoContext, grid);
        };
        document.getElementById('controls').appendChild(read);

        const calcAndShow = document.createElement('button');
        calcAndShow.textContent = 'calc and show';
        calcAndShow.onclick = () => {
            stoneDetec.getSmoothedState();
            stoneDetec.drawDebug(ctx, grid);
        };
        document.getElementById('controls').appendChild(calcAndShow);
    };
    document.getElementById('controls').appendChild(acceptBtn);
}

function drawCorners() {
    corners.forEach((point,index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(index + 1, point.x + 10, point.y + 10);
    });
}

function drawStone(x, y, color) {
    const grid = calculateGridPoints();
    if (!grid || x < 0 || x >= 19 || y < 0 || y >= 19) return;
    
    const point = grid[y][x];
    const stoneSize = Math.min(
        Math.abs(grid[0][1].x - grid[0][0].x),
        Math.abs(grid[1][0].y - grid[0][0].y)
    ) * 0.5;
    
    ctx.beginPath();
    ctx.arc(point.x, point.y, stoneSize, 0, 2 * Math.PI);
    
    const gradient = ctx.createRadialGradient(
        point.x - stoneSize/3, 
        point.y - stoneSize/3, 
        stoneSize/10,
        point.x,
        point.y,
        stoneSize
    );
    
    if (color === 'black') {
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(1, '#000');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ddd');
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
}

function updateBoard(gameState) {
    // ... board update code ...
}

// Initialize everything when the start button is clicked
document.getElementById('startCamera').addEventListener('click', initializeCamera);