'use strict';

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot('214012546:AAEAHZ04FXgPiSX1tqPzGfTZmHjUm0b8pTU');


// Include the ask module.

bot.use(require('telebot/modules/ask.js'));


// Telebot button names

const GET_BUTTON = "/get";
const BALANCE_BUTTON = "/balance";
const SPEND_BUTTON = "/spend";
const START_BUTTON = "/start";
const BACK_BUTTON = "/back";

const GIFT_ECON = "/gift";
const CREATIVE_ECON = "/creative";
const SPECULATIVE_ECON = "/speculative";

const MAX_LIST_DISPLAY = 5;
const RAND_GIFT_RANGE = 10;

// Holds the random selection of five items to be selected from by the user. The list is changed every time the user selects the 'creative' option when selecting 'get'
var currentCreativeSelection = []; 
var currentGiftSelection = [];

// Set by get or spend. 1 is get and 2 is spend. This allows me to use the same command set of '/gift', '/creative' and 
// '/speculative' twice by simply checking the mode whenever these commands are called. Probably not the best approach
// but it was the first solution I came up with so I decided to run with it and deal with the consequences later.
var warholMode = 0; 

// Connect to the warhols database

const mysql      = require('mysql');

const connection = mysql.createConnection({
  host     : 'mysql.coinspiration.org',
  user     : 'coinspiration',
  password : 'c01nspiration',
  database : 'warholsbot'

});

connection.connect(function(error){
  
  if (error) {

    console.log('Error connecting to Db');
    return;

  }

  console.log('Connection established');

});



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
    
      console.log('Last insert ID:', result.insertId);

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

  // connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function( error, result ){

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

    let markup = bot.keyboard([
      [ GIFT_ECON ],[ CREATIVE_ECON ],[ SPECULATIVE_ECON ]], { resize: true }
    );  
    
    warholMode = 2;

    return bot.sendMessage( msg.from.id, `How do you want to spend Warhols?`, { markup });

});


// The gift based economy, where everyone sees themselves in the face of the other.

bot.on( CREATIVE_ECON, msg => {

  let markup = bot.keyboard([
    [ BACK_BUTTON ]], { resize: true }
  );

  GetCreativeContent( function( error, content ){
  
    // Display the tasks as text.
    return bot.sendMessage( msg.from.id, `${ content }`, { markup } );
  
  });

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

  // if ( warholMode == 1 ){

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

    return bot.sendMessage( `Enjoy! Your account has benn credited with ${ warholValue } Warhols`, { markup } );

  // }

});

bot.on( '/no', msg => {

  // if ( warholMode == 1 ){

    let markup = bot.keyboard([
      [ BACK_BUTTON ],[ GET_BUTTON ]], { resize: true }
    );

    return bot.sendMessage( msg.from.id, `Perhaps there is another good deed you are willing to perform isntead? \n Use use /get to find another or go /back to the main menu.`, { markup } );

  // }

});



/* * * FUNCTIONS * * */

function AddWarhols( userID, addedBalance ){

    connection.query('UPDATE accounts SET balance = ? WHERE owner = ?', [ addedBalance, userID ], function( error, current ){
                
    if ( error ) throw error;

    // console.log('Changed ' + current.changedRows + ' rows');

  });

}


function GetBalance( msgID, callback ){

    connection.query('SELECT balance FROM accounts WHERE owner =' + msgID , function( error, result ){
      
        if ( error ) return error;

        return callback( error, result[0].balance );
        
    });

}


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


bot.connect();