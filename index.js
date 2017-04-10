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


// Module for verifying and validating a web address

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

const GIFT_FOUNTAIN = "/fountain";
const GIFT_RANDOM = "/random";

const MIN_DISTRO = 2; // The minimum amount of warhols required per amount of users for an even distrobution of warhols from the fountain.
const MAX_GIFT = 1; // The maximum bonus amount of warhols included in the distrobution from the fountain.

const YES_BUTTON = "/yes";
const NO_BUTTON = "/no";

const MAX_LIST_DISPLAY = 5; // Maximum number of items to be displayed for the user to choose from whenever they are presented with multiple choice selections.
const RAND_GIFT_RANGE = 10; // Range setting for randomly giving out Warhols.
const MAX_COUPON = 10;

const DESCRIPTION_MAX_LENGTH = 140; // How long a description of content is allowed to be.


// Holds the random selection of five items to be selected from by the user. The list is changed every time the user selects the 'creative' option when selecting 'get'
// It also serves to filter out any numbered commands (i.e. /4, /21, etc.)

var currentCreativeSelection = []; 
var currentGiftSelection = [];


// Holds two items submitted by a user in spend/creative mode: 
// - url for the content.
// - description of the content.
// Is reset after every use. 

var contentSubmission = [];


// Set by /get, /spend. 
// 1 is get.
// 2 is spend.
// This allows me to use the same command set of '/gift', '/creative' and '/speculative' twice by simply checking the mode whenever these commands are called. Probably not the best approach but it was the first solution I came up with so I decided to run with it and deal with the consequences later.

var warholMode = 0;


// Is set by /random, /fountain or /user
// 1 is random
// 2 is fountain
// 3 is user
// Will be verified in the huge block that checks for all commands followed by a number ( i.e. /* ). I guess I could have used warholMode by specifying additional values, but it seemed too risky. Rather keep my sanity if there is a problem as we careen towards the deadline for this project.

var giftSpendMode = 0;


// The user starts the bot with the /start command.

bot.on([ START_BUTTON, BACK_BUTTON ], msg => {
  
  warholMode = 0;
  giftSpendMode = 0;

  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );
  
  currentCreativeSelection = [];
  currentGiftSelection = [];

  // Check the Warhols database to see if the user already has an account.
  connection.query( 'SELECT * FROM accounts', function( error, rows ){

    if( error ) throw error;

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



});



bot.on( '/help', msg => {

  return bot.sendMessage( msg.from.id, `A list of common commands available to use for interacting with warhols bot. \n 
  /start - Starts the warholsbot. \n
  /back - Returns you to the start menu from anywhere. \n
  /spend - Starts the process of spending warhols and can be used anywhere. \n
  /balance - Check how many warhols you have. Can be accessed anywhere. \n \n
  You may see other commands as you step through the procedures provided by each of the above commands. These commands are process specific and will not work out of context.
  `);

});


// Check the balance of the current users Warhols account.

bot.on( BALANCE_BUTTON, msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );

  GetBalance( msg.from.id, function( error, result ){

    // Check what the balance is... 
    if ( result == 0 ) {
        // If there are no Warhols on the account encourage them to get some Warhols.
        return bot.sendMessage( msg.from.id, `You currently have ${ result } Warhols. Use the /get command to change this situation.`, { markup });
        
    } else {
        // If they have Warhols encourage them to spend the Warhols.
        return bot.sendMessage( msg.from.id, `You currently have ${ result } Warhols. Use the /spend to change this situation.`, { markup });

    }

  });

});


// Get warhols.

bot.on( GET_BUTTON, msg => {

    let markup = bot.keyboard([
      [ GIFT_ECON ],[ CREATIVE_ECON ],[ SPECULATIVE_ECON ]], { resize: true }
    );

    warholMode = 1; // Entering get mode.

    return bot.sendMessage( msg.from.id, `How do you want to get Warhols?`, { markup });

});


bot.on( SPEND_BUTTON, msg => {

     // Check their account to see if it has any Warhols.

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

        warholMode = 2; // Entering spend mode.

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

      return bot.sendMessage( msg.from.id, `You can /publish your content for 10 Warhols. Your current balance is ${ balance } Warhols`, { markup: 'hide' } );

      // Function for reading url and descriptive text from the user and sending it to the database.

    });

  }

});


// The following three bot.on commands deal with a user spending Warhols by submitting content.

bot.on( PUBLISH_BUTTON , msg => {

  // Need a way to prevent the publish command from being invoked or set warhol mode in case people want to short cut to publish without
  // stepping through all of the other menus.

  return bot.sendMessage( msg.from.id, `Enter the URL for the content.`, { ask: 'url' });

});



bot.on('/coupon', msg => {

  return bot.sendMessage( msg.from.id, `Please enter code exactly as it appears on the coupon.`, { ask: 'coupon' });

});


