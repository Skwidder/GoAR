const {ReviewBoard} = require("./reviewBoard.js");
const { OGSConnection } = require("./OGS.js");


const reviewConn = new OGSConnection(1402863);
const review = new ReviewBoard(reviewConn,19);