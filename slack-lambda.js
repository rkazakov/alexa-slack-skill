var https = require('https');

// posting to Slack
/*
  Incoming WebHooks
  Get incomming webhook from Slack API
*/
var SLACK_CHANNEL_NAME = '#team-standup';
var SLACK_BOT_NAME = 'alexa';
var SLACK_BOT_API_TOKEN = 'XXXXXXXXX/XXXXXXXX/AAAAAAAAAAAAAAAAAAAAAAAA'

// reading from Slack
var SLACK_USER_TOKEN = 'xoxp-xxxxxxxxxxx-xxxxxxxxxxx-xxxxxxxxxxx-xxxxxxxxxx';
var SLACK_CHANNEL_ID = 'C1YFDRYCX' // #team-standup

var optionsPostMessage = {
  host: 'hooks.slack.com',
  port: 443,
  path: '/services/' + SLACK_BOT_API_TOKEN,
  method: 'POST'
};

var optionsGetMessages = {
  host: 'slack.com',
  port: 443,
  path: '/api/channels.history?token=' + SLACK_USER_TOKEN + '&channel=' + SLACK_CHANNEL_ID,
  method: 'GET'
};

/**
 * This sample shows how to create a simple Lambda function for handling speechlet requests.
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
      console.log("event.session.application=" + event.session.application.applicationId);

      /**
       * Uncomment this if statement and replace application.id with yours
       * to prevent other voice applications from using this function.
       */
      /*
      if (event.session.application.id !== "amzn1.echo-sdk-ams.app.[your own app id goes here]") {
          context.fail("Invalid Application ID");
      }
      */

      if (event.session.new) {
        onSessionStarted({requestId: event.request.requestId}, event.session);
      }

      if (event.request.type === "LaunchRequest") {
        onLaunch(event.request,
                 event.session,
                 function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                 });
      }  else if (event.request.type === "IntentRequest") {
        onIntent(event.request,
                 event.session,
                 function callback(sessionAttributes, speechletResponse) {
                     context.succeed(buildResponse(sessionAttributes, speechletResponse));
                 });
      } else if (event.request.type === "SessionEndedRequest") {
        onSessionEnded(event.request, event.session);
        context.succeed();
      }
    } catch (e) {
      context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
  console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the app without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
  console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId);
  getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this application.
 */
function onIntent(intentRequest, session, callback) {
  console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId);

  var intent = intentRequest.intent;
  var intentName = intentRequest.intent.name;

  if ("PostUpdateIntent" === intentName) {
    console.log("PostUpdateIntent");
    setMessageInSession(intent, session, callback);
  } else if ("GetUpdatesIntent" === intentName) {
    console.log("GetUpdatesIntent");
    getMessageFromSession(intent, session, callback);
  } else if ("WinTeamIntent" === intentName) {
    console.log("WinTeamIntent");
    getWinSession(intent, session, callback);
  } else if ("AtoStatusIntent" === intentName) {
    console.log("AtoStatusIntent");
    getAtoStatusSession(intent, session, callback);
  } else if ("GaryBeardIntent" === intentName) {
    console.log("GaryBeardIntent");
    getGaryBeardSession(intent, session, callback);
  } else {
    console.log("Unknown intent");
    throw "Invalid intent";
  }
}

/**
 * Called when the user ends the session.
 * Is not called when the app returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
  console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
}

/**
 * Helpers that build all of the responses.
 */
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: "SSML",
      ssml: '<speak>' + output + '</speak>'
    },
    card: {
      type: "Simple",
      title: "SessionSpeechlet - " + title,
      content: "SessionSpeechlet - " + output
    },
    reprompt: {
        outputSpeech: {
          type: "PlainText",
          text: repromptText
        }
    },
    shouldEndSession: shouldEndSession
  }
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: "1.0",
    sessionAttributes: sessionAttributes,
    response: speechletResponse
  }
}

