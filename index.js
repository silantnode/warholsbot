'use strict';

// Read an external file where values await.
var fs = require('fs');
var custom_data = fs.readFileSync('data.txt').toString().split("\n");

// Create the connection to the database.
const mysql = require('mysql');

const connection = mysql.createConnection({
  host     : custom_data[1], // Host address of the database server.
  user     : custom_data[2], // Username for the coinspiration account.
  password : custom_data[3], // Password for the coinspiration account.
  database : custom_data[4]  // Name of the database we are accessing.

});

connection.connect( function (error){
  
  if (error) {

    console.log('Error connecting to Db');
    return;

  }

  console.log('Connection established');

});

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot(custom_data[0]);

// Ask module

bot.use(require('telebot/modules/ask.js'));


var isUrl = require('is-url-superb');


// Telebot button names

const GET_BUTTON = "/get";
const BALANCE_BUTTON = "/balance";
const SPEND_BUTTON = "/spend";
const START_BUTTON = "/start";
const BACK_BUTTON = "/back";

const GIFT_ECON = "/gift";
const CREATIVE_ECON = "/creative";
const SPECULATIVE_ECON = "/speculative";
const PUBLISH_BUTTON = "/publish";

const MAX_LIST_DISPLAY = 5; // Maximum number of items to be displayed for the user to choose from whenever they are presented with multiple choice selections.
const RAND_GIFT_RANGE = 10; // Range setting for randomly giving out warhols.

const DESCRIPTION_MAX_LENGTH = 140; // How long a description of content is allowed to be.

// Holds the random selection of five items to be selected from by the user. The list is changed every time the user selects the 'creative' option when selecting 'get'
var currentCreativeSelection = []; 
var currentGiftSelection = [];

// Holds two items submitted by a user in spend/creative mode: 
// - url for the content.
// - description of the content.
// Is reset after every use. 
var contentSubmission = [];

// Set by /get, /spend. 1 is get and 2 is spend. This allows me to use the same command set of '/gift', '/creative' and 
// '/speculative' twice by simply checking the mode whenever these commands are called. Probably not the best approach
// but it was the first solution I came up with so I decided to run with it and deal with the consequences later.
var warholMode = 0;

// Set by /gift, /creative or /speculation. 1 is gift, 2 is creative and 3 is speculative. 
// May or may not be used. We'll see.
var econMode = 0;


// The user starts the bot with the /start command.

bot.on([ START_BUTTON, BACK_BUTTON ], msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );
  
  currentCreativeSelection = [];
  currentGiftSelection = [];

  // Check the warhols database to see if the user already has an account.
  connection.query( 'SELECT * FROM accounts', function( error, rows ){

    for( let i = 0; i < rows.length; i++ ){

      if( rows[i].owner == msg.from.id ){

        // Send them a message welcoming them back.
        return bot.sendMessage( msg.from.id, `Welcome back ${ msg.from.first_name }!`, { markup } );
        
      }
    
    }

    // If we get this far then it means the user does not have an account yet. So we create one for them.

    let newOwner = { owner: msg.from.id, owner_name: msg.from.first_name, balance: 0 };
    
    connection.query('INSERT INTO accounts SET ?', newOwner, function( error, result ){
    
      if( error ) throw error;
    
      // console.log('Last insert ID:', result.insertId);

    });

    return bot.sendMessage( msg.from.id, `Welcome ${ msg.from.first_name }! You're new here, right? That's ok! we created an account for you. Use the commands below to interact with your account.`, { markup } );

  });

});


// Command for testing functions.

bot.on( '/test', msg => {

  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;
    
    var arr = [];

    while( arr.length < 6 ){

        var randomnumber = ( Math.ceil( Math.random() * rows.length ) - 1 );
        if( arr.indexOf( randomnumber ) > -1 ) continue;
        arr[ arr.length ] = randomnumber;

    }

    // console.log(rows[0].description);
    console.log(rows.length);
    console.log(arr);

  });

});


// Check the balance of the current users warhols account.

bot.on( BALANCE_BUTTON, msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );

  GetBalance( msg.from.id, function( error, result ){

    // Check what the balance is... 
    if ( result == 0 ) {
        // If there are no warhols on the account encourage them to get some warhols.
        return bot.sendMessage( msg.from.id, `You currently have ${ result } warhols. Use the /get command to change this situation.`, { markup });
        
    } else {
        // If they have warhols encourage them to spend the warhols.
        return bot.sendMessage( msg.from.id, `You currently have ${ result } warhols. Use the /spend to change this situation.`, { markup });

    }

  });

});


// Get warhols.

