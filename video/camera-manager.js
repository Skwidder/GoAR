const EventEmitter = require('events');

class CameraManager extends EventEmitter {
    constructor() {
        super();
        this.videoElement = null;
        this.videoContext = null;
        this.displayWidth = 0;
        this.displayHeight = 0;
        this.stream = null;
        this.isCapturing = false;
    }

    async initialize(videoElement) {
        this.videoElement = videoElement;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60 }
                } 
            });

            this.videoElement.srcObject = this.stream;
            await new Promise(resolve => this.videoElement.onloadedmetadata = resolve);

            this.setupVideoCanvas();
            this.setupResizeHandler();
            this.startCapture();

            this.emit('initialized', {
                width: this.displayWidth,
                height: this.displayHeight
            });
        } catch (err) {
            console.error('Error accessing camera:', err);
            this.emit('error', err);
        }
    }

    setupVideoCanvas() {
        // Calculate size that maintains aspect ratio
        const videoAspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
        const containerRect = this.videoElement.getBoundingClientRect();
        const containerAspect = containerRect.width / containerRect.height;

        if (containerAspect > videoAspect) {
            this.displayHeight = containerRect.height;
            this.displayWidth = this.displayHeight * videoAspect;
        } else {
            this.displayWidth = containerRect.width;
            this.displayHeight = this.displayWidth / videoAspect;
        }

        // Round to whole pixels
        this.displayWidth = Math.round(this.displayWidth);
        this.displayHeight = Math.round(this.displayHeight);

        // Create video canvas
        const videoCanvas = document.createElement('canvas');
        videoCanvas.width = this.displayWidth;
        videoCanvas.height = this.displayHeight;
        this.videoContext = videoCanvas.getContext('2d');

        // Apply common styling
        const commonStyle = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: ${this.displayWidth}px;
            height: ${this.displayHeight}px;
        `;
        this.videoElement.style.cssText = commonStyle;
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            const newContainerRect = this.videoElement.getBoundingClientRect();
            const videoAspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
            
            let newWidth, newHeight;
            if (newContainerRect.width / newContainerRect.height > videoAspect) {
                newHeight = newContainerRect.height;
                newWidth = newHeight * videoAspect;
            } else {
                newWidth = newContainerRect.width;
                newHeight = newWidth / videoAspect;
            }

            this.displayWidth = Math.round(newWidth);
            this.displayHeight = Math.round(newHeight);

            // Update video canvas
            this.videoContext.canvas.width = this.displayWidth;
            this.videoContext.canvas.height = this.displayHeight;

            // Update video element style
            this.videoElement.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: ${this.displayWidth}px;
                height: ${this.displayHeight}px;
            `;

            this.emit('resize', {
                width: this.displayWidth,
                height: this.displayHeight
            });
        });
    }

    startCapture() {
        this.isCapturing = true;
        const captureFrame = () => {
            if (!this.isCapturing) return;
            this.videoContext.drawImage(this.videoElement, 0, 0, this.displayWidth, this.displayHeight);
            this.emit('frame', this.videoContext);
            requestAnimationFrame(captureFrame);
        };
        captureFrame();
    }

    stopCapture() {
        this.isCapturing = false;
    }

    getFrame() {
        return this.videoContext;
    }

    getDimensions() {
        return {
            width: this.displayWidth,
            height: this.displayHeight
        };
    }

    cleanup() {
        this.stopCapture();
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}

module.exports = { CameraManager };