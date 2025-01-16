const io = require('socket.io-client');
const axios = require('axios');

async function connectToReview(reviewId) {
    try {
        // Get guest credentials from config
        const configResponse = await axios.get('https://online-go.com/api/v1/ui/config');
        const userData = configResponse.data.user;
        const jwt = configResponse.data.user_jwt;

        console.log(`Connected as guest: ${userData.username}`);

        // Connect socket.io
        const socket = io('https://online-go.com', {
            transports: ['websocket'],
            path: '/socket.io'
        });

        socket.on('connect', () => {
            console.log('Connected to OGS socket');
            
            // Initialize with guest credentials
            socket.emit('notification/connect', {
                player_id: userData.id,
                username: userData.username,
                auth: jwt
            });

            socket.emit('chat/connect', {
                player_id: userData.id,
                username: userData.username,
                auth: jwt
            });

            // Connect to review
            socket.emit('chat/join', {
                channel: `review-${reviewId}`
            });

            socket.emit('review/connect', {
                review_id: reviewId
            });
        });

        // Review event handlers
        socket.on(`review/${reviewId}/full_state`, (data) => {
            console.log('Got full state:', data);
        });

        socket.on(`review/${reviewId}/r`, (data) => {
            console.log('Got review update:', data);
        });

        return socket; // Return socket for external control
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        throw error;
    }
}

// Usage
connectToReview(1395061)
    .then(socket => {
        // Socket available for further use
    })
    .catch(error => {
        console.error('Failed to connect:', error);
    });