bot.on( GET_BUTTON, msg => {

    let markup = bot.keyboard([
      [ GIFT_ECON ],[ CREATIVE_ECON ],[ SPECULATIVE_ECON ]], { resize: true }
    );

    warholMode = 1;

    return bot.sendMessage( msg.from.id, `How do you want to get Warhols?`, { markup });

});


bot.on( SPEND_BUTTON, msg => {

     // Check their account to see if it has any warhols.

    GetBalance( msg.from.id, function( error, balance ){

      if ( balance <= 5 ){

          let markup = bot.keyboard([
            [ GET_BUTTON ]], { resize: true }
          );

          return bot.sendMessage( msg.from.id, `You don’t have enough Warhols in your account. You need at least 5 Warhols and your balance is ${ balance }. You should /get some Warhols first.`);

      } else {

        let markup = bot.keyboard([
          [ GIFT_ECON ],[ CREATIVE_ECON ],[ SPECULATIVE_ECON ]], { resize: true }
        ); 

        warholMode = 2;

        return bot.sendMessage( msg.from.id, `How do you want to spend Warhols?`, { markup });

      }

    });
    
});


// The gift based economy, where everyone sees themselves in the face of the other.

bot.on( CREATIVE_ECON, msg => {

  if ( warholMode == 1 ){

    let markup = bot.keyboard([
      [ BACK_BUTTON ]], { resize: true }
    );

    GetCreativeContent( function( error, content ){
    
    // Display the tasks as text.
    return bot.sendMessage( msg.from.id, `${ content }`, { markup } );
    
    });

  } else if ( warholMode == 2 ){

    GetBalance( msg.from.id, function( error, balance ){

      return bot.sendMessage( msg.from.id, `You can /publish your content for 10 warhols. Your current balance is ${ balance } warhols`, { markup: 'hide' } );

      // Function for reading url and descriptive text from the user and sending it to the database.

    });

  }

});


// The following three bot.on commands deal with a user spending warhols by submitting content.

bot.on( PUBLISH_BUTTON , msg => {

  // Need a way to prevent the publish command from being invoked or set warhol mode in case people want to short cut to publish without
  // stepping through all of the other menus.

  return bot.sendMessage( msg.from.id, `Enter the URL for the content.`, { ask: 'url' });

});



bot.on('ask.url', msg => {
  
  let content = msg.text;

  if ( isUrl( content ) == true ){ // Check if the url is a valid one.

        contentSubmission[0] = content; // save the url for review by the user.
        return bot.sendMessage( msg.from.id, `Now enter a 140 character description of the content.`, { ask: 'whatisit' });

    } else {

        return bot.sendMessage( msg.from.id, `You have not entered a valid web address. Please try again using the proper formatting.`, { ask: 'url'});

    }

});



bot.on('ask.whatisit', msg => {
  
  let incomingText = msg.text;

  if ( incomingText.length > DESCRIPTION_MAX_LENGTH ) {

    return bot.sendMessage( msg.from.id, `Your description is longer than 140 charcters. Please shorten it.`, { ask: 'whatisit' });

  } else if ( incomingText.length <= DESCRIPTION_MAX_LENGTH ) {

    contentSubmission[1] = incomingText;

    return bot.sendMessage( msg.from.id, `${ contentSubmission[1] } ${ contentSubmission[0] } \n Please review your submission! \n \n 
    Is the content correct? \n
    /yes or /no` );

  }

});


// The creative economy content, where everyone makes stuff but nobody keeps money.

bot.on( GIFT_ECON, msg => {

    let markup = bot.keyboard([
      [ BACK_BUTTON ]], { resize: true }
    );

    GetGiftsContent( function( error, content ){

      return bot.sendMessage( msg.from.id, `${ content }`, { markup } );

    });

});
  

// The speculative economy, where everyone loses their shirt except for the socipaths.

bot.on( SPECULATIVE_ECON, msg => {

  let markup = bot.keyboard([
    [ BACK_BUTTON ]], { resize: true }
  );

  return bot.sendMessage( msg.from.id, `This economy has not been developed... yet. Please commen zee backen später.`, { markup });
  
});



// Checks if a user has selected content from a provided random list. 
// '/*' listens for any activity entered by the user and then filters out the resulting strings of
// text to see if the second character is a number between 1 and 5.


