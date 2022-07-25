const Banchojs = require("bancho.js");

function printStringArray(arr) {
    let ret = "";
    
    for (const [i, v] of arr.entries()) {
        if (i === arr.length - 1) {
            ret += v;
            break;
        }

        ret += v + ", ";
    }

    return ret;
}

function determineMod(str, score_mode) {
    // TODO: FREEMOD DETECTION
    let prefix = str.substring(0, 2).toUpperCase();

    if (score_mode === Banchojs.BanchoLobbyWinConditions.ScoreV2) prefix += "NF";

    return Banchojs.BanchoMods.parseShortMods(prefix);
}

module.exports = {
    printStringArray,
    determineMod
};