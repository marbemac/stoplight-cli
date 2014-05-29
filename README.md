# stoplight-cli

Command line utilities for Stoplight.io.


## Setup

#### Install Node

Node is an open source platform for building websites in Javascript. There are many ways to install Node, the easiest is by [visiting their site](http://www.nodejs.org/) and running the installer. Alternatively, Mac users can run brew install node if they have [Homebrew](http://brew.sh/) installed.

#### Install the StopLight CLI

Once Node is installed, open your terminal and run the following command.

    # If you're using linux, you might need to sudo
    npm install -g stoplight-cli
    
This will install the StopLight command line tools. To verify the tool installed correctly, run the following command in your terminal:

    stoplight -h
    
If all went well, it should output a list of the available StopLight commands.

## Login

Once you have the CLI tool installed, change into your app's directory on your local machine, and then login:

    cd /path/to/my/app
    stoplight login
    
It will ask you for your authToken. You can find this token by signing in at https://dash.stoplight.com, clicking on your username in the top right, and copying the authToken presented on the screen.

After logging in it will ask you which StopLight app you would like to associate with your current directory. If you have not created an app yet, please head over to https://dash.stoplight.com, sign in, and create one. Then run the following:

    stoplight app
    
## Connect

Once you've logged in and setup your app/environment, it's time to connect! Simply change into the root directory of your app, and run:

    stoplight connect
    
This will start a connection to the StopLight servers. As you make requests via the dashboard at https://dash.stoplight.com, you will see logs of the activity here in your terminal. You're all set running requests and tests on your local environment!    
