var RtmClient = require('@slack/client').RtmClient;
var Slack = require('slack-node');
var dym = require('didyoumean');
var _ = require('underscore');

var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var apiToken = process.env["SLACK_BOT_TOKEN"] || ""
var rtm = new RtmClient(apiToken, {logLevel: 'warn'});
var slack = new Slack(apiToken);

const DOES_NOT_CONTAIN_ASTERISK = 0
const STARTS_WITH_ASTERISK = 1
const ENDS_WITH_ASTERISK = 2


startBot();

function startBot() {
	console.log("Initiating slack bot - listening for relevant messages.");
	rtm.start();

	rtm.on(RTM_EVENTS.MESSAGE, function (anyMessage) {
		// Listens to all `message` events from the team
		var startsOrEnds = startsOrEndsWithAsterisk(anyMessage.text)
		if (startsOrEnds != DOES_NOT_CONTAIN_ASTERISK) {
			var correctionText = anyMessage.text;
			var correctionTS = anyMessage.ts;
			var correctionUser = anyMessage.user;
			var channel = anyMessage.channel;
			getMessageToCorrect(channel, correctionUser, function(messageToCorrect) {
				// Correct the original message if we have a change
				var correctedText = getCorrectedText(messageToCorrect.text, correctionText, startsOrEnds);
				if (correctedText) {
					updateMessage(
						channel,
						messageToCorrect.ts,
						correctedText
					);
					// Delete the * message
					deleteMessage(channel, correctionTS);
				}
			})
		}
  });
}

/* API Wrappers */
function getMessageToCorrect(channel, userId, cb) {
	if (channel[0].toLowerCase() == 'c') {
		getChannelMessage(channel, function(err, response) {
			findMostRecentMessage(err, response, userId, cb);
		})
	} else if (channel[0].toLowerCase() == 'd') {
		getDirectMessage(channel, function(err, response) {
			findMostRecentMessage(err, response, userId, cb);
		})
	}
}

function getChannelMessage(channel, cb) {
	slack.api("channels.history", {
		'channel': channel
	}, function(err, response) {
		cb(err, response);
	})
}

function getDirectMessage(channel, cb) {
	slack.api("im.history", {
		'channel': channel
	}, function(err, response) {
		cb(err, response);
	})
}

function findMostRecentMessage(err, response, userId, cb) {
	if (err || !response.ok) {
		if (response.error == "channel_not_found") {
			console.log("The channel queried does not exist :/");
		} else {
			console.log(response.error);
		}
		return;
	}
	// Only search for user's message
	var filteredMessages = _.filter(response.messages,
		function(m) { return m.user === userId && !startsOrEndsWithAsterisk(m.text)}
	)

	if (cb) {
		// Skip the * message, it must be the next message for now
		cb(_.first(filteredMessages))
	}
}


function updateMessage(channel, timeStamp, newText) {
	slack.api("chat.update", {
		'ts': timeStamp,
		'channel': channel,
		'text': newText
	}, function(err, response) {
		if (err) {
			console.log("FAILURE");
		}
	});
}

function deleteMessage(channel, ts) {
	slack.api("chat.delete", {
		"channel": channel,
		"ts": ts
	})
}

/* Utility functions */
function startsOrEndsWithAsterisk(msgText) {
	if (msgText) {
		if (msgText[0] == "*")
			return STARTS_WITH_ASTERISK
		else if (msgText[msgText.length-1] == "*") 
			return ENDS_WITH_ASTERISK
	}
	return DOES_NOT_CONTAIN_ASTERISK
}

function getCorrectedText(originalText, asteriskText, startsOrEnds) {
	/* Returns null if no change is made
	  getCorrectedText("This is a message with a mitsake", "*mistake", STARTS); */
	var correction = ""
	if (startsOrEnds == ENDS_WITH_ASTERISK) 
		correction = asteriskText.substring(0,asteriskText.length-1)
	else
		correction = asteriskText.substring(1);

	var originalArray = originalText.split(' ');
	var newArray = reverseDYM(originalArray, correction);

	if (newArray) {
		return newArray.join(" ");
	} else {
		return null
	}
}

function reverseDYM(stringArray, correction) {
	// Return null if no correction can be made
	var fix = dym(correction, stringArray);

	if (fix !== null) {
		var index = stringArray.indexOf(fix);
		if (index !== -1) {
			stringArray[index] = correction;
		}
		return stringArray;
	} else {
		console.log("No matching edit found, returning null");
		return null;
	}
}