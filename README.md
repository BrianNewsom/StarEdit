# AsteriskCorrections
Slack Bot allowing use of the asterisk syntax to edit a previous message

## Motivation
Especially on mobile, editing a message can be hard.  On other mediums without editing capability (SMS, email), many people use
an asterisk (*) followed by a correction to indicate a fix.  With a slack bot, we can make this change automatically.

## Solution
![Gif showing usage](http://i.giphy.com/ssRWyAb3GbEE8.gif)

## Usage
This bot will be published as a slack app shortly, these instructions are
only for people who are interested in development or beta testing.

Firstly, get a slack api token with permissions for the group you want to enable the feature on.

Then add the following to your bashrc
```
  export SLACK_BOT_TOKEN=(YOUR TOKEN)
```

Then you can run
```
  $ npm install
  $ node index.js
```

