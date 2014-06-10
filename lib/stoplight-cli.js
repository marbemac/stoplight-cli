#! /usr/bin/env node


var os = require('os')
  , program = require('commander')
  , prompt = require('prompt')
  , colors = require('colors')
  , request = require('request')
  , nconf = require('nconf');

nconf.file('stoplight.json');

var env = {
  dashUrl: "https://dash.stoplight.io",
  apiUrl: "https://api.stoplight.io",
  pusherKey: "18aa3a51daa63ece0cb9"
  // dashUrl: "http://localhost:3000",
  // apiUrl: "http://localhost:8083",
  // pusherKey: "34cbf61a8b6d1ec1b340"
}

//
// HELPER FUNCTIONS
//

var loginMessage = function() {
  console.log("You need to login first. Run `stoplight login`".red);
};
var setEnvironment = function(authToken, app) {
  // send the app id, auth token, and os name to post /environments to create a new env
  // then save the envId
  var options = {
    method: 'post',
    uri: env.apiUrl+'/apps/'+app._id+'/environments',
    json: {
      authToken: authToken,
      local: true,
      name: os.hostname()
    }
  }

  console.log('Setting up your environment.'.yellow);
  request(options, function(error, response, body) {
    if (response.statusCode == 401) {
      nconf.set('authToken', null);
      nconf.save()
      loginMessage();
      return;
    }
    if (error) {
      console.log(error.message.red);
      return;
    }
    if (response.error) {
      console.log(error.response.red);
      return;
    }

    if (!body.response.environment) {
      console.log(("Unable to create an environment for you. If this issue continues, please shoot an email to support@stoplight.io!").red);
      return;
    }

    var environment = body.response.environment;

    nconf.set('environment:_id', environment._id);
    nconf.set('environment:name', environment.name);
    nconf.save();
    console.log((environment.name+" set as your current environment.").green);

    if (!environment.url) {
      prompt.start();

      schema = {
        properties: {
          selection: {
            description: "Environment URL, e.g. http://localhost:3000",
            required: true,
            conform: function (value) {
              return true;
            }
          }
        }
      };

      prompt.get(schema, function (err, result) {
        var options = {
          method: 'put',
          uri: env.apiUrl+'/environments/'+environment._id+'',
          json: {
            authToken: authToken,
            url: result.selection
          }
        }

        console.log('Saving environment URL.'.yellow);
        request(options, function(error, response, body) {
          console.log(("Saved! You can always change this URL at "+env.dashUrl+".").green);
          console.log("Run 'stoplight connect' to connect to your app.".yellow);
        })
      });
    } else {
      console.log("Run 'stoplight connect' to connect to your app.".yellow);
    }
  });
};
var setApp = function(authToken) {
  var options = {
    method: 'get',
    uri: env.apiUrl+'/apps',
    json: true,
    qs: {
      authToken: authToken
    }
  }

  request(options, function(error, response, body) {
    if (error) {
      console.log(error.message.red);
      return;
    }
    if (response.statusCode != 200) {
      nconf.set('authToken', null);
      nconf.save()
      loginMessage();
      return;
    }
    if (response.error) {
      console.log(error.response.red);
      return;
    }

    nconf.set('authToken', authToken);
    nconf.save()

    if (!body.response.apps || body.response.apps.length == 0) {
      console.log(("You have not created any apps yet. Please login at "+env.dashUrl+" and create one. After you've done that, run 'stoplight app' to setup a local environment for the app.").red);
      return;
    }

    console.log('Please select an app:'.yellow);

    var apps = body.response.apps;
    for(var i = 0; i < apps.length; i++) {
      console.log(('[ '+(i+1)+' ] '+apps[i].name).cyan);
    }

    prompt.start();

    schema = {
      properties: {
        selection: {
          description: "App Selection [1-"+apps.length+"]:",
          required: true,
          conform: function (value) {
            value = parseInt(value);
            if (value > 0 && value <= apps.length) {
              return true;
            } else {
              return false;
            }
          }
        }
      }
    };

    prompt.get(schema, function (err, result) {
      app = apps[parseInt(result.selection) - 1]

      nconf.set('app:_id', app._id);
      nconf.set('app:name', app.name);
      nconf.save();
      console.log((app.name+" set as your current app.").green);

      setEnvironment(authToken, app);
    });
  });
};



//
// CLI PROGRAM
//

program
  .version('0.1.3')


program
  .command('env')
  .description('Info about your current environment')
  .action(function() {
    console.log(("authToken: "+nconf.get('authToken')).yellow);
    console.log(("app: "+nconf.get('app:name')).yellow);
    console.log(("environment: "+nconf.get('environment:name')).yellow);
  });


program
  .command('login')
  .description('Login to the StopLight service.')
  .action(function() {
    prompt.start();

    var schema = {
      properties: {
        authToken: {
          required: true
        }
      }
    };

    console.log(("Your authToken can be found by signing in at "+env.dashUrl+" and clicking your name in the top right.").yellow);

    prompt.get(schema, function (err, result) {
      if (err) {
        console.log(err);
        return;
      }

      setApp(result.authToken);
    });
  });


program
  .command('app')
  .description('Set your current app')
  .action(function(){
    var authToken = nconf.get('authToken');
    if (!authToken) {
      loginMessage();
      return;
    }

    console.log('Retrieving your apps'.yellow);
    setApp(authToken);
  });


program
  .command('connect')
  .description('Connect to the StopLight service')
  .action(function(){
    var authToken = nconf.get('authToken');
    if (!authToken) {
      loginMessage();
      return;
    }
    var appId = nconf.get('app:_id');
    if (!appId) {
      console.log('Please select an app before connecting. Run `stoplight app`.'.red);
      return;
    }
    var envId = nconf.get('environment:_id');
    if (!envId) {
      console.log('Please select an environment before connecting. Run `stoplight app`.'.red);
      return;
    }

    console.log('Connecting to StopLight.'.yellow);

    var Pusher = require('pusher-client');
    var socket = new Pusher(env.pusherKey, {encrypted: true});
    var channel = socket.subscribe(authToken+'-'+envId);

    console.log('Connected.'.yellow);
    console.log('Waiting for requests. Go to the web dashboard and make requests or run tests.'.yellow);

    channel.bind('do_request', function(requestData) {
      var options = requestData.options;
      console.log(('Starting '+options.method+' request for '+options.uri).cyan.bold);

      var start = process.hrtime()
      request(options, function(error, response, body) {
        var stop = process.hrtime(start);
        var duration = stop[0] * 1000 + Math.round(stop[1] / 1000000);
        console.log(('>>> Local request completed in '+duration+'ms').green);

        var data = {
          duration: duration,
          error: error,
          response: response
        }

        console.log('>>> Sending results to StopLight'.yellow);

        var completeOptions = {
          method: 'put',
          uri: env.apiUrl+'/requests/'+requestData._id+'/complete',
          json: {
            authToken: authToken,
            requestData: data
          }
        }

        request(completeOptions, function(error, response, body) {
          if (error) {
            console.log(error.message.red);
            return;
          }
          if (response.statusCode != 200) {
            console.log("Something went wrong on the StopLight server.".red);
            return;
          }
          if (response.error) {
            console.log(error.response.red);
            return;
          }
          console.log('>>> Results recorded.'.green);
        });
      });

    });
  });


program.parse(process.argv);
