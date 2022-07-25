const ee = require("node:events");

const Banchojs = require("bancho.js");

const CONSTANTS = require('./consts/consts');
const helpers = require('./consts/helpers');
const fetchmsg = require('./consts/messages');

const rollSystems = require('./consts/rollSystems');

const ircConfig = require('./irc_config.json');
const tournamentConfig = require('./tournament_config.json');

const client = new Banchojs.BanchoClient(ircConfig);
let channel, lobby;

let currentTimeout; // match phases are linear so we don't need to initialize as array

class MyEmitter extends ee.EventEmitter {}
const myEmitter = new MyEmitter();

function reorderData(config) {
    const newData = JSON.parse(JSON.stringify(config));

    // setting up lobby title
    newData.optional.match_title = newData.optional.match_title.replace("<tournament_initials>", newData.required.tournament_initials)
                                                               .replace("<team_1_players>", newData.required.teams.team_1.team_name)
                                                               .replace("<team_2_players>", newData.required.teams.team_2.team_name);

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
    console.log(`Initializing AutoRef bot v${CONSTANTS.VERSION}...`);

    try {
        await client.connect();
    } catch (error) {
        console.log("Failed to connect to Bancho. Error: ");
        console.log(error);
        process.exit(1);
    }

    console.log("Successfully connected to Bancho. Enabling PM listeners...");

    createPMListeners();

    console.log("Parsing match data json...");

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

    const password = Math.random().toString(36).substring(8);
    // await lobby.setPassword(password);
    await lobby.setPassword("1");

    lobby.setSettings(data.required.team_mode, data.optional.score_mode, CONSTANTS.LOBBY_SIZE);

    // Setting up all the players
    let team_1_players = [];
    let team_2_players = [];

    for (const p of data.required.teams.team_1.player_names) {
        team_1_players.push(client.getUser(p));
    }

    for (const p of data.required.teams.team_2.player_names) {
        team_2_players.push(client.getUser(p));
    }
    
    // Inviting all players from team 1 and team 2

    // TODO: handle case of rejectedMessage
    // TODO: handle case of player offline

    for (const p of team_1_players) {
        await p.sendMessage(fetchmsg.fetchMessage("welcome").replace("<version>", CONSTANTS.VERSION));
        await p.sendMessage(fetchmsg.fetchMessage("15_mins_before_match").replace("<tournament_initials>", data.required.tournament_initials)
                                                                .replace("<player_name>", data.required.teams.team_2.team_name));
        
        await lobby.invitePlayer(p.ircUsername);
    }

    for (const p of team_2_players) {
        await p.sendMessage(fetchmsg.fetchMessage("welcome").replace("<version>", CONSTANTS.VERSION));
        await p.sendMessage(fetchmsg.fetchMessage("15_mins_before_match").replace("<tournament_initials>", data.required.tournament_initials)
                                                                     .replace("<player_name>", data.required.teams.team_1.team_name));
        await lobby.invitePlayer(p.ircUsername);
    }

    await lobby.startTimer(CONSTANTS.FIFTEEN_MINS);

    // Send messages before match, but only do it if both players havent joined the lobby yet

    startTimeout(async function (dest) {
        // send 5_mins_before_match after 10 minutes has elapsed
        for (const p of dest) {
            await p.sendMessage(fetchmsg.fetchMessage("5_mins_before_match").replace("<tournament_initials>", data.required.tournament_initials)
                                                                            .replace("<player_name>", data.required.teams.team_1.team_name));
        }

        startTimeout(async function (dest) {
            // send match_now after 5 minutes has elapsed
            for (const p of dest) {
                await p.sendMessage(fetchmsg.fetchMessage("match_now").replace("<tournament_initials>", data.required.tournament_initials)
                                                                      .replace("<player_name>", data.required.teams.team_1.team_name));
            }

            startTimeout(async function (dest) {
                // send 5_mins_over after 5 minutes has elapsed
                for (const p of dest) {
                    await p.sendMessage(fetchmsg.fetchMessage("5_mins_over").replace("<tournament_initials>", data.required.tournament_initials)
                                                                            .replace("<player_name>", data.required.teams.team_1.team_name));
                }

                startTimeout(async function(dest) {
                    // send forfeit after 5 minutes has elapsed
                    for (const p of dest) {
                        await p.sendMessage(fetchmsg.fetchMessage("forfeit").replace("<tournament_initials>", data.required.tournament_initials)
                                                                            .replace("<player_name>", data.required.teams.team_1.team_name)
                                                                            .repeat("<forfeit_time>", data.forfeit_time / 60));
                    }
                }, CONSTANTS.FIVE_MINS_MS, dest);
            }, CONSTANTS.FIVE_MINS_MS, dest);
        }, CONSTANTS.FIVE_MINS_MS, dest);
    }, CONSTANTS.TEN_MINS_MS, team_1_players.concat(team_2_players));

    await createLobbyListeners(data);
}

