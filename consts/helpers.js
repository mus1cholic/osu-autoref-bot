const Banchojs = require("bancho.js");

function printStringArray(arr) {
    let ret = "";
    
    for (const [i, v] of arr.entries()) {
        if (i === arr.length - 1) {
            ret += `${v}`;
            break;
        }

        ret += `${v}, `;
    }

    return ret;
}

function printStringDict(dict) {
    let ret = "";

    const keys = Object.keys(dict);

    for (const [i, v] in keys.entries()) {
        if (i === keys.length - 1) {
            ret += `${v}: ${dict.v}`;
            break;
        }

        ret += `${v}: ${dict.v}, `
    }

    return ret;
}

function determineTeam(playerName, teams) {
    // usually, if the player is not in team 1, the player must be in team 2.
    // however, if a player not in both teams comes into the lobby and types
    // it will mess up the system, so we check for both
    if (teams.team_1.player_names.includes(playerName)) return teams.team_1.team_name;
    if (teams.team_2.player_names.includes(playerName)) return teams.team_2.team_name;

    return false;
}

function determineMod(str, score_mode) {
    // TODO: FREEMOD DETECTION
    let prefix = str.substring(0, 2).toUpperCase();

    if (score_mode === Banchojs.BanchoLobbyWinConditions.ScoreV2) prefix += "NF";

    return Banchojs.BanchoMods.parseShortMods(prefix);
}

function checkPickBanSequenceKeywords(str) {
    const strSplit = str.split(" ");

    if (strSplit.length > 2) {
        return false;
    } else {
        return strSplit[0] === "pick" || strSplit[0] === "ban";
    }
}

function checkPoolPickBanKeywords(str, pool) {
    const strSplit = str.split(" ");

    if (strSplit.length > 1) {
        return false;
    } else {
        for (const key of Object.keys(pool)) {
            // we get the alphabetical part of the pool map codes
            // and compare it with the alphabetical part of the
            // string

            if (key === "tb") continue;

            const pool_map_slot_code = key.substring(0, key.length - 1); // TODO: currently nm1-9 works but nm10 doesn't work
            const str_slot_code = str.substring(0, pool_map_slot_code.length);

            const str_slot_number = str.substring(pool_map_slot_code.length);

            if (pool_map_slot_code === str_slot_code &&
                !isNaN(str_slot_number.substring(0, 1))) {
                return true;
            }
        }

        return false;
    }
}

module.exports = {
    printStringArray,
    printStringDict,
    determineTeam,
    determineMod,
    checkPickBanSequenceKeywords,
    checkPoolPickBanKeywords
};