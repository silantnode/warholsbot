'use strict';

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot('214012546:AAEAHZ04FXgPiSX1tqPzGfTZmHjUm0b8pTU');

// Telebot button names

const getButton   = "/get";
const balncButton = "/balance";
const spndButton  = "/spend";
const strtButton  = "/start";
const backButton  = "/back";

const giftEcon    = "/gift";
const crtvEcon    = "/creative";
const specEcon    = "/speculative";

var currentCreativeSelection = [];

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

bot.on([ strtButton, backButton ], msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ getButton ],[ spndButton ],[ balncButton ]], { resize: true }
  );
  
  currentCreativeSelection = [];

  // Check the warhols database to see if the user already has an account.
  connection.query( 'SELECT * FROM accounts', function( error, rows ){

    for( var i = 0; i < rows.length; i++ ){

      if( rows[i].owner == msg.from.id ){

        // Send them a message welcoming them back.
        return bot.sendMessage( msg.from.id, `Welcome back ${ msg.from.first_name }!`, { markup } );
        
      }
    
    }

    // If we get this far then it means the user does not have an account yet. So we create one for them.

    var newOwner = { owner: msg.from.id, owner_name: msg.from.first_name, balance: 0 };
    
    connection.query('INSERT INTO accounts SET ?', newOwner, function( error, result ){
    
      if( error ) throw error;
    
      console.log('Last insert ID:', result.insertId);

    });

    return bot.sendMessage( msg.from.id, `Welcome ${ msg.from.first_name }! You're new here, right? That's ok! we created an account for you. Use the commands below to interact with your account.`, { markup } );

  });

});


// Button for testing functions.

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


// Check the balance on the warhols account.

bot.on( balncButton, msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ getButton ],[ spndButton ],[ balncButton ]], { resize: true }
  );

  connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function( error, result ){
      
  if ( error ) throw error;
    
  // Check what the balance is... 
  if ( result[0].balance == 0 ) {
      // If there are no warhols on the account encourage them to get some warhols.
      return bot.sendMessage( msg.from.id, `You currently have ${ result[0].balance } warhols. Use the /get command to change this situation.`, { markup });
      
    } else {
      // If they have warhols encourage them to spend the warhols.
      return bot.sendMessage( msg.from.id, `You currently have ${ result[0].balance } warhols. Use the /spend to change this situation.`, { markup });

    }

  });

});


// Get warhols.

bot.on( getButton, msg => {

    let markup = bot.keyboard([
      [ giftEcon ],[ crtvEcon ],[ specEcon ]], { resize: true }
    );

    return bot.sendMessage( msg.from.id, `How do you want to get Warhols?`, { markup });

});


// The gift based economy, where everyone sees themselves in the face of the other.

bot.on( crtvEcon, msg => {

  let markup = bot.keyboard([
    [ backButton ]], { resize: true }
  );

  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;

    var taskListDisplay = '';
    var giftSelector;
    var actualTaskID;

    while( currentCreativeSelection.length < 5 ){
        // Set up the numbers usig minus 1 so that the numbers will read the list properly.
        var randNum = (Math.ceil( Math.random() * rows.length ) -1 );

        if( currentCreativeSelection.indexOf( randNum ) > -1 ) continue;

        currentCreativeSelection[ currentCreativeSelection.length ] = randNum;

    }

    // Prepare all of the tasks for display.
    // Randomly select 5 items from the table.
    // Keep track of which items were selected inside currentCreativeSelection as an array.

    for ( var i = 0; i < ( currentCreativeSelection.length ) ; i++) {
        
        taskListDisplay += '/' + ( i + 1 ) + ' ';
        giftSelector = currentCreativeSelection[i];
        actualTaskID = rows[ giftSelector ].task_id;
        taskListDisplay += rows[ giftSelector ].description;
        taskListDisplay += '\n \n';
        
    }

    // Display the tasks as text.
    return bot.sendMessage( msg.from.id, `${ taskListDisplay }`, { markup } );

  });

});


// The creative economy content, where everyone makes stuff but nobody keeps money.

bot.on( giftEcon, msg =>{

  let markup = bot.keyboard([
    [ backButton ]], { resize: true }
  );

  return bot.sendMessage( msg.from.id, `This economy has not been developed... yet. Please commen zee backen später.`, { markup });

});
  

// The speculative economy, where everyone loses their shirt except for the socipaths.

bot.on( specEcon, msg =>{

  let markup = bot.keyboard([
    [ backButton ]], { resize: true }
  );

  return bot.sendMessage( msg.from.id, `This economy has not been developed... yet. Please commen zee backen später.`, { markup });
  
});


// We use this to read any incoming message from the user.

bot.on(['/*'], (msg) => {
  
  let markup = bot.keyboard([
    [ getButton ],[ spndButton ],[ balncButton ]], { resize: true }
  );

  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;

    // Copy the text from the user.
    var readText = msg.text; 

    // Setup containers for reading entries from the selected task as well as updating the users warhols balance.
    var taskNumber;
    var taskURL;
    var warholValue;
    var newBalance;
    var updatedBalance;
    
    var taskSelector;
    
    // Read from the second character in the message string.
    taskNumber = readText.slice( 1, readText.length );

    // Make sure that what the text is only a number.
    if ( isNaN( taskNumber ) == false  ) {
      
      // Retrieve the corresponding item number from the random selection made when the user selected the /creative option.
      // We use minus 1 to offset the reading of the array.
      taskSelector = currentCreativeSelection[ ( taskNumber - 1 ) ];

      taskURL       = rows[ taskSelector ].url;
      warholValue   = rows[ taskSelector ].price;

      connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function( error, result ){
      
          if ( error ) throw error;

          newBalance = ( warholValue + result[0].balance );

          // Award the warhols to the user.

          connection.query('UPDATE accounts SET balance = ? WHERE owner = ?', [ newBalance, msg.from.id ], function( error, result ){

            if ( error ) throw error;

            // console.log('Changed ' + result.changedRows + ' rows');

            return bot.sendMessage( msg.from.id, `You now have more warhols. Enjoy! The link for the content is ${ taskURL }`, { markup });

          });

      });

    }

  });

});

/*

function CurrentBalance( owner ){

  var currentBalance;

  connection.query('SELECT balance FROM accounts WHERE owner =' + owner , function( error, result ){
      
    if ( error ) throw error;

    currentBalance = result[0].balance;
    
    return string( currentBalance );

  });  

}


function myModule( egg ) {
  var name = "tim ";
  name = name + "" + egg + "";
  return name;
}

*/

bot.connect();