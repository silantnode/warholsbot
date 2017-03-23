'use strict';

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot('214012546:AAEAHZ04FXgPiSX1tqPzGfTZmHjUm0b8pTU');

// Other global variables

var taskListCountDown = []; // Helps dynamically format texts to display tasks in a numbered list of buttons that correspond to the available tasks.
var lastIndex = 0; // A terrible solution for keeping track of the last batch of tasks I have accessed.

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

  // Reset these when using the /back option otherwise if the user
  // selects /get_warhols the last batch of tasks are displayed.
  taskListCountDown = [];
  lastIndex = 0;

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



bot.on(['/get_warhols','/repeat_list'], msg => {

  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;

    for ( var i = 0; i < rows.length; i++) {
        // Load the entire existing list of tasks.
        taskListCountDown.push( rows[i].task_id ); 
        
    }
    
    let markup = bot.keyboard([
      // Format the buttons in the Telegram interface using the task numbers connected with the custom command.
      ['/task_'+ taskListCountDown[0] +''],['/task_'+ taskListCountDown[1] +''],['/task_'+ taskListCountDown[2] +''],['/more_tasks'],['/back']], { resize: true }

    );

    var taskListDisplay = '/task_'+ taskListCountDown[0] + " " + rows[0].description + '\n' +
    '/task_'+ taskListCountDown[1] + " " + rows[1].description + '\n' +
    '/task_'+ taskListCountDown[2] + " " + rows[2].description + '\n';

    lastIndex = 3;

    for ( var j = 0; j < 3; j++ ) {
      // Remove the first three tasks in the list so we do not display them again.
      taskListCountDown.shift();
      
    }

    // console.log(rows);

    return bot.sendMessage( msg.from.id, `${ taskListDisplay }`, { markup } );

  });

});
  


bot.on('/more_tasks', msg => {
  // Actually connecting to database is not necessary at this point, but maybe later so I'll just leave it this way for now.
  connection.query('SELECT * FROM tasks', function( error, rows ){

    if ( error ) throw error;
    // Check to see if there are three tasks left or more.
    if ( taskListCountDown.length >= 3 ) {

      let markup = bot.keyboard([

        // Format the buttons in the Telegram interface using the task numbers connected with the custom command.
        ['/task_'+ taskListCountDown[0] +''],['/task_'+ taskListCountDown[1] +''],['/task_'+ taskListCountDown[2] +''],['/more_tasks'],['/back']], { resize: true }

      );

      var taskListDisplay = '/task_'+ taskListCountDown[0] + " " + rows[lastIndex].description + '\n' +
      '/task_'+ taskListCountDown[1] + " " + rows[(lastIndex + 1)].description + '\n' +
      '/task_'+ taskListCountDown[2] + " " + rows[(lastIndex + 2)].description + '\n';

      lastIndex = (lastIndex + 3);

      for ( var i = 0; i < 3; i++){
        // Remove tasks from the list that have already been displayed.
        taskListCountDown.shift();

      }

      return bot.sendMessage( msg.from.id, `${ taskListDisplay }`, { markup });

    }  else if ( taskListCountDown.length == 2 ) {
      // If there are only two tasks display only two of them and provide the option to return to the beginning of the list.
      let markup = bot.keyboard([

        // Format the buttons in the Telegram interface using the task numbers connected with the custom command.
          ['/task_'+ taskListCountDown[0] +''],['/task_'+ taskListCountDown[1] +''],['/repeat_list'],['/back']], { resize: true }

      );


      var taskListDisplay = '/task_'+ taskListCountDown[0] + " " + rows[lastIndex].description + '\n' +
      '/task_'+ taskListCountDown[1] + " " + rows[(lastIndex + 1)].description + '\n';

      lastIndex = 0;

      // Reset the copied task list so we can repopulate it again.
      taskListCountDown = [];

      return bot.sendMessage( msg.from.id, `${ taskListDisplay }`, { markup });

    } else if ( taskListCountDown.length == 1 ){
      // If there is only one task, display that task and provide way to review the list again from first one.
      let markup = bot.keyboard([

        // Format the buttons in the Telegram interface using the task numbers connected with the custom command.
          ['/task_'+ taskListCountDown[0] +''],['/repeat_list'],['/back']], { resize: true }

      );

      var taskListDisplay = '/task_'+ taskListCountDown[0] + " " + rows[lastIndex].description + '';
      
      lastIndex = 0;

      // Reset the copied task list so we can repopulate it again.
      taskListCountDown = [];

      return bot.sendMessage( msg.from.id, `${ taskListDisplay }`, { markup });

    }

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