bot.on( '/*' , msg => {
  
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );

  // They selected creative economy.
  if ( currentCreativeSelection.length == 5 ) {

    // Read the creative table so we can extract the content associated with
    // the content description chosen by the user.
    connection.query('SELECT * FROM tasks', function( error, rows ){

      if ( error ) throw error;

      // Copy the text from the user.
      let readText = msg.text; 

      // Setup containers for reading entries from the selected content as well as updating the users warhols balance.
      let taskNumber;
        
      // Var because it needs to be used within the GetBalance function for a callback.  
      var warholValue;
      var newBalance;
      var taskURL;
        
      let contentSelector;
        
      // Read from the second character in the message string.
      let ReadTaskNumber = readText.slice( 1, 2 );

      // Make sure that what the text is only a number.
      taskNumber = Number( ReadTaskNumber );

      // Make sure that the number they have entered is either 1 or 5. If not, just act dumb and don't do anything.
      if ( taskNumber >= 1 && taskNumber <= 5 ) {
        
        // Retrieve the corresponding item number from the random selection made when the user selected the /creative option.
        // We use minus 1 to offset the reading of the array.
        contentSelector = currentCreativeSelection[ ( taskNumber - 1 ) ];

        taskURL = rows[ contentSelector ].url; // Content address.
        warholValue = rows[ contentSelector ].price; // Content price, as in how many warhols are earned by watching this media.

        // Reset the random list to nothing so that if someone decides to use a command with a number nothing will happen.
        currentCreativeSelection = [];

        GetBalance( msg.from.id, function(error, result){ // Function talks to database and requires a callback.
          
          newBalance = ( warholValue + result );

          AddWarhols( msg.from.id, newBalance ); // Function talks to database but does not require a callback.

            return bot.sendMessage( msg.from.id, `You now have more warhols. Enjoy! The link for the content is ${ taskURL }`, { markup });

        });

      }

    });

  }
  
  // They selected 'gift' economy.
  
  if ( currentGiftSelection.length == 5 ) {

    connection.query('SELECT * FROM gifts', function( error, rows ){

    if ( error ) throw error;

    // Copy the text from the user.
    let readText = msg.text; 

    // Setup containers for reading entries from the selected task as well as updating the users warhols balance.
    var giftNumber;
    var giftDescription;
    var contentSelector;
    var warholValue; // The Warhol value of the gift as determined by random.
    var newBalance; // The new balance that will result.
      
    // Read from the second character in the message string.
    let ReadGiftNumber = readText.slice( 1, 2 );

    // Make sure that the text is only a number.
    giftNumber = Number( ReadGiftNumber );
    
    // Make sure that the number they have entered is either 1 or 5. If not, just act dumb and don't do anything.
    if ( giftNumber >= 1 && giftNumber <= 5 ) {

        // Retrieve the corresponding item number from the random selection made when the user selected the /creative option.
        // We use minus 1 to offset the reading of the array.
        contentSelector = currentGiftSelection[ ( giftNumber - 1 ) ];
        giftDescription = rows[ contentSelector ].description;
          
      // Need to add an extra step to prompt the user with a 'yes' or 'no' answer if they will commit to the gift.

        currentGiftSelection = [];

        return bot.sendMessage( msg.from.id, `Will you ${ giftDescription }? \n /yes or /no ?`, { markup });
          
      }

    });
    
  }

});



// These two are only relevant for the end routine of a user who has chosen to earn a warhol through the gift economy.
// I could do an overall better implementation of this but for now I am just trying to get this project done. I am sure you understand how deadlines work.

bot.on( '/yes', msg => {

    if ( warholMode == 1 ){ // Verify that they are in gift mode.

      let markup = bot.keyboard([
        [ BACK_BUTTON ]], { resize: true }
      );

      var warholValue;
      var newBalance;

      warholValue = (Math.ceil( Math.random() * RAND_GIFT_RANGE ) -1 );          

      GetBalance( msg.from.id, function( error, result ){

          newBalance = ( warholValue + result );
          
          AddWarhols( msg.from.id, newBalance );
            
      });

      warholMode = 0;

      return bot.sendMessage( msg.from.id, `Enjoy! Your account has benn credited with ${ warholValue } Warhols`, { markup });

    } else if ( warholMode == 2 ){
      
      let markup = bot.keyboard([
        [ BACK_BUTTON ]], { resize: true }
      );

      warholMode = 0;

      // Add the submitted content to the database.
      AddCreativeContent( msg.from.id, msg.from.first_name, contentSubmission );

      // Subtract warhols from the account of the user.
      SubtractWarhols( msg.from.id, 10 );

      contentSubmission = [];

      return bot.sendMessage( msg.from.id, `Excellent! Your content is now available for viewing and 10 warhols have been subtracted from your account.`, { markup });

    } 

});