/**
 * Functions that control the app's behavior.
 */
function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = 'Welcome';
    var speechOutput = 'Welcome to Alexa Standup Update skill.';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    // var repromptText = "You can give me your message by saying, "
    //             + "my message is...";
    var shouldEndSession = false;
    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Sets the message in the session and prepares the speech to reply to the user.
 */
function setMessageInSession(intent, session, callback) {
    var cardTitle = intent.name;
    var messageSlot = intent.slots.Message;
    var personSlot = intent.slots.Person;
    var statusSlot = intent.slots.Status;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    if (messageSlot) {
      message = messageSlot.value;
      sessionAttributes = createMessageAttributes(message);
      speechOutput = 'Your stand up update has been added.';
      var req = https.request(optionsPostMessage, function(res) {
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
              callback(sessionAttributes,
              buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
          });
      });
      req.on('error', function(e) {
          console.log('problem with request: ' + e.message);
          context.fail(e);
      });
      req.write('{"channel": "' + SLACK_CHANNEL_NAME + '", "username": "' + SLACK_BOT_NAME + '", "text": "'
        + message + ' #standup", "icon_emoji": ":ghost:"}');
      req.end();
    }
    else if (personSlot && statusSlot) {
      var person = personSlot.value;
      var status = statusSlot.value;
      //sessionAttributes = createMessageAttributes(message);
      speechOutput = 'Your stand up update has been added.';
      var req = https.request(optionsPostMessage, function(res) {
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
              callback(sessionAttributes,
              buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
          });
      });
      req.on('error', function(e) {
          console.log('problem with request: ' + e.message);
          context.fail(e);
      });
      req.write('{"channel": "' + SLACK_CHANNEL_NAME
        + '", "username": "' + SLACK_BOT_NAME + '", "text": "'
        + person + ' is ' + status + ' today' + ' #standup", "icon_emoji": ":ghost:"}');
      req.end();
    } else {
      speechOutput = "I didn't hear your message clearly";
      callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function createMessageAttributes(message) {
    return {
        message: message
    };
}

function getMessageFromSession(intent, session, callback) {
    var cardTitle = intent.name;
    var message;
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    var req = https.request(optionsGetMessages, function(res) {
      var data = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function() {
        var messages = JSON.parse(data).messages;
        messages = messages.filter(function(message) {
          return message.text && (message.text.indexOf('#standup') > -1 || message.text.indexOf('<#C1Y428H2S>') > -1);
        });

        speechOutput = 'Updates are: ' + messages.reduce(function(prev, curr) {
          return prev + curr.text.replace(' <#C1Y428H2S>', '').replace(' #standup', '') + ". ";
        }, '');
        repromptText = "I didn't hear your message clearly";
        callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
      });
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
      context.fail(e);
    });
    req.end();
}

function getAtoStatusSession(intent, session, callback) {
    var cardTitle = intent.name;
    var message;
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    var req = https.request(optionsGetMessages, function(res) {
      var data = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function() {
        var messages = JSON.parse(data).messages;
        messages = messages.filter(function(message) {
          return message.text && (message.text.indexOf('#ato') > -1);
        });
        if (messages.length > 0) {
          speechOutput = messages[0].text.replace('#ato','').replace('ATO','<say-as interpret-as="spell-out">ATO</say-as>');
        }
        else {
          speechOutput = 'Who knows, every now and then.'
        }
        repromptText = "I didn't hear your message clearly";
        callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
      });
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
      context.fail(e);
    });
    req.end();
}

function getWinSession(intent, session, callback) {
    var cardTitle = intent.name;
    var message;
    var repromptText = "I didn't hear your message clearly";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = 'Team Alexa of course ';
    callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

function getGaryBeardSession(intent, session, callback) {
    var cardTitle = intent.name;
    var message;
    var repromptText = "I didn't hear your message clearly";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = 'He should not have grown it in the first place';
    callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}
