'use strict';

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot('214012546:AAEAHZ04FXgPiSX1tqPzGfTZmHjUm0b8pTU');

// Other global variables

var taskBatchCounter; // Helps step through the task list in groups of 3
taskBatchCounter = 1;

var buttonDisplay = []; // Helps dynamically format texts to display tasks in a numbered list of buttons that correspond to the available tasks.
var taskCountDown = 0;

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
    [ '/get_warhols' ],[ '/spend_warhols' ],[ '/my_balance' ],[ '/my_tasks' ]], { resize: true }
  );
  
  // Check the warhols database to see if the user already has an account.
  connection.query( 'SELECT * FROM accounts', function( error, rows ){

    for( var i = 0; i < rows.length; i++ ){

      if( rows[i].owner == msg.from.id ){

        return bot.sendMessage( msg.from.id, `Welcome back ${ msg.from.first_name }!`, { markup } ); // Send them a message welcoming them back.
        
      }
    
    }

    // If we get this far then it means the user does not have an account yet. So we create one for them.

    var newOwner = { owner: msg.from.id, owner_name: msg.from.first_name, balance: 0 };
    
    connection.query('INSERT INTO accounts SET ?', newOwner, function( error, result ){
    
      if( error ) throw error;
    
      console.log('Last insert ID:', result.insertId);

    });

    return bot.sendMessage( msg.from.id, `Welcome ${ msg.from.first_name }! You're new here, right? That's ok, we created an account for you! Use the commands to interact with your account.`, { markup } );

  });

});


// Check the balance on the warhols account.

bot.on('/my_balance', msg => {
  
  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ '/get_warhols' ], [ '/spend_warhols' ], [ '/my_balance' ], [ '/my_tasks' ] ], { resize: true }
  );

  connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function( error, result ){
      
  if ( error ) throw error;
    
  if ( result[0].balance == 0 ) {
        
      return bot.sendMessage( msg.from.id, `You currently have ${ result[0].balance } warhols. Use the /get_warhols command to change this situation.`, { markup });
      
    } else {

      return bot.sendMessage( msg.from.id, `You currently have ${ result[0].balance } warhols. Use the /spend_warhols to change this situation.`, { markup });

    }

  });

});


// Get warhols.



bot.on(['/get_warhols','/back_to_beginning_of_list'], msg => {

    connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;

    var taskNumber = 0;

    taskCountDown = rows.length;

    for ( var i = 0; i < 3; i++ ){

      taskNumber = rows[i].task_id;

      buttonDisplay[i] = '/task_' + taskNumber +''; // Format the text for the buttons.

    }

    taskBatchCounter = 3;
    taskCountDown = ( taskCountDown - 3 );

    let markup = bot.keyboard([

      [ buttonDisplay[0] ], [ buttonDisplay[1] ], [ buttonDisplay[2] ], [ '/more_tasks' ], [ '/back' ] ], { resize: true }

    );

    return bot.sendMessage( msg.from.id, `There are currently ${ rows.length } tasks available to choose from.`, { markup }); 

  });

});
  


bot.on('/more_tasks', msg => {

  var taskNumber = 0;

  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;

    // console.log(rows.length);

    if ( taskCountDown >= 3 ) {

      console.log("I am still doing batches of 3");

      for ( var i = 0; i < 3; i++ ){
        
        // taskNumber = ( taskBatchCounter + 1 );      

        taskNumber = rows[taskBatchCounter].task_id;

        buttonDisplay[i] = '/task_' + taskNumber +'';

        //console.log(rows[taskBatchCounter].task_id);

        taskBatchCounter++;

        taskCountDown = taskCountDown - 1;

      }

     } else if ( taskCountDown == 2 ) {

       console.log("I am down to two");

      for ( var i = 0; i < taskCountDown; i++ ){

        taskNumber = rows[taskBatchCounter].task_id;      

        buttonDisplay[i] = '/task_' + taskNumber +'';

        taskBatchCounter++;
      
      }

    }

    console.log(buttonDisplay.length);
  
    // console.log(taskCountDown);

    if ( buttonDisplay.length == 3 ) {

      var markup = bot.keyboard([

        [ buttonDisplay[0] ],[ buttonDisplay[1] ],[ buttonDisplay[2] ],[ '/more_tasks' ], [ '/back' ] ], { resize: true }

      );

    } else if ( bottonDisplay.length == 2 ){

      var markup = bot.keyboard([

        [ buttonDisplay[0] ],[ buttonDisplay[1] ],['/back_to_beginning_of_list'],[ '/back' ] ], { resize: true }

      );

    } else {

      var markup = bot.keyboard([

        [ buttonDisplay[0] ], [ '/back' ] ], { resize: true }

      );

    }

    if ( taskBatchCounter >= ( rows.length ) ) {

      taskBatchCounter = 0;
      taskCountDown = rows.length;

    }

    return bot.sendMessage( msg.from.id, `Here are the next 3 out of the ${ rows.length } tasks available.`, { markup });

  });

});


/*

// Spend warhols

bot.on('/spend_warhols', msg => {
  connection.query('SELECT * FROM tasks', function(error, rows){
    console.log(rows);
  });
});

*/

bot.connect();