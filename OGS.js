const io = require('socket.io-client');
const axios = require('axios');
const EventEmitter = require('events');


class OGSConnection extends EventEmitter {
    constructor(reviewId) {
        super();
        this.reviewId = reviewId;
        this.socket = null;
    }

    async connect() {
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
                    channel: `review-${this.reviewId}`
                });
    
                socket.emit('review/connect', {
                    review_id: this.reviewId
                });
            });
    
            // Review event handlers
            socket.on(`review/${this.reviewId}/full_state`, (data) => {
                console.log('Got full state:', data);
            });
    
            socket.on(`review/${this.reviewId}/r`, (data) => {
                console.log('Got review update:', data);
                this.parseData(data);
            });

        } catch (error) {
            console.error('Error:', error.response?.data || error.message);
            throw error;
        }

        return this;

        
    }

    async parseData(data){
        let parsed = {};
    
        if(data.m != null){
            parsed.moves = data.m;
        }
    
        if(data.k != null){
            parsed.marks = data.k
        }
    
        if(data.pp != null){
            parsed.pen = data.pp;
            if(data.pen != null){
                parsed.penColor = data.pen;
            }
        }
    
        if(data.clearpen != null){
            parsed.clearpen = data.clearpen;
        }
    
        //TODO: Modify functions to emit depending on marks or moves
        this.emit('moves',parsed);
    }
}




module.exports = {
    OGSConnection
}