async function startTimeout(func, seconds, dest) {
    // if (!interrupt) setTimeout(func, seconds, dest, interrupt);
    currentTimeout = setTimeout(func, seconds, dest);
}

// TODO: what happens if this is right before setTimeout updates?
// perhaps need to do another local interrupt to make sure it actually clears
async function interruptStartTimeout() {
    clearTimeout(currentTimeout);
    currentTimeout = null;
}

async function createLobbyListeners(data) {
    // the lobby can only be "full" if the last action is a player joining, so we don't
    // need any other lobby listeners like playerLeft
    // TODO: assign teams
    lobby.on("playerJoined", this.eventListener = async (object) => {
        let team_1_players_in_lobby = 0;
        let team_2_players_in_lobby = 0;

        // check if all players join and time has elapsed, then we can start the match
        if (data.required.date - Date.now() <= 0) {
            for (const p of lobby.slots) {
                if (p !== null) {
                    const username = p.user.ircUsername; // special case here since it's BanchoLobbyPlayer
                    if (data.required.teams.team_1.player_names.includes(username)) {
                        team_1_players_in_lobby += 1;
                    }
                    if (data.required.teams.team_2.player_names.includes(username)) {
                        team_2_players_in_lobby += 1;
                    }
                }
            }
        }

        if (team_1_players_in_lobby >= data.required.team_size && team_2_players_in_lobby >= data.required.team_size) {
            // both teams have enough players in lobby. the match can now start.
            channel.removeListener("playerJoined", this.eventListener);
            
            // since both players already joined the lobby, we can start directly
            // TODO: make this not default behavior but instead activate on !startnow command
            await lobby.abortTimer();
            interruptStartTimeout();

            await channel.sendMessage(fetchmsg.fetchMessage("roll_start"));
            
            await rollPhase(data);
        }
    });
}

async function rollPhase(data) {
    let rollVerification = {};
    let rolls = {};

    rolls[data.required.teams.team_1.team_name] = -1;
    rolls[data.required.teams.team_2.team_name] = 0;

    // TODO: ensure a roll of greater than 100 does not count
    channel.on("message", this.eventListener = async (msg) => {
        // thanks @clxxiii for this piece of code

        console.log(rolls);

        const content = msg.message;
        const sender = msg.user;

        if (content.toLowerCase() === "!roll") {
            rollVerification[sender.ircUsername] = true;
            return;
        }
    
        if (sender.ircUsername != "BanchoBot") return;
    
        const roll = content.match(/(?<user>.+) rolls (?<roll>\d+) point\(s\)/);  
        if (!roll) return;
        rollVerification[sender.ircUsername] = null;

        if (determineTeam(roll.groups.user, data.required.teams) === data.required.teams.team_1.team_name 
            && rolls[data.required.teams.team_1.team_name] === -1) {
            rolls[data.required.teams.team_1.team_name] = parseInt(roll.groups.roll);
        }
        if (determineTeam(roll.groups.user, data.required.teams) === data.required.teams.team_2.team_name
        && rolls[data.required.teams.team_2.team_name] === 0) {
            rolls[data.required.teams.team_2.team_name] = parseInt(roll.groups.roll);
        }

        // TODO: handle ties between rolls

        // now we check whether both players have rolled, if so roll phase is over and we can start banning phase

        if (rolls[data.required.teams.team_1.team_name] !== -1 && rolls[data.required.teams.team_2.team_name] !== 0) {
            channel.removeListener("message", this.eventListener);

            console.log(rolls);

            const rollWinner = rolls[data.required.teams.team_1.team_name] > rolls[data.required.teams.team_2.team_name]
                                                                           ? data.required.teams.team_1.team_name
                                                                           : data.required.teams.team_2.team_name;
            const rollLoser = rollWinner === data.required.teams.team_1.team_name ? data.required.teams.team_2.team_name
                                                                                  : data.required.teams.team_1.team_name;
            
            await determineBanPickSequencePhase(rollWinner, rollLoser, data);
        } 
    });
}

