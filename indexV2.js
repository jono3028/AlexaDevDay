
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

var http = require('http')
var querystring = require('querystring')
var postData = querystring.stringify({
  'displayname': 'Adam West'
})

class Celeb {
  
  constructor(data) { // param is a dict. all values are in string format, DOB & DOD are DD/MM/YYYY 
    this.birth = this.dateConst(data.DOB)
    this.death = this.dateConst(data.DOD)
    this.field = data.field
    this.info = data.info
    this.cause = this.causeConst(data.cause)
  }

  dateConst(day) {
    
    let _day = day.split('/'),
      _date = new Date(_day[2],_day[0],_day[1])
    
    if (_date == 'Invalid Date'){return null}
    
    return _date
  }

  causeConst(cause) {
    
    if (cause.length > 20) {return 'Unknown'}
    
    return cause
  }
}

function pathGen (nameStr) {  // function used to take the celeb's name and generate the path for http GET command
  
  var splitName = nameStr.split(' ')

  if (splitName.length > 2) {
    splitName[0] = splitName[0] + '+' + splitName[1]
    splitName[1] = splitName[2]
  }

  return `/dead.nsf/${splitName[1].charAt(0).toLowerCase()}names-nf/${splitName[1] + '+' + splitName[0]}`
}

function dataParse (rawData) { // Parse the desired data from the downloaded data

  let idxField = rawData.indexOf('Field:') + 31,
    idxFieldEnd = rawData.indexOf('<br>', idxField),
    idxInfo = rawData.indexOf('Info:') + 30,
    idxInfoEnd = rawData.indexOf('</td>', idxInfo),
    idxDeath = rawData.indexOf('Date of Death:') + 39,          // find start of date string
    offset = (idxDeath == 38)? 63 : 39,                         // if celeb is alive idxDeath == 38, offset = 63 if alive, 39 if dead
    idxBirth = rawData.indexOf('Date of Birth:') + offset,      // find start of date string
    idxCause = rawData.indexOf('Cause of Death', idxDeath) + 46, // find start of cause string
    idxCauseEnd = rawData.indexOf('</td>', idxCause) 
               // find end of cause string
  return {
    field: rawData.slice(idxField, idxFieldEnd),
    info: rawData.slice(idxInfo,idxInfoEnd),
    cause: rawData.slice(idxCause,idxCauseEnd),
    DOB: rawData.slice(idxBirth, idxBirth + 10),
    DOD: rawData.slice(idxDeath, idxDeath + 10)
  }
}

const options = {
  name: 'Adam West',
  hostname: 'www.deadoraliveinfo.com',
  port: 80,
  path: pathGen('Jimmy Carter'),
  method: 'GET'
};

console.log('PATH: ', options.path)

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`)
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`)
  res.setEncoding('utf8');
  let rawData = ''
  res.on('data', (chunk) => {
    rawData += chunk
  });
  res.on('end', () => {
    try {
      var celeb = new Celeb(dataParse(rawData))
      console.log('CELEB', celeb)
    } catch (e) {
      console.error(`ERROR: ${e.message}`)
    }
  })
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData)
req.end();