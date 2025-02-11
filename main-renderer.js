const { CameraManager } = require("./video/camera-manager.js");
const { BoardDetector } = require("./video/board-detector.js");
const { OverlayRenderer } = require("./video/overlay-renderer.js");
const { OGSConnection } = require("./OGS.js");
const { ReviewBoard } = require("./reviewBoard.js");
const { SmoothStoneDetector } = require("./StoneDetector.js");

class GoARManager {
    constructor() {
        this.cameraManager = new CameraManager();
        this.boardDetector = new BoardDetector();
        this.overlayRenderer = null;
        this.ogsConnection = null;
        this.reviewBoard = null;
        this.stoneDetector = null;
    }

    async initialize() {
        let videoElement = document.getElementById('webcam');

        // await new Promise(resolve => videoElement.onloadedmetadata = resolve);

        // Calculate size that maintains aspect ratio
        const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
        const containerRect = videoElement.getBoundingClientRect();
        const containerAspect = containerRect.width / containerRect.height;

        let displayWidth, displayHeight;

        if (containerAspect > videoAspect) {
            // Container is wider than video
            displayHeight = containerRect.height;
            displayWidth = displayHeight * videoAspect;
        } else {
            // Container is taller than video
            displayWidth = containerRect.width;
            displayHeight = displayWidth / videoAspect;
        }

        // Round to whole pixels
        displayWidth = Math.round(displayWidth);
        displayHeight = Math.round(displayHeight);

        // Set all canvases to match the calculated size
        const videoCanvas = document.createElement('canvas');
        videoCanvas.width = displayWidth;
        videoCanvas.height = displayHeight;
        let videoContext = videoCanvas.getContext('2d');

        let overlay = document.getElementById('overlay');
        overlay.width = displayWidth;
        overlay.height = displayHeight;

        
        // Initialize components
        this.overlayRenderer = new OverlayRenderer(overlay);
        await this.cameraManager.initialize(videoElement);
        this.stoneDetector = new SmoothStoneDetector(19,10);

        console.log("Camera initialized with dimensions:", this.cameraManager.getDimensions());
        
        // Setup OGS connection and review board
        this.ogsConnection = new OGSConnection(1402863); // Replace with configurable review ID
        this.reviewBoard = new ReviewBoard(this.ogsConnection, 19);
        
        this.setupEventListeners();
        this.setupControls();
    }

    setupEventListeners() {
        // Camera events
        this.cameraManager.on('initialized', ({width, height}) => {
            this.overlayRenderer.resize(width, height);
        });

        this.cameraManager.on('resize', ({width, height}) => {
            this.overlayRenderer.resize(width, height);
            if (this.boardDetector.getCorners().length === 4) {
                this.redrawBoard();
            }
        });


        // Review board events
        this.reviewBoard.on('Move', (reviewData) => {
            this.updateBoardState(reviewData);
        });

        // OGS events
        this.ogsConnection.on('penPosition', ({position, color, isNewStroke}) => {
            if (isNewStroke) {
                this.overlayRenderer.startPenStroke(position, color);
            } else {
                this.overlayRenderer.continuePenStroke(position, color);
            }
        });

        this.ogsConnection.on('clearPen', () => {
            this.overlayRenderer.clearPenStrokes();
            this.redrawBoard();
        });

        // Canvas click handler for corner selection
        this.overlayRenderer.canvas.addEventListener('click', (e) => {
            console.log(e);
            const rect = this.overlayRenderer.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.boardDetector.addCorner(x, y);
            const corners = this.boardDetector.getCorners();
            this.overlayRenderer.drawCorners(corners);

            if(corners.length >= 4){
                this.overlayRenderer.drawBoard(this.boardDetector.calculateGridPoints());
            }
        });
    }

    setupControls() {
        const controls = document.getElementById('controls');

        // Reset corners button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Corners';
        resetBtn.onclick = () => {
            this.boardDetector.reset();
            this.overlayRenderer.clear();
        };
        controls.appendChild(resetBtn);

        // Accept grid button (only shown when corners are complete)
        this.boardDetector.on('cornersComplete', () => {
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Accept Grid';
            acceptBtn.onclick = () => {
                const gridPoints = this.boardDetector.calculateGridPoints();
                this.stoneDetector.calibrateEmpty(this.cameraManager.getFrame(), gridPoints);
                this.setupStoneDetectionControls();
            };
            controls.appendChild(acceptBtn);
        });
    }

    setupStoneDetectionControls() {
        const controls = document.getElementById('controls');

        const readBtn = document.createElement('button');
        readBtn.textContent = 'Read Stones';
        readBtn.onclick = () => {
            const gridPoints = this.boardDetector.calculateGridPoints();
            this.stoneDetector.updateReadings(this.cameraManager.getFrame(), gridPoints);
        };
        controls.appendChild(readBtn);

        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Show Debug';
        debugBtn.onclick = () => {
            const gridPoints = this.boardDetector.calculateGridPoints();
            this.stoneDetector.getSmoothedState();
            this.stoneDetector.drawDebug(this.overlayRenderer.ctx, gridPoints);
        };
        controls.appendChild(debugBtn);
    }

    redrawBoard() {
        const gridPoints = this.boardDetector.calculateGridPoints();
        this.overlayRenderer.clear();
        this.overlayRenderer.drawBoard(gridPoints);
    }

    updateBoardState(reviewData) {
        this.overlayRenderer.clear();
        const gridPoints = this.boardDetector.calculateGridPoints();
        
        // Update stone detector readings
        this.stoneDetector.updateReadings(this.cameraManager.getFrame(), gridPoints);
        const boardState = this.stoneDetector.getSmoothedState();

        // Draw stones where needed
        for (let row = 0; row < 19; row++) {
            for (let col = 0; col < 19; col++) {
                if (boardState[row][col] === 0) {
                    if (reviewData[row][col] !== 0) {
                        const point = gridPoints[row][col];
                        this.overlayRenderer.drawStone(point, reviewData[row][col], gridPoints);
                    }
                } else if (boardState[row][col] !== reviewData[row][col]) {
                    const point = gridPoints[row][col];
                    this.overlayRenderer.drawStone(point, reviewData[row][col], gridPoints);
                }
            }
        }
    }
}

// Initialize everything when the start button is clicked
document.getElementById('startCamera').addEventListener('click', async () => {
    const manager = new GoARManager();
    await manager.initialize();
});