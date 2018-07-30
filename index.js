import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import morgan from 'morgan';
import EventEmitter from "events";
import * as handleNumbers from "./app/handleNumbers";
import redis from 'redis';

const TEN_SECONDS = 10;
const MAX_STORE_VALUE = 3600; // last hour history
const MAX_STOCK_VALUES_SIZE = 100;
const app = express();
const users = {};
const randomNumberEmitter = new EventEmitter();
const periodTypes = {
    1: TEN_SECONDS,
    2: TEN_SECONDS * 3, // 30 sec
    3: TEN_SECONDS * 6, // 1 min
    4: TEN_SECONDS * 6 * 5 // 5 min
};

let redisClient = redis.createClient();
let config = {
    defaultEventRate: 2
};

randomNumberEmitter.setMaxListeners(100);

dotenv.config();

app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(morgan('combined'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/getHistory/:socketId/:last/:periodType', (req, res) => {
    if (!users[req.params.socketId]) {
        res.status(401).json({ err: 'Error on verification' });
    } else {
        redisClient.lrange('stocksStore', 0, parseInt(req.params.last), (err, result) => {
            if (err || !result) {
                res.status(500).json({ err: err || new Error('Missing results') });
            } else {
                let aggregatedStockValues = [];
                let periodAggregation = [];

                for (let i = 0; i < result.length; i++) {
                    periodAggregation.push(JSON.parse(result[i]));

                    let timeDiff = !periodAggregation || !periodAggregation.length ? 0 : periodAggregation[0].x - periodAggregation[periodAggregation.length - 1].x;
                    let diffInSec = timeDiff / 1000;

                    if (diffInSec > periodTypes[users[req.params.socketId].periodType] || periodAggregation.length >= MAX_STOCK_VALUES_SIZE) {
                        aggregatedStockValues.push(handleNumbers.aggregatePeriodStockValues(periodAggregation, periodAggregation[0].x));
                        periodAggregation = [];
                    }
                }

                res.status(200).json({ aggregatedStockValues });
            }
        });
    }
});

app.get('/api/changePeriod/:socketId/:periodType', (req, res) => {
    let type = parseInt(req.params.periodType);

    if (!users[req.params.socketId]) {
        res.status(401).json({ err: 'Error on verification' });
    } else if (periodTypes[type]) {
        users[req.params.socketId].period = periodTypes[type];
        users[req.params.socketId].periodType = type;
    } else {
        users[req.params.socketId].period = periodTypes[1];
        users[req.params.socketId].periodType = 1;
    }

    res.status(200).json({ period: periodTypes[type] ? type : 1 });
});

const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.on('connection', socket => {
    console.log(`Connection established (SocketId: ${socket.id})`);

    socket.on('start', option => {
        users[socket.id] = { username: option.username, periodType: 1, period: periodTypes[1] };
        randomNumberEmitter.on('newNumber', number => {
            socket.emit('newNumber', number);
        });

        console.log(`User ${option.username} started (SocketId: ${socket.id})`);

        let periodAggregation = [];

        randomNumberEmitter.on('newStockValue', stockValue => {
            if (!socket || !users[socket.id] || !users[socket.id].periodType) {
                return;
            }

            periodAggregation.push(stockValue);

            redisClient.lpush('stocksStore', JSON.stringify(stockValue));
            redisClient.ltrim('stocksStore', 0, MAX_STORE_VALUE);

            let timeDiff = !periodAggregation || !periodAggregation.length ? 0 : periodAggregation[periodAggregation.length - 1].x - periodAggregation[0].x;
            let diffInSec = timeDiff / 1000;

            if (diffInSec > periodTypes[users[socket.id].periodType] || periodAggregation.length >= MAX_STOCK_VALUES_SIZE) {
                let periodAggregate = handleNumbers.aggregatePeriodStockValues(periodAggregation);
                randomNumberEmitter.emit('newNumber', periodAggregate); // process and send period stockValue
                periodAggregation = [];
            }
        });
    });

    socket.on('disconnect', () => {
        console.log(`User ${users[socket.id] && users[socket.id].username} has left the server (SocketId: ${socket.id})`);
        delete users[socket.id];
    });
});

server.listen(process.env.PORT || 8080, () => {
    setInterval(() => { // start creating events
        randomNumberEmitter.emit('newStockValue', handleNumbers.generateRandomStockValue(config.defaultEventRate * 5));
    }, 200 * 5); // Interval every 1 second

    console.log('server listening on port', process.env.PORT || 8080);
});

process.on('SIGTERM', () => {
    server.close(() => {
        process.exit(0);
    });
});