bot.on('ask.coupon', msg => {

  let couponCode = msg.text;

  connection.query( 'SELECT * FROM coupons', function( error, uniqueCode ){

    if( error ) throw error;

      for( let i = 0; i < uniqueCode.length; i++ ){
        
        // Check if the user has previously submitted a code.
        if ( uniqueCode[i].owner == msg.from.id ){

            let markup = bot.keyboard([
              [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
            );

            return bot.sendMessage( msg.from.id, `You have already used a coupon code. Maybe /get some warhols?`, { markup });

        } else {

          // Check if the submitted code matches a code in the database.
          if ( couponCode == uniqueCode[i].unique ){

          // Verify if the code has been used already.
            if ( uniqueCode[i].used == 1 ){

              return bot.sendMessage( msg.from.id, `This coupon has already been used. Please enter a different code if you have one.`, { ask: 'coupon' });

            } else {

              // If the code is unused mark it as used.
              connection.query( 'UPDATE coupons SET used = ? WHERE id = ?', [ 1, uniqueCode[i].id ], function( error, selectedCoupon ){

                if( error ) throw error;

              });
              // Record the Telegram user id of the person who used the code.
              connection.query( 'UPDATE coupons SET owner = ? WHERE id = ?', [ msg.from.id , uniqueCode[i].id ], function( error, claiment ){

                if( error ) throw error;

              });
                
              // Give the user their warhols.
              GetBalance( members[i].owner, function( error, currentBalance ){

                let newBalance = ( MAX_COUPON + currentBalance );

                AddWarhols( msg.from.id, newBalance );

              });

              let markup = bot.keyboard([
                [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
              );

              return bot.sendMessage( msg.from.id, `Congradulations! You now have 10 Warhols on your account.`, { markup });

            }

          }

        }
  
      }

    return bot.sendMessage( msg.from.id, `Perhaps you entered the code incorrectly? Please try again.`, { ask: 'coupon' });

  });

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

    if ( warholMode == 1 ){ // If we are in get mode...

      let markup = bot.keyboard([
        [ BACK_BUTTON ]], { resize: true }
      );

      GetGiftsContent( function( error, content ){

        return bot.sendMessage( msg.from.id, `${ content }`, { markup } );

      });

    } else if ( warholMode == 2 ) { // If we are in spend mode...

      let markup = bot.keyboard([
        [ GIFT_RANDOM ], [ GIFT_FOUNTAIN ] ], { resize: true }
      );

      return bot.sendMessage( msg.from.id, `Give Warhols to everybody with the Warhols /fountain\nGive Warhols to a person at /random`, { markup });

    }

});

  

bot.on( [ GIFT_RANDOM, GIFT_FOUNTAIN ], msg => {

  // Ask the user how many Warhols they want to spend.
  
  if ( warholMode == 2 ) {

    if ( msg.text == '/random' ) {

      giftSpendMode = 1;

    } else if ( msg.text == '/fountain' ) {

      giftSpendMode = 2;

    }

    return bot.sendMessage( msg.from.id, `How many Warhols do you want to spend? \n /5 \n /10 \n /20`);

  }

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

      // Setup containers for reading entries from the selected content as well as updating the users Warhols balance.
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
        warholValue = rows[ contentSelector ].price; // Content price, as in how many Warhols are earned by watching this media.

        // Reset the random list to nothing so that if someone decides to use a command with a number nothing will happen.
        currentCreativeSelection = [];

        GetBalance( msg.from.id, function(error, result){ // Function talks to database and requires a callback.
          
          newBalance = ( warholValue + result );

          AddWarhols( msg.from.id, newBalance ); // Function talks to database but does not require a callback.

            return bot.sendMessage( msg.from.id, `You now have more Warhols. Enjoy! The link for the content is ${ taskURL }`, { markup });

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

    // Setup containers for reading entries from the selected task as well as updating the users Warhols balance.
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

  if ( warholMode == 2 ) { // Make sure we are in spend mode.
    
    // Read from the second character in the message string.
    let readText = msg.text;
    let amountSelection = readText.slice( 1, 2 );

    // Make sure that what the text is only a number.
    let warholAmount = Number( amountSelection );

    // SubtractWarhols( msg.from.id, warholAmount ); // We can already subtract from the user account... why not?
    
    if ( giftSpendMode == 1 ){ // They have chosen to give to a random person.

      connection.query( 'SELECT * FROM accounts', function( error, users ){

        if( error ) throw error;
        
        // Choose one user at random.

        // But first we have to make sure that the current user is not
        // accidentally giving themselves Warhols.

        let theOthers = [];

        for( let i = 0; i < users.length; i++ ){

          if ( users[i].owner != msg.from.id ){

            theOthers.push(users[i].owner);

          }

        }

        var randomUser = ( Math.ceil( Math.random() * theOthers.length ) - 1 );

        GetBalance( users[ randomUser ].owner, function( error, theirBalance ){
          
          // console.log(users[randomUser].owner_name);
          // console.log(theirBalance);

          let theirNewBalance = ( theirBalance + warholAmount );

          // console.log(theirNewBalance);

          AddWarhols( users[ randomUser ].owner, theirNewBalance );

          SubtractWarhols( msg.from.id, warholAmount );

        });        

        warholMode = 0;
        giftSpendMode = 0;
        
        return bot.sendMessage( msg.from.id, `Thank you for your gift! Your Warhols have been anonymously sent to a random person.`, { markup });

      });


    } else if ( giftSpendMode == 2 ) { // They have chosen to give to the fountain.

      

      // Get the current balance of the fountain.
      // Add the Warhols contributed.
      // Check if the fountain is full yet.
      // If the fountain is overflowing notify the user?

      let newReservoirBalance;

      GetFountainBalance( function( error, fountainBalance ){

        newReservoirBalance = ( fountainBalance + warholAmount );
      
        AddToFountain( newReservoirBalance );

        SubtractWarhols( msg.from.id, warholAmount );

        connection.query( 'SELECT * FROM accounts', function( error, howmanyusers ){

          if( error ) throw error;

          if ( newReservoirBalance >= ( ( MIN_DISTRO * howmanyusers.length ) + MAX_GIFT ) ){

            ShareTheWealth( newReservoirBalance );
            
          }

        });
        
        return bot.sendMessage( msg.from.id, `Thanks for your gift! The Warhols will go to the fountain reservoir and will overflow into everybody’s account soon.`, { markup });

      });
      
    }      

  }

});



// These two are only relevant for the end routine of a user who has chosen to earn Warhols through the gift economy.
// I could do an overall better implementation of this but for now I am just trying to get this project done. I am sure you understand how deadlines work.

bot.on( YES_BUTTON, msg => {

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

      // Subtract Warhols from the account of the user.
      SubtractWarhols( msg.from.id, 10 );

      contentSubmission = [];

      return bot.sendMessage( msg.from.id, `Excellent! Your content is now available for viewing and 10 Warhols have been subtracted from your account.`, { markup });

    } 

});

bot.on( NO_BUTTON, msg => {

  if ( warholMode == 1 ){

    let markup = bot.keyboard([
      [ BACK_BUTTON ],[ GET_BUTTON ]], { resize: true }
    );

    return bot.sendMessage( msg.from.id, `Perhaps there is another good deed you are willing to perform isntead? \n Use use /get to find another or go /back to the main menu.`, { markup } );

  } else if ( warholMode == 2 ){

    return bot.sendMessage( msg.from.id, `Enter the URL for the content.` , { ask: 'url'});

  }

});

// Last Interaction test command

bot.on('/last', msg => {
  // Update database date_last column with current date timestamp.
      LastDate( msg.from.id);
});


/* * * FUNCTIONS * * */

// Adds Warhols to a user account

function AddWarhols( userID, addedBalance ){
    
    connection.query( 'UPDATE accounts SET balance = ? WHERE owner = ?', [ addedBalance, userID ], function( error, current ){
                
    if ( error ) throw error;

  });

}


// Subtracts Warhols from a users account. Need to re-write function so that it does not call GetBalance within it.
// Have it just receive the value it needs to send to the database.

function SubtractWarhols( userID, subtractionAmount ){

    GetBalance( userID, function( error, result ){ // Get the current balance on the account of the user.

      let newBalance = ( result - subtractionAmount );

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


function GetFountainBalance( callback ){

  connection.query('SELECT reservoir FROM fountain WHERE id =' + 1, function( error, result ){

        if ( error ) return error;

        return callback( error, result[0].reservoir );
        
    });

}



function AddToFountain( contribution ){

  connection.query('UPDATE fountain SET reservoir = ? WHERE id =?', [ contribution, 1 ], function( error, current ){

    if ( error ) throw error;

  });

}



function SubtractFromFountain( amount, members, currentBalance ){

  let resetBalance = ( amount * members );

  resetBalance = ( resetBalance - currentBalance );

  connection.query('UPDATE fountain SET reservoir = ? WHERE id =?', [ resetBalance, 1 ], function( error, current ){

    if ( error ) throw error;

  });

}



function ShareTheWealth( newReservoirBalance ){

  // How many user accounts
  // Divide the pooled warhols by the amount of accounts
  // Update all of the warhol balances on all of the accounts
  console.log('The fountain has been activated!');

  connection.query( 'SELECT * FROM accounts', function( error, members ){

    if( error ) throw error;

    let distroAmount =  Math.round( ( newReservoirBalance / members.length ) );

    console.log( distroAmount );

    for (let i = 0; i < members.length; i++ ){

      GetBalance( members[i].owner, function( error, currentBalance ){

        let newBalance = ( distroAmount + currentBalance );

        AddWarhols( members[i].owner, newBalance );

      });

    }

    SubtractFromFountain( distroAmount, members.length, newReservoirBalance );

  });

}



// Selects five random entries from the creative content for the user to choose from.

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


// Adds creative content submitted by the user.
function AddCreativeContent( userID, userName, newContent ){
  
  let loadContent = { owner: userID, owner_name: userName, description: newContent[1] , url: newContent[0], price: 2 };

  connection.query('INSERT into tasks SET ?', loadContent, function( error, result ){

    if( error ) throw error;

  });

}

// Update last interaction date

function LastDate( userID ){
    
    var currentDate = new Date();

    connection.query( 'UPDATE accounts SET date_last = ? WHERE owner = ?', [ currentDate, userID ], function( error, current ){
                
    if ( error ) throw error;


  });

}


bot.connect();