bot.on( '/no', msg => {

  if ( warholMode == 1 ){

    let markup = bot.keyboard([
      [ BACK_BUTTON ],[ GET_BUTTON ]], { resize: true }
    );

    return bot.sendMessage( msg.from.id, `Perhaps there is another good deed you are willing to perform isntead? \n Use use /get to find another or go /back to the main menu.`, { markup } );

  } else if ( warholMode == 2 ){

    return bot.sendMessage( msg.from.id, `Enter the URL for the content.` , { ask: 'url'});

  }

});



/* * * FUNCTIONS * * */

// Adds warhols to a user account

function AddWarhols( userID, addedBalance ){
    
    connection.query( 'UPDATE accounts SET balance = ? WHERE owner = ?', [ addedBalance, userID ], function( error, current ){
                
    if ( error ) throw error;

  });

}


// Subtracts warhols from a users account

function SubtractWarhols( userID, subtractedBalance ){

    GetBalance( userID, function( error, result ){ // Get the current balance on the account of the user.

      let newBalance = ( result - subtractedBalance );

      connection.query( 'UPDATE accounts SET balance = ? WHERE owner =?', [ newBalance, userID ], function( error, current ){

      if ( error ) throw error;

      // console.log('Changed ' + current.changedRows + ' rows');

    });

  });

}



// Gets the current balance of a user account

function GetBalance( msgID, callback ){

    connection.query('SELECT balance FROM accounts WHERE owner =' + msgID , function( error, result ){
      
        if ( error ) return error;

        return callback( error, result[0].balance );
        
    });

}


// Selects five random from the creative contet for the user to choose from.

function GetCreativeContent( callback ){

  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;

    let taskListDisplay = 'Here is some awesome content created by the Warhols users. Choose one to view to get a reward of 2 Warhols: \n \n';
    let contentSelector;
    let actualTaskID;

    // Randomly select 5 items from the table.
    while( currentCreativeSelection.length < MAX_LIST_DISPLAY ){
        // Set up the numbers usig minus 1 so that the numbers will read the list properly.
        let randNum = (Math.ceil( Math.random() * rows.length ) -1 );

        if( currentCreativeSelection.indexOf( randNum ) > -1 ) continue;

        currentCreativeSelection[ currentCreativeSelection.length ] = randNum;

    }

    // Prepare all of the tasks for display.
    // Keep track of which items were selected inside currentCreativeSelection as an array.

    for ( let i = 0; i < ( currentCreativeSelection.length ) ; i++) {
        
        taskListDisplay += '/' + ( i + 1 ) + ' ';
        contentSelector = currentCreativeSelection[i];
        actualTaskID = rows[ contentSelector ].task_id;
        taskListDisplay += rows[ contentSelector ].description;
        taskListDisplay += '\n \n';
        
    } 

    return callback( error, taskListDisplay );

  });

}


// Selects five random items from the gifts for users to choose from.

function GetGiftsContent( callback ){

  connection.query('SELECT * FROM gifts', function( error, rows ){

      if ( error ) throw error;

      let giftListDisplay = 'Perform an act of kindness to pay forward for your Warhols. You will get rewarded a random amount by the gods of gratitude. \n \n';
      let giftSelector;
      let actualGiftID;

    // Randomly select 5 items from the table.
      while( currentGiftSelection.length < MAX_LIST_DISPLAY ){
        // Set up the numbers usig minus 1 so that the numbers will read the list properly.
        let randNum = ( Math.ceil( Math.random() * rows.length ) -1 );

        if( currentGiftSelection.indexOf( randNum ) > -1 ) continue;

        currentGiftSelection[ currentGiftSelection.length ] = randNum;

      }

    // Prepare all of the tasks for display.
    // Keep track of which items were selected inside currentCreativeSelection as an array.

    for ( let i = 0; i < ( currentGiftSelection.length ) ; i++ ) {
        
        giftListDisplay += '/' + ( i + 1 ) + ' ';
        giftSelector = currentGiftSelection[i];
        actualGiftID = rows[ giftSelector ].task_id;
        giftListDisplay += rows[ giftSelector ].description;
        giftListDisplay += '\n \n';
        
    }

    return callback ( error, giftListDisplay );

  });

}

/*

let newOwner = { owner: msg.from.id, owner_name: msg.from.first_name, balance: 0 };
    
connection.query('INSERT INTO accounts SET ?', newOwner, function( error, result ){
    
if( error ) throw error;

*/

function AddCreativeContent( userID, userName, newContent ){
  
  let loadContent = { owner: userID, owner_name: userName, description: newContent[1] , url: newContent[0], price: 2 };

  connection.query('INSERT into tasks SET ?', loadContent, function( error, result ){

    if( error ) throw error;

  });

}


bot.connect();