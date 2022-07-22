module.exports = {
    fetchMessage: function (message_id) {
        switch (message_id) {
            case "welcome":
                return `Welcome to AutoRef v<version>! This is an automated bot that will be automatically refereeing one of your upcoming matches. Please visit our website <here> for more details on how this bot works. If you need a list of all the commands of this bot, please type !commands.`
            case "join_before_match":
                return "Hey <player_name>, the match has not started yet. Feel free to continue warming up in solo and join back later. The match will automatically start in <match_start_time_remaining> mintues."
            case "15_mins_before_match":
                return "Your <tournament_initials> match against <player_name> will begin in 15 mins. If you didn't get an invite yet, please type !invite."
            case "5_mins_before_match":
                return "Your <tournament_initials> match against <player_name> will begin in 5 mins. Please get ready to join the lobby. If you didn't get an invite yet, please type !invite."
            case "match_now":
                return "Your <tournament_initials> match against <player_name> is starting. Please join the lobby now. If you didn't get an invite yet, please type !invite."
            case "5_mins_over":
                return "Your <tournament_initials> match against <player_name> started 5 mins ago. Please join the lobby immediately. If you didn't get an invite yet, please type !invite."
            case "forfeit":
                return "You have automatically forfeited your <tournament_initials> match against <player_name> due to <x> minutes being passed."
            case "not_in_lobby":
                return "It seems that you are currently in a match and are not in the lobby. If you need another invite, please type !invite."
            case "roll_start":
                return "The required players have joined the lobby, the match will start now. Please roll in order to determine ban/pick sequence."
            case "roll_tie":
                return "The roll is a tie. Please roll again."
            case "roll_winner_sequence":
                return "<player_name> has won the roll. Please select from the following choices: <sequence>."
            case "roll_loser_sequence":
                return "<player_name>, please select from the following choices: <sequence>."
            case "ban_start":
                return "<player_name>, please ban your <ban_total> map. Valid bans are <maps_available>. You have <ban_time> seconds."
            case "ban_wrong_player":
                return "<player_name>, it is not your turn to ban yet!"
            case "ban_wrong_id":
                return "<player_name>, you have entered a wrong map ban. Valid bans are <maps_available>."
            case "ban_30_seconds":
                return "<player_name>, please ban your <ban_total> map. Valid bans are <maps_available>. You have 30 seconds left."
            case "ban_reserve":
                return "<player_name>, you have exceeded the maximum amount of time available for a ban. Now using your reserve time."
            case "reserve_1_min":
                return "<player_name>, you have 1 minute of reserve time remaining. If you would like more, please type !addreservetime."
            case "reserve_30_secs":
                return "<player_name>, you have 30 seconds of reserve time remaining. If you would like more, please type !addreservetime."
            case "reserve_ban_ran_out":
                "<player_name>, you have exceeded the maximum amount of time available for a ban as well as used up all your reserve time. A random map will now be banned."
            case "auto_ban":
                return "<player_name>, <map_id> has been banned for you."
            case "reserve_request":
                return "<player_name>, <player_name> has requested an additional minute of reserve time. If you would like to accept, please type !acceptreservetime."
            case "reserve_request_accept":
                return ""
            case "reserve_request_deny":
                return ""
            case "bans_finish":
                return "Bans have now concluded. <player_name> banned <map_bans> and <player_name> banned <map_bans>"
            case "pick_start":
                return "<player_name>, it is your turn to pick. Valid picks are are <maps_available>. You have <pick_time> seconds."
            case "pick_30_seconds":
                return "<player_name>, it is your turn to pick. Valid picks are are <maps_available>. You have 30 seconds left."
            case "pick_reserve":
                return "<player_name>, you have exceeded the maximum amount of time available for a pick. Now using your reserve time."
            case "pick_reserve_ran_out":
                return "<player_name>, you have exceeded the maximum amount of time available for a ban as well as used up all your reserve time. A random map will now be picked."
            case "score":
                return "<player_name> <player_name_score> - <player_name_score> <player_name>. This match is a best of <best_of>."
            case "tiebreaker":
                return "The score is a tie! The map will now be replayed."
            case "match_finished":
                return "<player_name> <player_name_score> - <player_name_score> <player_name>. Congratulations to <player_name>, you have won the match. Good game to both players!"
            case "ending":
                return `Thank you for using AutoRef v<version>. If you have any concerns or feedback, please fill out our form <here>. We hope you have a good rest of the day!`
            case "default":
                return "You are talking to AutoRef Bot v<version>. If you are curious to what this is, please check out our website <here>.";
            case "!commands":
                return "Please view a full list of our commands <here>."
            case "!invite":
                return "Sending an invite now. If you didn't get it, please wait a bit or type !invite again."
            case "!startnow":
                return "<player_name>, your opponent has requested to start the match now instead of <datetime>. If you wish to accept, please type !acceptstartnow"
            case "start_now_error":
                return "Error: you do not have a pending match."
            case "no_pending_matches":
                return "Error: you do not have a pending match."
            case "!acceptstartnow":
                return "You have accepted the request. The match will now be starting. Please join the lobby. If you need an invite, please type !invite."
            case "accept_start_now_error":
                return "Error: no one has sent you a startnow request yet."
            default:
                console.log("Unrecognized message id. No messages have been sent.");
                return "Unrecognized message id. No messages have been sent.";
        }
    }
};

