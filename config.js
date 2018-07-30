const TEN_SECONDS = 10;

export const settings = {
    MAX_STORE_VALUE: 3600, // last hour history
    MAX_STOCK_VALUES_SIZE: 100,
    periodTypes: {
        1: TEN_SECONDS,
        2: TEN_SECONDS * 3, // 30 sec
        3: TEN_SECONDS * 6, // 1 min
        4: TEN_SECONDS * 6 * 5 // 5 min
    },
    defaultEventRate: 2,

};
