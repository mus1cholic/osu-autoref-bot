const Banchojs = require("bancho.js");

const version = "0.2.0";
const lobbySize = 16;

const ircConfig = require('./irc_config.json');
const tournamentConfig = require('./tournament_config.json')

// import fetchmsg.fetchMessage from "./consts/messages.js";
const fetchmsg = require('./consts/messages');

const client = new Banchojs.BanchoClient(ircConfig);
let channel, lobby;

function reorderData(config) {
    const newData = JSON.parse(JSON.stringify(config));

    // setting up lobby title
    newData.optional.match_title = newData.optional.match_title.replace("<tournament_initials>", newData.required.tournament_initials);
    newData.optional.match_title = newData.optional.match_title.replace("<team_1_players>", newData.required.teams.team_1.team_name);
    newData.optional.match_title = newData.optional.match_title.replace("<team_2_players>", newData.required.teams.team_2.team_name);

    // setting up score mode
    if (newData.optional.score_mode === "v2") {
        newData.optional.score_mode = Banchojs.BanchoLobbyWinConditions.ScoreV2;
    } else if (newData.optional.score_mode === "v1") {
        newData.optional.score_mode = Banchojs.BanchoLobbyWinConditions.Score;
    } else if (newData.optional.score_mode === "acc") {
        newData.optional.score_mode = Banchojs.BanchoLobbyWinConditions.Accuracy;
    }

    // setting up team mode
    if (newData.required.team_mode === "team_vs") {
        newData.required.team_mode = Banchojs.BanchoLobbyTeamModes.TeamVs;
    } else if (newData.required.team_mode === "1v1") {
        newData.required.team_mode = Banchojs.BanchoLobbyTeamModes.HeadToHead;
    }

    // setting up date
    newData.required.date = Date.parse(newData.required.date);

    return newData;
}

async function init() {
    console.log(`Initializing AutoRef bot v${version}...`);

    try {
        await client.connect();
    } catch (error) {
        console.log("Failed to connect to Bancho. Error: ");
        console.log(error);
        process.exit(1);
    }

    console.log("Successfully connected to Bancho. Parsing match data json...");

    const data = reorderData(tournamentConfig);

    console.log("Successfully parsed match data. Setting up match lobby 15 minutes before match starts...");

    // TODO: is this a good place to put settimeout?
    setTimeout(function() {
        console.log("Setting up match now...");
        setupMatch(data);
    }, data.required.date - Date.now() <= 0 ? 0 : data.required.date - Date.now());
}

async function setupMatch(data) {
    // 15 minutes before match time, the bot creates and setups the lobby

    channel = await client.createLobby(`${data.required.tournament_initials}: (${data.required.teams.team_1.team_name}) vs (${data.required.teams.team_2.team_name})`)
    lobby = channel.lobby;
    createLobbyListeners(lobby);

    const password = Math.random().toString(36).substring(8);
    // await lobby.setPassword(password);
    await lobby.setPassword("12345678");

    lobby.setSettings(data.required.team_mode, data.required.score_mode, lobbySize);

    // Setting up all the players

    let team_1_players = [];
    let team_2_players = [];

    for (const p of data.required.teams.team_1.player_names) {
        team_1_players.push(client.getUser(p));
    }

    for (const p of data.required.teams.team_2.player_names) {
        team_1_players.push(client.getUser(p));
    }
    
    // Inviting all players from team 1 and team 2

    for (const p of team_1_players) {
        await p.sendMessage(fetchmsg.fetchMessage("welcome").replace("<version>", version));
        await p.sendMessage(fetchmsg.fetchMessage("15_mins_before_match").replace("<tournament_initials>", data.required.tournament_initials)
                                                                .replace("<player_name>", data.required.teams.team_2.team_name));
        await lobby.invitePlayer(p.username);
    }

    for (const p of team_2_players) {
        await p.sendMessage(fetchmsg.fetchMessage("welcome").replace("<version", version));
        await p.sendMessage(fetchmsg.fetchMessage("15_mins_before_match").replace("<tournament_initials>", data.required.tournament_initials)
                                                                     .replace("<player_name>", data.required.teams.team_1.team_name));
        await lobby.invitePlayer(p.username);
    }

    

    // Send a message 5 mins before match

    // Send a message with match time
 
    createLobbyListeners(data);
}

function rollPhase(data) {
    // channel.sendMessage(fetchmsg.fetchMessage("roll"));
}

