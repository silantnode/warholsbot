'use strict';

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot('214012546:AAEAHZ04FXgPiSX1tqPzGfTZmHjUm0b8pTU');

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

bot.on(['/start','/back'], msg => {

  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ '/get_warhols' ],[ '/spend_warhols' ],[ '/my_balance' ]], { resize: true }
  );
  
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


// Check the balance on the warhols account.

bot.on('/my_balance', msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ '/get_warhols' ], [ '/spend_warhols' ], [ '/my_balance' ] ], { resize: true }
  );

  connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function( error, result ){
      
  if ( error ) throw error;
    
  // Check what the balance is... 
  if ( result[0].balance == 0 ) {
      // If there are no warhols on the account encourage them to get some warhols.
      return bot.sendMessage( msg.from.id, `You currently have ${ result[0].balance } warhols. Use the /get_warhols command to change this situation.`, { markup });
      
    } else {
      // If they have warhols encourage them to spend the warhols.
      return bot.sendMessage( msg.from.id, `You currently have ${ result[0].balance } warhols. Use the /spend_warhols to change this situation.`, { markup });

    }

  });

});


// Get warhols.

bot.on('/get_warhols', msg => {

  let markup = bot.keyboard([
    [ '/get_warhols' ], [ '/spend_warhols' ], [ '/my_balance' ] ], { resize: true }
  );

  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;

    var taskListDisplay = '';

    // Prepare all of the tasks for display.
    for ( var i = 0; i < rows.length; i++) {
        
        taskListDisplay += '/task_' + ( i + 1 )+ ' '; 
        taskListDisplay += rows[i].description;
        taskListDisplay += '\n \n';
        
    }

    // Display the tasks as text.
    return bot.sendMessage( msg.from.id, `${ taskListDisplay }`, { markup } );

  });

});
  


bot.on(['/*'], (msg) => {
  
  let markup = bot.keyboard([
    [ '/get_warhols' ],[ '/spend_warhols' ],[ '/my_balance' ]], { resize: true }
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
  
    // Check if '/task_' exists at the beginning of the text.
    var commandCheck = readText.slice(0,6);

    if ( commandCheck == '/task_'){
      // Get the exact task number chosen.
      taskNumber = readText.slice(6, readText.length);
      
      taskURL = rows[(taskNumber - 1)].url;
      warholValue = rows[(taskNumber - 1)].price;
      
      connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function( error, result ){
      
          if ( error ) throw error;

          console.log('The current balance is ' + result[0].balance);
          console.log('The value of the warhols earned is ' + warholValue);

          newBalance = ( warholValue + result[0].balance );

          console.log('The new balance available as of this action ' + newBalance);

          // Award the warhols to the user.

          connection.query('UPDATE accounts SET balance = ? WHERE owner = ?', [ newBalance, msg.from.id ], function( error, result ){

            if ( error ) throw error;

            console.log('Changed ' + result.changedRows + ' rows');

            // Get the updated balance of the user.

            connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function( error, proof ){
            
              if ( error ) throw error;

              updatedBalance = proof[0].balance;

              return bot.sendMessage( msg.from.id, `This is task number ${ taskNumber } valued at ${ warholValue }. Your new current balance is ${ updatedBalance } warhols. And the web address for this task is ${ taskURL }.`, { markup });

            });

          });

      });

    }

  });

});


// Look into changing field names in mysql
// If so, change 'availablility' field in tasks to 'chosen'

// Spend warhols.

bot.on('/spend_warhols', msg => {

    let markup = bot.keyboard([
      [ '/get_warhols' ],[ '/spend_warhols' ],[ '/my_balance' ]], { resize: true }
    );

    let test = myModule( "belly" );
    console.log(test);
    let anotherTest = CurrentBalance( msg.from.id ); 
    console.log(anotherTest);

    return bot.sendMessage( msg.from.id, `The current balance is ${ CurrentBalance( msg.from.id ) } warhols.`, { markup });

});


function CurrentBalance( owner ){

  var currentBalance;

  connection.query('SELECT balance FROM accounts WHERE owner =' + owner , function( error, result ){
      
    if ( error ) throw error;

    currentBalance = result[0].balance;
    
    return string( currentBalance );

  });  

}


function myModule( egg ) {
  var name = "tim";
  name = name + "" + egg + "";
  return name;
}


bot.connect();