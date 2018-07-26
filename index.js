const port = 3000;
const express = require('express');
const path = require('path');
const EventEmitter = require('events');
const randomNumberEmitter = new EventEmitter();
var app = express();
app.use(express.static(path.join(__dirname, 'static')));

const bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

var config = {
    defaultEventRate: 100
};

const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.on('connection', function (socket) {
    socket.on('start', function () {
        console.log('starting');
        randomNumberEmitter.on('newNumber', function (number) {
            console.log('newNumber', number);
            socket.emit('newNumber', number);
        })
    })
});

server.listen(port, function () {
    // start creating events
    setInterval(function () {
        for (let i = 0; i < config.defaultEventRate; i++) {
            let number = Math.floor(Math.random() * Math.floor(20));
            randomNumberEmitter.emit('newNumber', { number: number, time: Date.now() });
        }
    }, 200);

    console.log('server listetning on port', port)
});