function banPhase(firstToBan, firstToPick, data) {
    let banTeam = firstToBan
    let banTurn = 1;
    let team_1_bans = [];
    let team_2_bans = [];
    let available_bans = Object.keys(data.required.pool);

    // read in the bans from each player
    channel.on("message", this.eventListener = async (message) => { // TODO: DOES THIS WORK?
        const content = message.message;
        const sender = message.user;

        // make sure the right team bans
        if (banTeam !== determineTeam(sender.username, data.required.teams)) {
            await channel.sendMessage(fetchmsg.fetchMessage("ban_wrong_player").replace("<player_name>", sender.username));
            return; // TODO: does this work
        }

        // make sure the ban is a valid ban
        if (!available_bans.includes(content)) {
            await channel.sendMessage(fetchmsg.fetchMessage("ban_wrong_id").replace("<player_name>", sender.username)
                                                            .replace("<maps_available>", available_bans.toString()));
            return; // TODO: does this work
        }

        // the ban is valid and sent by the right team, we proceed
        if (banTeam === data.teams.team_1.team_name) {
            team_1_bans.push(content);
        } else {
            team_2_bans.push(content);
        }
        available_bans.splice(available_bans.indexOf(content), 1);

        // if this is the last ban, then we remove the listener, update data, and move onto pick phase
        if (banTeam !== firstToBan && banTurn === data.optional.bans) {
            const available_maps = data.required.pool;
            for (const ban of team_1_bans) {
                delete available_maps.required.pool.ban;
            }
            for (const ban of team_2_bans) {
                delete available_maps.required.pool.ban;
            }
            data.required.pool = available_maps;
            channel.removeListener("message", this.eventListener);
            pickPhase(firstToPick, data); // TODO: is this right way to exit
        } else {
            // change banTeam and banTurn
            if (banTeam !== firstToBan) {
                banTurn += 1;
            }
            banTeam = banTeam === data.teams.team_1.team_name ? data.teams.team_2.team_name : data.teams.team_1.team_name;
            await channel.sendMessage(fetchmsg.fetchMessage("ban_start").replace("<player_name>", banTeam)
                                                               .replace("<ban_total>", banTurn)
                                                               .replace("<maps_available>", "")
                                                               .replace("<ban_time>", data.optional.ban_pick_time));
            await lobby.startTimer(parseInt(data.optional.ban_pick_time));

            // TODO: over-time and reserve time
        }
    })
}

function pickPhase(firstToPick, data) {

}

function createLobbyListeners(data) {
    // the lobby can only be "full" if the last action is a player joining, so we don't
    // need any other lobby listeners like playerLeft
    lobby.on("playedJoined", this.eventListener = async (object) => {
        let team_1_players_in_lobby = 0;
        let team_2_players_in_lobby = 0;
        // check if all players join and time has elapsed, then we can start the match
        for (const p of lobby.slots) {
            if (p !== null) {
                const username = p.username;
                if (data.required.teams.team_1.player_names.includes(username)) {
                    team_1_players_in_lobby += 1;
                }
                if (data.required.teams.team_2.player_names.includes(username)) {
                    team_2_players_in_lobby += 1;
                }
            }
        }

        if (team_1_players_in_lobby >= data.required.team_size && team_2_players_in_lobby >= data.required.team_size) {
            // both teams have enough players in lobby. the match can now start.
            channel.removeListener("playedJoined", this.eventListener);
            rollPhase(data);
        }
    });
}

function createPMListeners() {
    client.on("PM", async (message) => {
        const content = message.message;
        const sender = message.user;

        if (content.startsWith("!")) {
            const msg = content.substring(1).split(' ');

            // TODO: move this to a different file for cleanliness
            switch (msg[0]) {
                case "commands":
                    await sender.sendMessage(fetchmsg.fetchMessage("!commands"));
                    break;
                case "invite":
                    await sender.sendMessage(fetchmsg.fetchMessage("!invite"));
                    await lobby.invitePlayer(sender.username);
                    break;
                case "startnow":
                    // first determine if there is a pending match
                    break;
                case "acceptstartnow":
                    // first determine if there is a pending request
                    break;
                default:
                    await sender.sendMessage(fetchmsg.fetchMessage("default"));
                    break;
            }
        } else if (!content.startsWith("!") && !message.self) {
            await sender.sendMessage(fetchmsg.fetchMessage("default"));
        }
    })
}

function determineTeam(playerName, teams) {
    // usually, if the player is not in team 1, the player must be in team 2.
    // however, if a player not in both teams comes into the lobby and types
    // it will mess up the system, so we check for both
    if (teams.team_1.player_names.includes(playerName)) {
        return teams.team_1.team_name;
    }

    if (teams.team_2.player_names.includes(playerName)) {
        return teams.team_2.team_name;
    }

    return false;
}

init().then(() => {
    
})