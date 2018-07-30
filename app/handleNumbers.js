export const generateRandomStockValue = defaultEventRate => {
    let yOpen;
    let yClose;
    let yHigh;
    let yLow;
    let randNumber;

    for (let i = 0; i < defaultEventRate; i++) {
        randNumber = Math.floor(Math.random() * Math.floor(20));

        if (i === 0) {
            yOpen = randNumber
        } else if (i === (defaultEventRate - 1)) {
            yClose = randNumber;
        }

        if (yLow === null || yLow === undefined || yLow > randNumber) {
            yLow = randNumber;
        } else if (yHigh === null || yHigh === undefined || yHigh < randNumber) {
            yHigh = randNumber;
        }
    }

    return {
        yOpen,
        yClose,
        yHigh,
        yLow,
        x: Date.now(),
        y: (yOpen + yClose) / 2
    };
};

export const aggregatePeriodStockValues = (stockValues, timestamp) => {
    let yOpen;
    let yClose;
    let yHigh;
    let yLow;

    for (let i = 0; i < stockValues.length; i++) {
        if (i === 0) {
            yOpen = stockValues[i].yOpen;
        } else if (i === (stockValues.length - 1)) {
            yClose = stockValues[i].yClose;
        }

        if (yLow === null || yLow === undefined || yLow > stockValues[i].yLow) {
            yLow = stockValues[i].yLow;
        } else if (yHigh === null || yHigh === undefined || yHigh < stockValues[i].yHigh) {
            yHigh = stockValues[i].yHigh;
        }
    }

    return {
        yOpen,
        yClose,
        yHigh,
        yLow,
        x: timestamp || Date.now(),
        y: (yOpen + yClose) / 2
    };
};