async function determineBanPickSequencePhase(rollWinner, rollLoser, data) {
    // set up an internal event listener to call functions within listeners between files

    myEmitter.once('determinedBanPickSequence', this.eventListener = async (sequence) => {
        myEmitter.removeListener("determinedBanPickSequence", this.eventListener);

        console.log(sequence);

        await banPhase(sequence.banFirst, sequence.pickFirst, data);  
    });

    rollSystems.processRollSystems(rollWinner, rollLoser, data, channel, determineTeam, myEmitter);
}

async function banPhase(firstToBan, firstToPick, data) {
    let banTeam = firstToBan
    let banTurn = 1;
    let team_1_bans = [];
    let team_2_bans = [];
    let available_bans = Object.keys(data.required.pool);

    available_bans.splice(available_bans.indexOf("tb"), 1);

    await channel.sendMessage(fetchmsg.fetchMessage("ban_start").replace("<player_name>", firstToBan)
                                                                .replace("<ban_total>", fetchmsg.fetchMessage("1"))
                                                                .replace("<maps_available>", helpers.printStringArray(available_bans))
                                                                .replace("<ban_time>", data.optional.ban_pick_time));

    await lobby.startTimer(data.optional.ban_pick_time);

    // read in the bans from each player
    // TODO: do not allow to ban tb
    channel.on("message", this.eventListener = async (message) => {
        const content = message.message;
        const sender = message.user;

        // make sure the bot doesn't take its own response as well as banchobot as a map ban
        if (message.self || sender.ircUsername === "BanchoBot") return;

        // detect regular message, don't need to do anything
        if (!helpers.checkSpecialKeyWords(content.toLowerCase(), CONSTANTS.POOL_KEYWORD)) return;

        // make sure the right team bans
        if (banTeam !== determineTeam(sender.ircUsername, data.required.teams)) {
            await channel.sendMessage(fetchmsg.fetchMessage("ban_wrong_player").replace("<player_name>", sender.ircUsername));
            return;
        }

        // make sure the ban is a valid ban
        if (!available_bans.includes(content.toLowerCase())) {
            await channel.sendMessage(fetchmsg.fetchMessage("ban_wrong_id").replace("<player_name>", sender.ircUsername)
                                              .replace("<maps_available>", helpers.printStringArray(available_bans)));
            return;
        }

        // the ban is valid and sent by the right team, we proceed
        if (banTeam === data.required.teams.team_1.team_name) {
            team_1_bans.push(content);
        } else {
            team_2_bans.push(content);
        }
        available_bans.splice(available_bans.indexOf(content), 1);

        // if this is the last ban, then we remove the listener, update data, and move onto pick phase
        if (banTurn === data.optional.bans * 2) {
            // await lobby.abortTimer(); // don't need this since we're setting a new timer immediately after

            const available_maps = data.required.pool;
            for (const ban of team_1_bans) {
                delete available_maps.ban;
            }
            for (const ban of team_2_bans) {
                delete available_maps.ban;
            }
            data.required.pool = available_maps;
            channel.removeListener("message", this.eventListener);
            await pickPhase(firstToPick, available_bans, data);
        } else {
            // change banTeam and increment banTurn
            // await lobby.abortTimer(); // don't need this since we're setting a new timer immediately after

            banTurn += 1;
            banTeam = banTeam === data.required.teams.team_1.team_name ? data.required.teams.team_2.team_name : data.required.teams.team_1.team_name;

            await channel.sendMessage(fetchmsg.fetchMessage("ban_start").replace("<player_name>", banTeam)
                                              .replace("<ban_total>", fetchmsg.fetchMessage("" + Math.ceil(banTurn / 2)))
                                              .replace("<maps_available>", helpers.printStringArray(available_bans))
                                              .replace("<ban_time>", data.optional.ban_pick_time));
            await lobby.startTimer(parseInt(data.optional.ban_pick_time));

            // TODO: over-time and reserve time
        }
    });
}

