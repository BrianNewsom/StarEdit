var RtmClient = require('@slack/client').RtmClient;
var Slack = require('slack-node');
var dym = require('didyoumean');
var _ = require('underscore');

var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var apiToken = process.env["SLACK_BOT_TOKEN"] || ""
var rtm = new RtmClient(apiToken, {logLevel: 'warn'});
var slack = new Slack(apiToken);


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
				// Correct the original message
				updateMessage(
					channel,
					messageToCorrect.ts,
					getCorrectedText(messageToCorrect.text, correctionText)
				);
				// Delete the * message
				deleteMessage(channel, correctionTS);
			})
		}
  });
}

startBot();

/* API Wrappers */
function getMessageToCorrect(channel, userId, cb) {
	slack.api("channels.history", {
		'channel': channel
	}, function(err, response) {
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
	// getCorrectedText("This is a message with a mitsake", "*mistake");
	var correction = asteriskText.substring(1);
	var originalArray = originalText.split(' ');
	var newArray = reverseDYM(originalArray, correction);

	return newArray.join(" ");
}

function reverseDYM(originalArray, correction) {
	var fix = dym(correction, originalArray);

	var index = originalArray.indexOf(fix);
	if (index !== -1) {
		originalArray[index] = correction;
	}

	return originalArray
}