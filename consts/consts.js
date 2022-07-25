const version = "0.3.0";
const commandPrefix = "!";

const lobbySize = 16;

const fifteenMins = 60 * 15;
const fifteenMinsMs = 60 * 15 * 1000;
const tenMins = 60 * 10;
const tenMinsMs = 60 * 10 * 1000;
const fiveMins = 60 * 5;
const fiveMinsMs = 60 * 5 * 1000;
const oneMin = 60 * 1;
const oneMinMs = 60 * 1 * 1000;

module.exports = Object.freeze({
    VERSION: version,
    COMMAND_PREFIX: commandPrefix,

    LOBBY_SIZE: lobbySize,

    FIFTEEN_MINS: fifteenMins,
    FIFTEEN_MINS_MS: fifteenMinsMs,
    TEN_MINS: tenMins,
    TEN_MINS_MS: tenMinsMs,
    FIVE_MINS: fiveMins,
    FIVE_MINS_MS: fiveMinsMs,
    ONE_MIN: oneMin,
    ONE_MIN_MS: oneMinMs
});