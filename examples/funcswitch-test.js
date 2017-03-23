'use strict';

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot('307637270:AAHU2mHwhjH2RReL_kxCC2SruPFOb6A4QDc');


// Some variables... why not?

var WarholUsageMode = 0; // 0 means no usage mode, 1 means get warhols, 2 means spend warhols... kapeesh?

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


bot.on('/*', msg => {

    let whatever = msg.text;

    switch ( whatever ) {

        case '/start':

                startFunction( msg.from.id, 'You just started the bot.' );
                break;

        case '/back':

                backFunction( msg.from.id, function( error, result ){

                    console.log(result);
                    return bot.sendMessage( msg.from.id , `Your balance is ${ result }` );

                });
                
                break;

        case '/get':

            WarholUsageMode = 1;

            return bot.sendMessage( msg.from.id, `You are now entering going to get some warols.`);

        case '/spend':

            WarholUsageMode = 2;

            return bot.sendMessage( msg.from.id, `You are now entering going to spend some warols.`);

        case '/gift':

            if ( WarholUsageMode == 1 ) {

                // Invoke function for getting warhols through the gift economy.
                // Pass user id with the function.
                return bot.sendMessage( msg.from.id, `You can now get warhols in gift mode.` );

            } else if ( WarholUsageMode == 2 ) {

                // Invoke function for spending warhols through the gift economy.
                // Pass user id with the function.
                return bot.sendMessage( msg.from.id, `You can now spend warhols in gift mode.` );

            }

        case '/creative':

        case '/speculative':

    } 

});


function backFunction( msgID, callback ){

    connection.query('SELECT balance FROM accounts WHERE owner =' + msgID , function( error, result ){
      
        if ( error ) return error;

        return callback( error, result[0].balance );
        
    });

}


function startFunction( msgID, responseText ){

    connection.query('SELECT balance FROM accounts WHERE owner =' + msgID , function( error, result ){
      
        if ( error ) throw error;

        return bot.sendMessage(msgID, `${ responseText } and your account balance is ${ result[0].balance }` );
        
    });

}


bot.connect();