async function pickPhase(firstToPick, maps, data) {
    let pickTeam = firstToPick;
    let pickTurn = 1;
    let temporaryStopRecievingMessage = false;
    let currentMapPlayed = false;
    let team_1_picks = [];
    let team_2_picks = [];
    let match_score = [0, 0];
    let available_picks = maps;

    await channel.sendMessage(fetchmsg.fetchMessage("match_start").replace("<best_of>", data.required.bo));
    await channel.sendMessage(fetchmsg.fetchMessage("pick_start").replace("<player_name>", firstToPick)
                                                                 .replace("<maps_available>", helpers.printStringArray(available_picks))
                                                                 .replace("<pick_time>", data.optional.ban_pick_time));

    await lobby.startTimer(data.optional.ban_pick_time);

    // read in the picks from each player
    channel.on("message", this.eventListener = async (message) => {
        const content = message.message;
        const sender = message.user;

        // temporarily stop recieving inputs
        if (temporaryStopRecievingMessage) return;

        // make sure the bot doesn't take its own response as well as banchobot as a map pick
        if (message.self || sender.ircUsername === "BanchoBot") return;

        // detect regular message, don't need to do anything
        if (!helpers.checkSpecialKeyWords(content.toLowerCase(), CONSTANTS.POOL_KEYWORD)) return;

        // make sure the right team picks
        if (pickTeam !== determineTeam(sender.ircUsername, data.required.teams)) {
            await channel.sendMessage(fetchmsg.fetchMessage("pick_wrong_player").replace("<player_name>", sender.ircUsername));
            return;
        }

        // make sure the pick is a valid pick
        if (!available_picks.includes(content.toLowerCase())) {
            await channel.sendMessage(fetchmsg.fetchMessage("pick_wrong_id").replace("<player_name>", sender.ircUsername)
                                              .replace("<maps_available>", helpers.printStringArray(available_picks)));
            return;
        }

        // the pick is valid and sent by the right team, we proceed
        if (pickTeam === data.required.teams.team_1.team_name) {
            team_1_picks.push(content);
        } else {
            team_2_picks.push(content);
        }

        available_picks.splice(available_picks.indexOf(content), 1);

        // TODO: FREEMOD DETECTION
        lobby.setMap(data.required.pool[content]);
        lobby.setMods(helpers.determineMod(content, data.optional.score_mode));

        currentMapPlayed = false;
        temporaryStopRecievingMessage = true;

        await lobby.startTimer(data.optional.map_wait_time);
    });

    // detect if players are ready and the new map is chosen
    lobby.on("allPlayersReady", this.eventListener = async (obj) => {
        if (!currentMapPlayed) lobby.startMatch(CONSTANTS.TEN_SECS);
    })

    // detect when the map is finished
    lobby.on("matchFinished", this.eventListener = async (playerScores) => {
        let team_1_score = 0;
        let team_2_score = 0;

        currentMapPlayed = true;

        // TODO: calculate scores
        for (const s of playerScores) {
            const score = s.score;
            const banchoPlayer = s.player;

            if (data.required.teams.team_1.player_names.includes(determineTeam(banchoPlayer.user.ircUsername, data.required.teams))) {
                team_1_score += score;
            }
            if (data.required.teams.team_2.player_names.includes(determineTeam(banchoPlayer.user.ircUsername, data.required.teams))) {
                team_2_score += score;
            }
        }

        if (team_1_score > team_2_score) {
            match_score[0] += 1;
        } else if (team_1_score < team_2_score) {
            match_score[1] += 1;
        } else {     
            // await channel.sendMessage(fetchmsg.fetchMessage("tie_score"));
            // currentMapPlayed = false;

            // return;

            if (Math.random() > 0.5) match_score[0] += 1;
            else match_score[1] += 1;
        }


        if (match_score[0] === 1 + Math.floor(data.required.bo / 2) || match_score[1] === 1 + Math.floor(data.required.bo / 2)) {
            const winner = match_score[0] === 1 + Math.floor(data.required.bo / 2) ? data.required.teams.team_1.team_name 
                                                                                  : data.required.teams.team_2.team_name;

            await channel.sendMessage(fetchmsg.fetchMessage("match_finished").replace("<team_1_name>", data.required.teams.team_1.team_name)
                                                .replace("<team_1_score>", match_score[0])
                                                .replace("<team_2_score>", match_score[1])
                                                .replace("<team_2_name>", data.required.teams.team_2.team_name)
                                                .replace("<winner_name>", winner));


            await channel.sendMessage(fetchmsg.fetchMessage("ending").replace("<version>", CONSTANTS.VERSION));

            setTimeout(async function() {
                await lobby.closeLobby();
                await close();
            }, CONSTANTS.ONE_MIN_MS);
        } else if (match_score[0] === match_score[1] && match_score[0] + match_score[1] === data.required.bo - 1) {

            await channel.sendMessage(fetchmsg.fetchMessage("score").replace("<team_1_name>", data.required.teams.team_1.team_name)
                                              .replace("<team_1_score>", match_score[0])
                                              .replace("<team_2_score>", match_score[1])
                                              .replace("<team_2_name>", data.required.teams.team_2.team_name)
                                              .replace("<best_of>", data.required.bo));

            await channel.sendMessage(fetchmsg.fetchMessage("tiebreaker"));

            // available_picks.splice(available_picks.indexOf(content), 1);

            // TODO: tiebreaker should be freemod
            lobby.setMap(data.required.pool["tb"]);
            lobby.setMods(helpers.determineMod("nm", data.optional.score_mode));
    
            currentMapPlayed = false;
    
            await lobby.startTimer(data.optional.map_wait_time + oneMin);
        } else {
            await channel.sendMessage(fetchmsg.fetchMessage("score").replace("<team_1_name>", data.required.teams.team_1.team_name)
                                              .replace("<team_1_score>", match_score[0])
                                              .replace("<team_2_score>", match_score[1])
                                              .replace("<team_2_name>", data.required.teams.team_2.team_name)
                                              .replace("<best_of>", data.required.bo));

            temporaryStopRecievingMessage = false;

            pickTurn += 1;
            pickTeam = pickTeam === data.required.teams.team_1.team_name ? data.required.teams.team_2.team_name
                                                                         : data.required.teams.team_1.team_name;

            await channel.sendMessage(fetchmsg.fetchMessage("pick_start").replace("<player_name>", pickTeam)
                                              .replace("<maps_available>", helpers.printStringArray(available_picks))
                                              .replace("<pick_time>", data.optional.ban_pick_time));
    
            await lobby.startTimer(data.optional.ban_pick_time);
        }
    })
}

