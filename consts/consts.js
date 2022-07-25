const version = "0.3.5";
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

const tenSecs = 1 * 10;
const tenSecsMs = 1 * 10 * 10000;

const pickBanKeyword = ["pick", "ban"];
const poolKeyword = ["nm", "hd", "hr", "fm", "dt"];

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
    ONE_MIN_MS: oneMinMs,

    TEN_SECS: tenSecs,
    TEN_SECS_MS: tenSecsMs,

    PICK_BAN_KEYWORD: pickBanKeyword,
    POOL_KEYWORD: poolKeyword
});