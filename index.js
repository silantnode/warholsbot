'use strict';

// Read an external file where values await.
var fs = require('fs');
var custom_data = fs.readFileSync('data.txt').toString().split("\n");

// HTTP request tool used for POST to WarholsChannel
var requestify = require('requestify'); 

// Create the connection to the database.
const mysql = require('mysql');

const connection = mysql.createConnection({
  host     : custom_data[1], // Host address of the database server.
  user     : custom_data[2], // Username for the coinspiration account.
  password : custom_data[3], // Password for the coinspiration account.
  database : custom_data[4]  // Name of the database we are accessing.

});

connection.connect( function (error){
  
  if( error ) throw error;

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
const SPECULATIVE_ECON = "/speculation";
const PUBLISH_BUTTON = "/publish";

const GIFT_FOUNTAIN = "/fountain";
const GIFT_RANDOM = "/random";

const SPEC_MARKET = "/market";
const SPEC_RANKING = "/ranking";

const SPEC_FLAVOR_1 = "/blue";
const SPEC_FLAVOR_2 = "/green";
const SPEC_FLAVOR_3 = "/orange";
const SPEC_FLAVOR_4 = "/purple";

const MIN_DISTRO = 2; // The minimum amount of warhols required per amount of users for an even distrobution of warhols from the fountain.
const GIFT_MULTIPLYER = 2; // The maximum bonus amount of warhols included in the distrobution from the fountain.

const YES_BUTTON = "/yes";
const NO_BUTTON = "/no";

const MAX_LIST_DISPLAY = 5; // Maximum number of items to be displayed for the user to choose from whenever they are presented with multiple choice selections.
const RAND_GIFT_RANGE = 10; // Range setting for randomly giving out Warhols.
const MAX_COUPON = 10; // The amount one receives if they have a coupon

const DESCRIPTION_MAX_LENGTH = 140; // How long a description of content is allowed to be.

// Identify the event for which the Warhols will be used - this will provide a subset of market closing dates to work with

 var eventName = 'test';

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

// Set by /market selection of Warhols flavor 
// 1, 2, 3 etc correspond to the flavor color chosen

var marketFlavor = 0;

// Holds time of market bets

var betDate = 0;

// Holds id of next market closure for a bet

var marketClosureId = 0;

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

  return bot.sendMessage( msg.from.id, `A list of common commands available to use for interacting with warhols bot.\n 
  /start - Starts the warholsbot.\n
  /back - Returns you to the start menu from anywhere.\n
  /spend - Starts the process of spending warhols and can be used anywhere.\n
  /balance - Check how many warhols you have. Can be accessed anywhere.\n\n
  You may see other commands as you step through the procedures provided by each of the above commands. These commands are process specific and will not work out of context.
  `);

});


// Check the balance of the current users Warhols account.

bot.on( BALANCE_BUTTON, msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );

// check if the fountain has been activated and if so display message (compare last activity with last fountain date)
// check if market has closed (compare last activity with current date, check market closure inbetween)
 newMarketActivity( msg.from.id, function( error, callback ){
 console.log(callback);
});


// if market closures happened, see if any bets were won. Display message of sorry or congratulation

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

      if ( balance < 5 ){

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


// The creative economy content, where everyone makes stuff but nobody keeps money.

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


// The gift based economy, where everyone sees themselves in the face of the other.

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

    [ SPEC_MARKET ],[ SPEC_RANKING ],[ BACK_BUTTON ]], { resize: true }

  );

  return bot.sendMessage( msg.from.id, `Are you ready to take some risks and maybe get some rewards?. How would you like to invest your Warhols: \n /market exchange of flavors \n /ranking of cultural appreciation`, { markup } );
  
});

// If the user chooses the Market of flavors

