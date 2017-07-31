
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

// 2. Skill Code =======================================================================================================

var Alexa = require('alexa-sdk');

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    
    // alexa.appId = 'amzn1.echo-sdk-ams.app.1234';
    // alexa.dynamoDBTableName = 'YourTableName'; // creates new table for session.attributes
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
        this.emit(':tell', 'who would you like to know about?');
    },

    'AboutIntent': function () {
        this.emit(':tell', this.t('ABOUT'));
    },

    'AliveOrDeadIntent': function () {
      var say = ''

      var name = this.event.request.intent.slots.name.value
      
      var celeb = requestData(name, celeb => {
        var age = celeb.age()

        if (celeb.death) {
            say = "sorry, " + celeb.name + " has died. would you like to know more?"
        } else {
            say = celeb.name + " is still alive and is " + age + " years old. would you like to know more?"
        }
          this.emit(":ask", say);
      })
    },

    'AMAZON.YesIntent': function () {
        var restaurantName = this.attributes['restaurant'];
        var restaurantDetails = getRestaurantByName(restaurantName);

        var say = "known for there work in " + celeb.field + ". " + celeb.name + celeb.info;

        this.emit(':tell', say);

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

var http = require('http');

class Celeb {
  
  constructor(data) { // param is a dict. all values are in string format, DOB & DOD are DD/MM/YYYY 
    this.name;
    this.birth = this.dateConst(data.DOB);
    this.death = this.dateConst(data.DOD);
    this.field = data.field;
    this.info = data.info;
    this.cause = this.causeConst(data.cause);
  }

  dateConst(day) {
    
    let _day = day.split('/'),
      _date = new Date(_day[2],_day[0],_day[1]);
    
    if (_date == 'Invalid Date'){return null}
    
    return _date;
  }

  causeConst(cause) {
    
    if (cause.length > 20) {return 'Unknown'}
    
    return cause;
  }

  age() {
    var endDate = (this.death) ? this.death : new Date();
    var age = endDate.getFullYear() - this.birth.getFullYear();
    var m = endDate.getMonth() - this.birth.getMonth();

    if (m < 0 || (m === 0 && endDate.getDate() < this.birth.getDate())) {
        age--;
    }

    return age;
  }
}

function requestData(celebName, callback) {
  var options = {
    name: celebName,
    hostname: 'www.deadoraliveinfo.com',
    port: 80,
    path: pathGen(celebName),
    method: 'GET'
  }

  var req = http.request(options, (res) => {
    res.setEncoding('utf8');
    
    var rawData = '';
    
    res.on('data', (chunk) => {
      rawData += chunk
    });
    
    res.on('end', () => {
      try {
        let celeb =  new Celeb(dataParse(rawData))
        celeb.name = celebName
        callback(celeb)
      } catch (e) {
        console.error(`ERROR: ${e.message}`)
      }
    })
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`)
  });

  req.end();
}

function pathGen (nameStr) {  // function used to take the celeb's name and generate the path for http GET command
  
  var splitName = nameStr.split(' ');

  if (splitName.length > 2) {
    splitName[0] = splitName[0] + '+' + splitName[1]
    splitName[1] = splitName[2]
  }

  return `/dead.nsf/${splitName[1].charAt(0).toLowerCase()}names-nf/${splitName[1] + '+' + splitName[0]}`;
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
    idxCauseEnd = rawData.indexOf('</td>', idxCause);            // find end of cause string

  return {
    field: rawData.slice(idxField, idxFieldEnd),
    info: rawData.slice(idxInfo,idxInfoEnd),
    cause: rawData.slice(idxCause,idxCauseEnd),
    DOB: rawData.slice(idxBirth, idxBirth + 10),
    DOD: rawData.slice(idxDeath, idxDeath + 10)
  };
}

function getCelebByName (name) {
  var celeb;
  
  for (var i = 0; i < data.names.length; i++) {
    var libName = data.names[i].name;
      if (libName.toLowerCase() == name.toLowerCase()) {
          celeb = data.names[i];
      }
  }

  return celeb;
}