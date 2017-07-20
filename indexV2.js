
// 1. Text strings =====================================================================================================
//    Modify these strings and messages to change the behavior of your Lambda function

var languageStrings = {
    'en': {
        'translation': {
            'WELCOME' : "Welcome to Alive or Dead",
            'HELP'    : "Say about, to hear more bout this skill or ask is such and such alive?",
            'ABOUT'   : "Use this skill to find out if that famous person you just saw is alive or not.",
            'STOP'    : "See you next time, if you're still alive!"
        }
    }
    // , 'de-DE': { 'translation' : { 'TITLE'   : "Local Helfer etc." } }
};
var data = {
  'names' : [
    { 'name' : 'Adam West',
      'field' : 'Entertainment',
      'info' : 'He played Batman in the 1960s TV series "Batman"',
      'birth' : new Date(1928, 9, 19),
      'death' : new Date(2017, 6, 9),
      'cause' : 'cancer'
    },
    { 'name' : 'Sammy Hagar',
      'field' : 'Music',
      'info' : 'Rock singer, solo hits include "Your Love Is Driving Me Crazy" and "I Can\'t Drive 55", later became lead singer of Van Halen, heard on their hits "Why Can\'t This Be Love" and "When It\'s Love", among other songs',
      'birth' : new Date(1947, 10, 13),
      'death' : null,
      'cause' : null
    },
  ]  
}

// 2. Skill Code =======================================================================================================

var Alexa = require('alexa-sdk');

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);

    // alexa.appId = 'amzn1.echo-sdk-ams.app.1234';
    ///alexa.dynamoDBTableName = 'YourTableName'; // creates new table for session.attributes
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        var say = this.t('WELCOME') + ' ' + this.t('HELP');
        this.emit(':ask', say, say);
    },

    'Unhandled': function() {
        this.emit(':tell', 'Who are you asking about?');
    },

    'AboutIntent': function () {
        this.emit(':tell', this.t('ABOUT'));
    },

    'AliveOrDeadIntent': function () {
      var say = ''

      var name = this.event.request.intent.slots.name.value
      var celeb = getCelebByName(name)
      var age = getAge(celeb.birth, celeb.death)

    	if (celeb.death) {
    	    say = "Sorry, " + celeb.name + " has died."
    	} else {
    	    say = celeb.name + " is still alive and is " + age + " years old."
    	}
        this.emit(":ask",say);
    },

    'AMAZON.YesIntent': function () {
        var restaurantName = this.attributes['restaurant'];
        var restaurantDetails = getRestaurantByName(restaurantName);

        var say = restaurantDetails.name
            + ' is located at ' + restaurantDetails.address
            + ', the phone number is ' + restaurantDetails.phone
            + ', and the description is, ' + restaurantDetails.description
            + '  I have sent these details to the Alexa App on your phone.  Enjoy your meal! <say-as interpret-as="interjection">bon appetit</say-as>' ;

        var card = restaurantDetails.name + '\n' + restaurantDetails.address + '\n'
            + data.city + ', ' + data.state + ' ' + data.postcode
            + '\nphone: ' + restaurantDetails.phone + '\n';

        this.emit(':tellWithCard', say, restaurantDetails.name, card);

    },

    'AMAZON.NoIntent': function () {
        this.emit('AMAZON.StopIntent');
    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', this.t('HELP'));
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP'));
    }

};

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================

function getCelebByName (name) {
    var celeb
    
    for (var i = 0; i < data.names.length; i++) {
      var libName = data.names[i].name
        if (libName.toLowerCase() == name.toLowerCase()) {
            celeb = data.names[i]
        }
    }
    
    return celeb;
}

function getAge(birth, death) {
    var birthDate = new Date(birth)
    var endDate = (death) ? new Date(death) : new Date()
    var age = endDate.getFullYear() - birthDate.getFullYear()
    var m = endDate.getMonth() - birthDate.getMonth()

    if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
        age--
    }
    return age;
}