async function createPMListeners() {
    client.on("PM", async (message) => {
        const content = message.message;
        const sender = message.user;

        if (message.self || sender.ircUsername === "BanchoBot" ||
            (!message.self && sender.ircUsername === message.recipient.ircUsername)) return; // TODO: perhaps bandaid fix?

        // TODO: when I PM myself, I get "You have not yet joined this channel" from BanchoBot

        if (!message.self) {
            if (content.startsWith(CONSTANTS.COMMAND_PREFIX)) { 
                const msg = content.substring(1).split(' ');
    
                // TODO: move this to a different file for cleanliness
                switch (msg[0]) {
                    case "commands":
                        await sender.sendMessage(fetchmsg.fetchMessage(CONSTANTS.COMMAND_PREFIX + "commands"));
                        break;
                    case "invite":
                        if (lobby === null) {
                            await sender.sendMessage(fetchmsg.fetchMessage("no_pending_matches"));
                        }
    
                        await sender.sendMessage(fetchmsg.fetchMessage(CONSTANTS.COMMAND_PREFIX + "invite"));
                        await lobby.invitePlayer(sender.ircUsername);
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
            } else {
                // console.log("a problematic message has occurred. this should not be reached just yet. the message:");
                // console.log(content);
                // await sender.sendMessage(fetchmsg.fetchMessage("default"));
            }
        }
    });
}

function determineTeam(playerName, teams) {
    // usually, if the player is not in team 1, the player must be in team 2.
    // however, if a player not in both teams comes into the lobby and types
    // it will mess up the system, so we check for both
    if (teams.team_1.player_names.includes(playerName)) return teams.team_1.team_name;
    if (teams.team_2.player_names.includes(playerName)) return teams.team_2.team_name;

    return false;
}

async function close() {
    console.log("Closing...");
    await client.disconnect();
    console.log("Closed.");
  }

init().then(() => {
    
})