var RtmClient = require('@slack/client').RtmClient;
var Slack = require('slack-node');
var dym = require('didyoumean');
var _ = require('underscore');

var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var apiToken = process.env["SLACK_BOT_TOKEN"] || ""
var rtm = new RtmClient(apiToken, {logLevel: 'warn'});
var slack = new Slack(apiToken);

startBot();

function startBot() {
	console.log("Initiating slack bot - listening for relevant messages.");
	rtm.start();

	rtm.on(RTM_EVENTS.MESSAGE, function (anyMessage) {
		// Listens to all `message` events from the team
		if (startsWithAsterisk(anyMessage.text)) {
			var correctionText = anyMessage.text;
			var correctionTS = anyMessage.ts;
			var correctionUser = anyMessage.user;
			var channel = anyMessage.channel;
			getMessageToCorrect(channel, correctionUser, function(messageToCorrect) {
				// Correct the original message if we have a change
				var correctedText = getCorrectedText(messageToCorrect.text, correctionText);
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
	slack.api("channels.history", {
		'channel': channel
	}, function(err, response) {
		if (err || !response.ok) {
			if (response.error == "channel_not_found") {
				console.log("StarEdit does not currently support direct messages. We're working on it!");
			} else {
				console.log(response.error);
			}
			return;
		}
		// Only search for user's message
		var filteredMessages = _.filter(response.messages,
			function(m) { return m.user === userId && !startsWithAsterisk(m.text)}
		)

		if (cb) {
			// Skip the * message, it must be the next message for now
			cb(_.first(filteredMessages))
		}
	})
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
function startsWithAsterisk(msgText) {
	if (msgText) {
		if (msgText[0] == "*") return true
	}
	return false;
}

function getCorrectedText(originalText, asteriskText) {
	/* Returns null if no change is made
	  getCorrectedText("This is a message with a mitsake", "*mistake"); */
	var correction = asteriskText.substring(1);
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