bot.on( SPEC_MARKET , msg => {

betDate = new Date(); // this will be the time of their bet if they place one
console.log('betDate - ', betDate);
  // to do: check if user has enough balance, if not ask to choose other value


    let markup = bot.keyboard([
      [SPEC_FLAVOR_1],[SPEC_FLAVOR_2],[SPEC_FLAVOR_3],[ BACK_BUTTON ]], { resize: true }
    );

      // new connection to retrieve next market closure dates
      connection.query('SELECT close_time, id FROM market WHERE event = ?', [eventName], function (error, results, fields) {
        if (error) throw error;

      var currentDate = new Date();
      var i = 0;
      for (i = 0; i < results.length; i++) {
          marketClosureId = results[i].id;
          console.log('marketClosureId - ', marketClosureId);
        var dateDifference = (results[i].close_time-currentDate);
        var timetoClosing = timeConversion(dateDifference);
             if (dateDifference > 600000) { break; } // choose the first date at least 10 minutes in the future
       
      }
          return bot.sendMessage( msg.from.id, `The Warhols exchange market will close in ` + timetoClosing + `. In which flavor would you like to invest? \n `+ SPEC_FLAVOR_1 +` Warhols \n `+ SPEC_FLAVOR_2 +` Warhols \n `+ SPEC_FLAVOR_3 +` Warhols`, { markup } );
        });

    
      // end retrieving market closure dates

 });


// assign marketFlavor variable according to the choice of flavor by the user

bot.on( [ SPEC_FLAVOR_1, SPEC_FLAVOR_2, SPEC_FLAVOR_3 ], msg => {  

  if ( msg.text == SPEC_FLAVOR_1 ) {

  marketFlavor = 1; 
  console.log(marketFlavor);
  } else if ( msg.text == SPEC_FLAVOR_2 ) {

  marketFlavor = 2; 
  console.log(marketFlavor);
  } else if ( msg.text == SPEC_FLAVOR_3 ) {

  marketFlavor = 3; 
  console.log(marketFlavor);
  }

    var flavorName = msg.text.substr(1);
      return bot.sendMessage( msg.from.id, `How many shares of ` + flavorName + ` Warhols you want to buy? \n /five \n /ten \n /20 \n /50 \n /100`);

  });



// Market investment 

