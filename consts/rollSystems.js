const CONSTANTS = require('../consts/consts');
const helpers = require('../consts/helpers');
const fetchmsg = require('../consts/messages');

function storeBans(content, active, passive) {
    if (content.toLowerCase() === "pick first") {
        active.pick = "first";
        passive.pick = "second";
    } else if (content.toLowerCase() === "pick second") {
        active.pick = "second";
        passive.pick = "first";
    } else if (content.toLowerCase() === "ban first") {
        active.ban = "first";
        passive.ban = "second";
    } else if (content.toLowerCase() === "ban second") {
        active.ban = "second";
        passive.ban = "first";
    }
}

// TODO: make this a class and make every system an instance?
async function ukcc(rollWinner, rollLoser, data, channel, myEmitter) {
    let teamChoices = {
        rollWinner: {
            "pick": "",
            "ban": ""
        },
        rollLoser: {
            "pick": "",
            "ban": ""
        }
    };

    let choices = ["pick first", "pick second", "ban first", "ban second"];
    
    let currentTurn = rollWinner;

    await channel.sendMessage(fetchmsg.fetchMessage("roll_winner_sequence").replace("<player_name>", rollWinner)
                                                                           .replace("<sequence>", helpers.printStringArray(choices)
                                                                           .replaceAll("p", "P").replaceAll("b", "B")));

    // read in pick/ban order choice from user
    channel.on("message", this.eventListener = async (message) => {
        const content = message.message;
        const sender = message.user;

        // make sure the bot doesn't take its own response as well as banchobot as a choice
        if (message.self || sender.ircUsername === "BanchoBot") return;

        // detect regular message, don't need to do anything
        if (!helpers.checkPickBanSequenceKeywords(content.toLowerCase())) return;

        // make sure the right team chooses
        if (currentTurn !== helpers.determineTeam(sender.ircUsername, data.required.teams)) {
            await channel.sendMessage(fetchmsg.fetchMessage("roll_sequence_wrong_player").replace("<player_name>", sender.ircUsername));
            return;
        }

        // make sure the choice is a valid choice
        if (!choices.includes(content.toLowerCase())) {
            await channel.sendMessage(fetchmsg.fetchMessage("roll_sequence_wrong_id").replace("<player_name>", sender.ircUsername)
                                                            .replace("<sequence>", helpers.printStringArray(choices))
                                                            .replaceAll("p", "P").replaceAll("b", "B"));
            return;
        }

        // the choice is valid and sent by the right team, we proceed
        if (currentTurn === rollWinner) storeBans(content, teamChoices.rollWinner, teamChoices.rollLoser);
        else storeBans(content, teamChoices.rollLoser, teamChoices.rollWinner);

        if (content.toLowerCase().includes("pick")) {
            choices.splice(choices.indexOf("pick first"), 1);
            choices.splice(choices.indexOf("pick second"), 1);
        } else if (content.toLowerCase().includes("ban")) {
            choices.splice(choices.indexOf("ban first"), 1);
            choices.splice(choices.indexOf("ban second"), 1);
        }

        // if end
        if (choices.length === 0) {
            const sequence = {
                "pickFirst": "",
                "banFirst": ""
            };

            sequence.pickFirst = teamChoices.rollWinner.pick === "first" ? rollWinner : rollLoser;
            sequence.banFirst = teamChoices.rollWinner.ban === "first" ? rollWinner : rollLoser;

            myEmitter.emit('determinedBanPickSequence', sequence);

            channel.removeListener("message", this.eventListener);
        } else {
            currentTurn = currentTurn === rollWinner ? rollLoser : rollWinner;

            await channel.sendMessage(fetchmsg.fetchMessage("roll_loser_sequence").replace("<player_name>", rollLoser)
                                              .replace("<sequence>", helpers.printStringArray(choices)
                                              .replaceAll("p", "P").replaceAll("b", "B")));
        }
    });
}

async function processRollSystems(rollWinner, rollLoser, data, channel, myEmitter) {
    const rollSystem = data.optional.roll_system

    // for now we use UKCC roll system:
    if (rollSystem === "ukcc") {
        await ukcc(rollWinner, rollLoser, data, channel, myEmitter);
    }
}

module.exports = {
    processRollSystems
};