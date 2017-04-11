
// Read an external file where values await.
var fs = require('fs');
var custom_data = fs.readFileSync('data.txt').toString().split("\n");

// HTTP request making tool used for POST to WarholsChannel
var requestify = require('requestify'); 

// Post to WarholsChannel New Content
requestify.post('https://maker.ifttt.com/trigger/new_content/with/key/' + custom_data[5] , { // IFTTT secret key.
        value1: msg.from.username , // telegram user.
        value2: contentSubmission[1] , // content title.
        value3: contentSubmission[2] // content URL.
    })
    .then(function(response) {
        // Get the response and write to console
        response.body;
        console.log('Response: ' + response.body);

    });