bot.on( '/five', msg => {  // amount chosen to invest

    var betAmount = 5;
// check if user has enough balance, if not ask to choose other value

  GetBalance( msg.from.id, function( error, result ){

    // Check what the balance is... 
    if ( result < betAmount ) {
        return bot.sendMessage( msg.from.id, `You currently have only ${ result } Warhols. Please start with a lower investment.`, { markup: 'hide' });
        
    } else {   // Continue with the investment.
        
     console.log('they have enough Warhols - ', result);
// write to market bets database: user id, user name, flavor, amount, time bet placed

    var currentDate = new Date();
      if (typeof msg.from.last_name != "undefined") // if the user does not have a last name
         {  var betOwner = (msg.from.first_name +' '+ msg.from.last_name);
         }
         else  {  var betOwner = (msg.from.first_name);
         }
    let newBet = { time: betDate, market_id: marketClosureId, user: msg.from.id, name: betOwner, flavor: marketFlavor, amount: betAmount, credited: 0 };
    connection.query('INSERT INTO market_bets SET ?', newBet, function( error, result ){
    
      if( error ) throw error;
    
     console.log('New bet from:', betOwner);

    });
// deduct warhols from users account

  SubtractWarhols( msg.from.id, betAmount );
  setLastDate( msg.from.id ); // set last interaction date

// send message with thanks, display home menu
   let markup = bot.keyboard([
       [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
   );
   return bot.sendMessage( msg.from.id, `Thanks for your investment! You will get a notification when the market closes. Good luck!`, { markup } );


      } // end if balance enough

  });
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

    // Copy the text from the user.
    let readText = msg.text; 

    // Setup containers for reading entries from the selected content as well as updating the users Warhols balance.
    let taskNumber;

    // Read from the second character in the message string.
    let ReadTaskNumber = readText.slice( 1, 2 );

    // Make sure that what the text is only a number.
    taskNumber = Number( ReadTaskNumber );

    DisplayCreativeContent( msg.from.id, taskNumber, markup );

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
    let warholAmount = readText.slice( 1, 3 );
    
    // Check if the amount they have selected does not exceed the amount available in their account.
    GetBalance( msg.from.id, function( error, userBalance ){

      if ( userBalance < warholAmount ){

        return bot.sendMessage( msg.from.id, `You do not have enough warhols. Please choose a smaller amount or /get more warhols.`);

      } else if ( userBalance >= warholAmount ){

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

          ShareTheWealth( msg.from.id, warholAmount );

        }

      }

    });

  }

  if ( marketFlavor != 0 ) {

    console.log('Lets now listen for speculation market activity.');

    let readText = msg.text;
    let warholAmount = readText.slice( 1, 4 );

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

      return bot.sendMessage( msg.from.id, `Enjoy! Your account has been credited with ${ warholValue } Warhols`, { markup });

    } else if ( warholMode == 2 ){ // Verify that they are in spend mode.
      
      let markup = bot.keyboard([
        [ BACK_BUTTON ]], { resize: true }
      );

      warholMode = 0;

      // Add the submitted content to the database.
      AddCreativeContent( msg.from.id, msg.from.first_name, contentSubmission );

      // Subtract Warhols from the account of the user.
      SubtractWarhols( msg.from.id, 10 );

      // Post to WarholsChannel New Content
         if (typeof msg.from.last_name != "undefined") // if the user does not have a last name
         {  var contentName = (msg.from.first_name+' '+ msg.from.last_name);
         }
         else  {  var contentName = (msg.from.first_name );
         }

         if (typeof msg.from.username != "undefined") // if the user does not have a username
         {  var contentUser = (' - @' + msg.from.username);
         }
         else  {  var contentUser = (' ');
         }
      requestify.post('https://maker.ifttt.com/trigger/new_content/with/key/' + custom_data[5] , { // IFTTT secret key.
        value1: ( contentName + contentUser ) , // telegram user.
        value2: contentSubmission[1] , // content title.
        value3: contentSubmission[0] // content URL.
      })
      .then(function(response) {
        // Get the response and write to console
        response.body;
        console.log('IFTTT: ' + response.body);

      }); // End of WarholsChannel content posting routine.

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
      setLastDate( msg.from.id );
});

// Date comparison test command

bot.on('/date', msg => {
  // Compare current date and /last date.

  
      DateCompare ( msg.from.id );
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



function ShareTheWealth( userID, fountainContribution ){

  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );

  GetFountainBalance( function( error, fountainBalance ){
    
    // Add the new contribution of warhols to the current reservoir balance including the multiplier. 
    let newReservoirBalance = ( fountainBalance + ( fountainContribution * GIFT_MULTIPLYER ) ) ;

    // Send the newly calculated value to the reservoir.
    AddToFountain( newReservoirBalance );

    // Subtract the contribution of the warhols from the user account.
    SubtractWarhols( userID, fountainContribution );

    // Find out how many warhols users there are.
    connection.query( 'SELECT * FROM accounts', function( error, howmanyusers ){

      if( error ) throw error;

      // Check if the reservoir is full enough for a distrobution of warhols to all the users.
      if ( newReservoirBalance >= ( ( MIN_DISTRO * howmanyusers.length ) ) ){

        connection.query( 'SELECT * FROM accounts', function( error, members ){

          if( error ) throw error;

          // Round down the number resulting from dividing the new reservoir balance with the number of warhols users.
          let distroAmount =  Math.floor( ( newReservoirBalance / members.length ) ); 

          // Distribute the awarded warhols to all the users.
          for (let i = 0; i < members.length; i++ ){

            GetBalance( members[i].owner, function( error, currentBalance ){

              let newBalance = ( distroAmount + currentBalance );

              AddWarhols( members[i].owner, newBalance );

              newBalance = 0;

            });

          }

          SubtractFromFountain( distroAmount, members.length, newReservoirBalance );

          warholMode = 0;
          giftSpendMode = 0;

          return bot.sendMessage( userID, `Thanks for your gift! The Warhols will go to the fountain reservoir and will overflow into everybody’s account soon.`, { markup });

        });
        
      }

    });

  });

}


function SubtractFromFountain( amount, members, currentBalance ){

  // Multiply the amount of members with the amount each member received.
  let resetBalance = ( amount * members );

  // Subtract the total amount awarded from the reservoir account.
  resetBalance = ( currentBalance - resetBalance );

  // Update the reservoir.
  connection.query('UPDATE fountain SET reservoir = ? WHERE id =?', [ resetBalance, 1 ], function( error, current ){

    if ( error ) throw error;

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


function DisplayCreativeContent( userID, taskNumber, markup ){

  // Read the creative table so we can extract the content associated with
    // the content description chosen by the user.
    connection.query('SELECT * FROM tasks', function( error, rows ){

      if ( error ) throw error;
        
      // Var because it needs to be used within the GetBalance function for a callback.  
      var warholValue;
      var newBalance;
      var taskURL;
        
      let contentSelector;
      
      // Make sure that the number they have entered is either 1 or 5. If not, just act dumb and don't do anything.
      if ( taskNumber >= 1 && taskNumber <= 5 ) {
        
        // Retrieve the corresponding item number from the random selection made when the user selected the /creative option.
        // We use minus 1 to offset the reading of the array.
        contentSelector = currentCreativeSelection[ ( taskNumber - 1 ) ];

        taskURL = rows[ contentSelector ].url; // Content address.
        warholValue = rows[ contentSelector ].price; // Content price, as in how many Warhols are earned by watching this media.

        // Reset the random list to nothing so that if someone decides to use a command with a number nothing will happen.
        currentCreativeSelection = [];

        GetBalance( userID, function(error, result){ // Function talks to database and requires a callback.
          
          newBalance = ( warholValue + result );

          AddWarhols( userID, newBalance ); // Function talks to database but does not require a callback.

            return bot.sendMessage( userID, `You now have more Warhols. Enjoy! The link for the content is ${ taskURL }`, { markup });

        });

      }

    });

}

// Update last interaction date

function setLastDate( userID ){
    
    var currentDate = new Date();

    connection.query( 'UPDATE accounts SET date_last = ? WHERE owner = ?', [ currentDate, userID ], function( error, current ){
                
     if ( error ) throw error;


   });

}

// Check for time since last interaction

function DateCompare( userID ){

      var currentDate = new Date();

    connection.query('SELECT date_last FROM accounts WHERE owner =' + userID , function( error, result ){
      
        if ( error ) return error;

          var previousDate = result[0].date_last; // magical command to get one result into a variable

          var sincelastDate = Math.abs(currentDate-previousDate);  // difference in milliseconds

          // console.log(result);
          // console.log('Last here: ' + result[0].date_last );
          // console.log('Time now: ' + currentDate );
          // console.log('Difference: ' + timeConversion(sincelastDate) );
    });

}

// Get last interaction date

function LastInteraction( userID, callback ){

    connection.query('SELECT date_last FROM accounts WHERE owner =' + userID , function( error, result ){
      
        if ( error ) return error;

          return callback( error, result[0].date_last );

    });

}


// Convert milliseconds into human understandable time


function timeConversion( millisec ) {

  var seconds = ( millisec / 1000 ).toFixed(0);

  var minutes = ( millisec / ( 1000 * 60 ) ).toFixed(0);

  var hours = ( millisec / ( 1000 * 60 * 60 ) ).toFixed(0);

  var days = ( millisec / ( 1000 * 60 * 60 * 24 ) ).toFixed(0);

  if ( seconds < 60 ) {

      return seconds + " seconds";

  } else if ( minutes < 60 ) {

      return minutes + " minutes";

  } else if ( hours == 1 ) {

      return hours + " hour";  // added exception for single hour

  } else if ( hours < 24 ) {

      return hours + " hours";

  } else if ( days == 1 ) {

      return days + " day";   // added exception for singe day

  } else {

      return days + " days";

  }

}



// Checks for new Market closures since bets placed

function newMarketActivity( userID, callback ){

    connection.query('SELECT * FROM market_bets WHERE user =' + userID , function( error, result ){
      
        if ( error ) return error;

          return callback( error, result );

    });

}

      // TO DO:

      // Compare current date with last interaction date.

      // Check for fountain overflows in that period and how much they were.   

      // Add overflown Warhols to users account.
       
      // If appropriate send them a message notifying of fountain or market and new balance.
    
// Last line of code, all functions should be above here
bot.connect();
// Do not add any code after this line