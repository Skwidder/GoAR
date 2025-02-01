const Wgo = require("wgo");
const { OGSConnection } = require("./OGS.js");
const EventEmitter = require('events');

class ReviewBoard extends EventEmitter{
    constructor(reviewBoard,size = 19){
        super();
        this.board = reviewBoard;
        this.init();
        
        this.lastMoves = "pd";
        this.size = size;
    }

    async init(){
        this.board.connect();

        this.board.on('moves',(data) => this.updateData(data))
        this.game = new Wgo.Game(this.size,"ko");
    }

    reset(){
        this.game.clear();
    }

    placeSGFStones(sgfString){
        for (let i = 0; i < sgfString.length; i = i + 2){
            if((sgfString[i] + sgfString[i+1]) == "!1" || (sgfString[i] + sgfString[i+1]) == ".."){
                this.game.pass();
                console.log("pass");
                return;
            }
            const cords = sgfToCoords(sgfString[i] + sgfString[i+1]);
            this.game.play(cords.y,cords.x);
        }
    }

    updateData(data){
        //probs detect stones when we get new things.
        if(data.moves != null){
            //Check if the board position we have is contained in the new board position
            //We check its at position 0 because the moves start at the first move
            if(data.moves.search(this.lastMoves) == 0){
                const newMoves = data.moves.substr(this.lastMoves.length);
                this.placeSGFStones(newMoves);
                this.lastMoves = data.moves;
            }else{
                this.lastMoves = data.moves;
                this.reset();
                this.placeSGFStones(data.moves)
            }

        }

        
        this.emit("Move",transfromWgoBoard(this.game.position.grid));
    }

}

function transfromWgoBoard(grid){
    if (grid.length !== 361) {
        console.log("Array must be exactly 361 elements");
        return;
    }

    let  newArray = []
    for (let row = 0; row < 19; row++) {
        let arr = [];
        for (let col = 0; col < 19; col++) {
            const index = row * 19 + col;
            arr.push(grid[index]);
        }
        newArray.push(arr);
    }
    return newArray;
}






// Convert SGF coordinate (e.g., "aa") to x,y coordinates
function sgfToCoords(sgf) {
    if (!sgf || sgf.length !== 2) return null;
    const x = sgf.charCodeAt(0) - 'a'.charCodeAt(0);
    const y = sgf.charCodeAt(1) - 'a'.charCodeAt(0);
    return { x, y };
}

//for testing
function printBoard(array) {
    if (array.length !== 361) {
        console.log("Array must be exactly 361 elements");
        return;
    }

    for (let row = 0; row < 19; row++) {
        let line = '';
        for (let col = 0; col < 19; col++) {
            const index = row * 19 + col;
            // Pad each number to be 2 characters wide (including space)
            line += (array[index] >= 0 ? ' ' : '') + array[index] + ' ';
        }
        console.log(line.trim());
    }
}

module.exports = {
    ReviewBoard
}


