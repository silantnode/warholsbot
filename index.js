'use strict';

// Read an external file where values await.
var fs = require('fs');
var custom_data = fs.readFileSync('data.txt').toString().split("\n");

// HTTP request tool used for POST to WarholsChannel
var requestify = require('requestify');

// Create the connection to the database.
const mysql = require('mysql');

const pool = mysql.createPool({

  connectionLimit : 100,
  waitForConnections: true,
  queueLimit: 100,
  host     : custom_data[1], // Host address of the database server.
  user     : custom_data[2], // Username for the coinspiration account.
  password : custom_data[3], // Password for the coinspiration account.
  database : custom_data[4]  // Name of the database we are accessing.

});

pool.getConnection( function (error){

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
// How many times to multiply the bet if user wins in the market
const SPEC_MULTIPLIER = 2;
// The minimum amount of warhols required per amount of users
// for an even distrobution of warhols from the fountain.
const MIN_DISTRO = 2;
// The maximum bonus amount of warhols included
// in the distrobution from the fountain.
const GIFT_MULTIPLYER = 2;

const YES_BUTTON = "/yes";
const NO_BUTTON = "/no";
// Maximum number of items to be displayed for the user to choose
// from whenever they are presented with multiple choice selections.
const MAX_LIST_DISPLAY = 5;
// Range setting for randomly giving out Warhols.
const RAND_GIFT_RANGE = 10;
// The amount one receives if they have a coupon
const MAX_COUPON = 10;

// How long a description of content is allowed to be.
const DESCRIPTION_MAX_LENGTH = 140;

// Identify the event for which the Warhols will be used -
// this will provide a subset of market closing dates to work with
var eventName = 'eind2017';


// Holds time of market bets
var betDate = 0;

// Holds id of next market closure for a bet
var marketClosureId = 0;

// Here we are putting temporarily some variables
// just to test the market winning function.
// Afterwards they should all be converted into local
// variables or stored on the database to avoid conflicts.

// Date of last market closure

var lastMarketClosing = 0;

// array for storing market winners

var marketWinners = [];

// id and flavor for a specific bet by a user

var betInfo = 0;

// cumulative credit of all bets won by a user in period checked

var betCreditTotal = 0;

// variable to hold updated balance after added market winnings

var balancePlusBet = 0;


// The user starts the bot with the /start command.

bot.on([ START_BUTTON ], msg => {

  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );

  // Check the Warhols database to see if the user already has an account.

  pool.getConnection( function( err, connection ) {

    connection.query( 'SELECT * FROM accounts', function( error, rows ){

      connection.release();

      if( error ) throw error;

      let doesUserExist = false;

      for( let i = 0; i < rows.length; i++ ){

        if( rows[i].owner == msg.from.id ){ // Check if the user exists.

          // They are an existing user.
          doesUserExist = true;
          break;

        } else {

          // They are a new user.
          doesUserExist = false;

        }

      }  // end of for loop

      // Send them a message welcoming them back.

      if ( doesUserExist == true ){

        setMode( msg.from.id, 0 );

        resetRemoteData( msg.from.id );

        return bot.sendMessage(
          msg.from.id,
          `Welcome back ${ msg.from.first_name }!`,
          { markup } );

      } else if ( doesUserExist == false ) {

        // If we get this far then it means the user does not
        // have an account yet. So we create one for them.

        createUserAccount( msg.from.id, msg.from.first_name );

        return bot.sendMessage(
          msg.from.id,
          `Welcome ${ msg.from.first_name }! You're new here, right? That's ok!
          we created an account for you. Use the commands below to interact with
          your account.`,
          { markup } );

      }

    });

  });

});

// BACK command

bot.on( BACK_BUTTON, msg => {

  //first check if user exists

  doesUserExist( msg.from.id, function(error, doThey){

  if ( doThey == true ){

    // Display commands as handy buttons in the telegram interface.
    let markup = bot.keyboard([
      [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
    );

    setMode( msg.from.id, 0 );
    resetRemoteData( msg.from.id );
    return bot.sendMessage(
      msg.from.id,
      `Welcome back ${ msg.from.first_name }!`,
      { markup } );

    }

  });

});


// Command for testing functions.

bot.on( '/test', msg => {



});


// true if they do exist, false if they don't.
function doesUserExist( userID, callback ){

  // Check the Warhols database to see if the user already has an account.

  pool.getConnection( function( err, connection ) {

    connection.query( 'SELECT * FROM accounts', function( error, rows ){

      connection.release();

      if( error ) throw error;

      let doesUserExist = false;

      for( let i = 0; i < rows.length; i++ ){

        if( rows[i].owner == userID ){ // Check if the user exists.

          // They are an existing user.
          doesUserExist = true;
          break;

        } else {

          // They are a new user.
          doesUserExist = false;

        }

      }

      return callback( error, doesUserExist );

    });

  });

}


function createUserAccount( userID, userFirstName ){

  pool.getConnection(function(err, connection){

    let newOwner = {
      owner: userID,
      owner_name: userFirstName,
      balance: 0,
      mode: 0 };

      connection.query('INSERT INTO accounts SET ?',
        newOwner,
        function( error, result ){

        connection.release();

        if( error ) throw error;

      });

  });

}

// Sets the mode of the user

function setMode( userID, newMode ){

  console.log('entered setmode function ' + userID);

  doesUserExist( userID, function(error, doThey){



    if ( doThey == true ){

      pool.getConnection(function(err, connection) {

        connection.query( 'UPDATE accounts SET mode = ? WHERE owner =?',
         [ newMode, userID ],
         function( error, updatedMode ){

          console.log( userID +' updated to mode ' + newMode );

          connection.release();

          if ( error ) throw error;

        });

      });

    }

  });

}


// Gets the mode of the user

function getMode( userID, callback ){

  doesUserExist( userID, function( error, doThey ){

    if ( doThey == true ){

      pool.getConnection(function(err, connection) {

        connection.query('SELECT mode FROM accounts WHERE owner ='
         + userID ,
         function( error, currentMode ){

          connection.release();

          if ( error ) throw error;

          console.log(currentMode[0].mode);

          return callback( error, currentMode[0].mode );

        });

      });

    }

  });

}


// Resets the random list field in the account of a specified user

function resetRemoteData( userID ){

  pool.getConnection(function(err, connection) {

    let resetList = "";

    connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner = ?',
    [ resetList, userID ],
    function( error, resetList ){

      connection.release();

      if ( error ) throw error;

      console.log('The random list selection for ' + userID + ' has been reset');

    });

  });

}



bot.on( '/help', msg => {

  return bot.sendMessage( msg.from.id, `A list of common commands available to
  use for interacting with warhols bot.\n
  /start - Starts the warholsbot.\n
  /back - Returns you to the start menu from anywhere.\n
  /spend - Starts the process of spending warhols and can be used anywhere.\n
  /balance - Check how many warhols you have. Can be accessed anywhere.\n\n
  You may see other commands as you step through the procedures provided by each
  of the above commands.
  These commands are process specific and will not work out of context.
  `);

});


// Check the balance of the current users Warhols account.
// (NEW version with newMarketActivity function plugged in)

bot.on( BALANCE_BUTTON, msg => {

  // Display commands as handy buttons in the telegram interface.
  let markup = bot.keyboard([
    [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
  );

  // to do: check if the fountain has been activated and if so display
  // message (compare last activity with last fountain date)

  doesUserExist( msg.from.id, function(error, doThey){

    if ( doThey == true ){

      // at this point "result" loads the balance since
      // last interaction, bets not processed yet
      GetBalance( msg.from.id, function( error, result ){

        // check if there are new market closures that can lead to new balance

        // this function's result is an array with two values
        newMarketActivity( msg.from.id, function( error, newMarketNewBalance ){
        // first value of array is 1 for new closures, 0 for none of such
        var anyClosures = newMarketNewBalance[0];
        // second result of array is new updated user balance with any new bets won
        var betsBalance = newMarketNewBalance[1];

        // console.log('callback -- anyClosures: ' + anyClosures);
        // console.log('callback -- new balance after winnings: ' + betsBalance);
        // console.log('previous balance: ' + result);

        var wonWarhols = (betsBalance-result); // Warhols won, can be zero if no wins

        if ( anyClosures == 1 ) {

          // if new balance is higher, user won Warhols on market - YAY to speculation!
          if (betsBalance > result) {

                return bot.sendMessage( msg.from.id, `The market has closed and
                you have won ${ wonWarhols } Warhols.
                Your new balance is ${ betsBalance } Warhols.
                \nChoose how to /spend your warhols.
                Or /get some more.`, { markup });

            } else {

                return bot.sendMessage( msg.from.id, `The market has closed and
                unfortunately you didn't win.
                You currently have ${ betsBalance } Warhols.
                \nChoose how to /spend your warhols.
                Or /get some more.`, { markup });

            }

          } else { // markets have not closed, just diplay "old" balance which has not changed

              // Check what the balance is...
              if ( result == 0 ) {
                // If there are no Warhols on the account encourage them to get some Warhols.
                return bot.sendMessage( msg.from.id, `You currently have ${ result } Warhols.
                  Use the /get command to change this situation.`, { markup });

              } else {
                // If they have Warhols encourage them to spend the Warhols.
                return bot.sendMessage( msg.from.id, `You currently have ${ result } Warhols.
                  Choose how to /spend your warhols. Or /get some more.`, { markup });

              }

          }

        }); // end of market check routine

      });  // end of getBalance function

    }

  }); // end of checking if user exists

}); // end of bot.on balance button


// Get warhols.

bot.on( GET_BUTTON, msg => {

  // first check if user exists

  doesUserExist( msg.from.id, function(error, doThey){



  if ( doThey == true ){

    let markup = bot.keyboard([
      [ GIFT_ECON ],[ CREATIVE_ECON ],[ SPECULATIVE_ECON ]], { resize: true }
    );

    setMode( msg.from.id, 1 ); // Entering get mode.

    return bot.sendMessage( msg.from.id, `How do you want to get Warhols?`, { markup });

  }
  });

});


bot.on( SPEND_BUTTON, msg => {


   // first check if they have an account
   doesUserExist( msg.from.id, function(error, doThey){



   if ( doThey == true ){


     // Check their account to see if it has any Warhols.

    GetBalance( msg.from.id, function( error, balance ){

      if ( balance < 5 ){

          let markup = bot.keyboard([
            [ GET_BUTTON ]], { resize: true }
          );

          return bot.sendMessage( msg.from.id, `You don’t have enough Warhols in
            your account. You need at least 5 Warhols and your
            balance is ${ balance }. You should /get some Warhols first.`);

      } else { // If they have enough warhols they are provided with options for spending them.

        let markup = bot.keyboard([
          [ GIFT_ECON ],[ CREATIVE_ECON ],[ SPECULATIVE_ECON ]], { resize: true }
        );

        setMode( msg.from.id, 4 ); // Entering spend mode.

        return bot.sendMessage( msg.from.id, `How do you want to spend Warhols?`, { markup });

      }

    });

  }

  });

});


// The creative economy content, where everyone makes stuff but nobody keeps money.

bot.on( CREATIVE_ECON, msg => {

  getMode( msg.from.id, function(error, currentMode){

    if ( currentMode == 1 ){ // We are in get mode...

      let markup = bot.keyboard([
        [ BACK_BUTTON ]], { resize: true }
      );

      GetCreativeContent( msg.from.id, function( error, content ){

        setMode( msg.from.id, 2 ); // Change mode to get/creative

        // Display the tasks as text.
        return bot.sendMessage( msg.from.id, `${ content }`, { markup } );

      });

    } else if ( currentMode == 4 ){ // We are in spend mode...

      GetBalance( msg.from.id, function( error, balance ){

        let markup = bot.keyboard([
            [ BACK_BUTTON ]], { resize: true }
        );

        if ( balance < 10 ){

          let markup = bot.keyboard([
            [ BACK_BUTTON ]], { resize: true }
          );

          return bot.sendMessage( msg.from.id, `You don't have enough Warhols
            to publish. Try and /get more Warhols`, { markup } );

        } else {

          let markup = bot.keyboard([
            [ '/publish' ],[ BACK_BUTTON ]], { resize: true }
          );

          setMode( msg.from.id, 9 );

          return bot.sendMessage( msg.from.id, `You can /publish your content
            for 10 Warhols. Your current balance is ${ balance } Warhols`, { markup } );

        // Function for reading url and descriptive text from the user and sending it to the database.

        }

      });

    }

  });

});


// The following three bot.on commands deal with a user spending Warhols by submitting content.

bot.on( PUBLISH_BUTTON , msg => {

  let markup = bot.keyboard([
      [ BACK_BUTTON ]], { resize: true }
  );

  // Need a way to prevent the publish command from being invoked or set warhol
  // mode in case people want to short cut to publish without stepping through
  // all of the other menus.

  getMode( msg.from.id, function( error, currentMode ){

    if ( currentMode == 9 ){

      return bot.sendMessage(
        msg.from.id,
        `Enter the URL for the content.`,
        { ask: 'url' },
        { markup } );

    }

  });

});



bot.on( '/coupon' , msg => {

  let markup = bot.keyboard([
      [ BACK_BUTTON ]], { resize: true }
  );

  doesUserExist( msg.from.id, function(error, doThey){

    if ( doThey == true ){

      pool.getConnection(function(err,connection){

        connection.query( 'SELECT used_coupon FROM accounts WHERE owner ='
        + msg.from.id,
        function( error, couponUsed ){

          if( error ) throw error;

          if ( couponUsed[0].used_coupon == 1 ) { // They have already used a coupon

            let markup = bot.keyboard([
              [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
            );

            return bot.sendMessage( msg.from.id, `You have already used a coupon
              code. Maybe /get some warhols?`, { markup });

          } else if ( couponUsed[0].used_coupon == 0 ) { // They have not used a coupon

            setMode( msg.from.id, 14 ); // Set to coupon mode.

            return bot.sendMessage( msg.from.id, `It seems you have a coupon
              for free Warhols. Please enter the coupon code:`,
              { ask: 'coupon' },
              { markup });
          }

        });

      });

    } else {

      createUserAccount( msg.from.id, msg.from.first_name );

      setMode (msg.from.id, 14);

      return bot.sendMessage( msg.from.id,
        `Welcome ${ msg.from.first_name }!
        You're new here, right? We created an account for you.
        Now you can enter the coupon code.`,
        { ask: 'coupon' },
        { markup } );

    }

  });

});



bot.on('ask.coupon', msg => {

  getMode( msg.from.id, function( error, currentMode ){

    if ( currentMode == 14 ){

      if ( msg.text.startsWith('/') == true ){

        if ( msg.text == '/back'){

          // It's a command but just let /back do its job.
        } else {

          let markup = bot.keyboard([
            [ BACK_BUTTON ]], { resize: true }
          );

          return bot.sendMessage( msg.from.id, `That is a command.
            Please enter a coupon code.` ,
            { ask: 'coupon' },
            { markup });

        }

      } else { // The message is not a command or any other gobley gook...

        let couponCode = msg.text;

        let codeFound = false;

        let codeUsed = false;

        let matchingCode;

        pool.getConnection(function(err, connection) {

          connection.query( 'SELECT * FROM coupons', function( error, allCodes ){

            // connection.release();

            if( error ) throw error;

            for( let i = 0; i < allCodes.length; i++ ){
              // If the code entered has been found...
              if ( couponCode == allCodes[i].unique){

                console.log('Found!');

                if ( allCodes[i].used == 0 ){

                  console.log('And it can be used!');
                  // Minus 1 to pad for the 0 of the array.
                  matchingCode = (allCodes[i].id - 1 );
                  console.log(matchingCode);
                  codeFound = true;
                  break;

                } else {

                  codeUsed = true;
                  break;

                }

              }

            }

            if ( codeUsed == true ){

              return bot.sendMessage( msg.from.id, `Sorry, this code has been
                used already. Try another.`,
                { ask: 'coupon' });

            }

            if ( codeFound == false ){

              return bot.sendMessage( msg.from.id, `This code is invalid.
                Maybe you mistyped? Try again.`,
                { ask: 'coupon' });

            } else if ( codeFound == true ) {

              console.log('Do the thing.');


              // Mark the code as used.
              connection.query( 'UPDATE coupons SET used = ? WHERE id = ?',
              [ 1, allCodes[ matchingCode ].id ],
              function( error, selectedCoupon ){

                if( error ) throw error;

              });

              // Record the Telegram user id of the person who used the code.
              connection.query( 'UPDATE coupons SET owner = ? WHERE id = ?',
              [ msg.from.id,
              allCodes[ matchingCode ].id ],
              function( error, claiment ){

                if( error ) throw error;

              });

              // Flag on the account of the user that they have used a coupon.
              connection.query( 'UPDATE accounts SET used_coupon = ? WHERE owner = ?',
              [ 1, msg.from.id ],
              function( error, usedCoupon ){

                if( error ) throw error;

              });

              // Record the time and date the coupon was claimed.
              let currentDate = new Date();

              connection.query( 'UPDATE coupons SET tds = ? WHERE id = ?',
              [ currentDate,
              allCodes[ matchingCode ].id ],
              function( error, dateConfirmation ){

                connection.release();

                  if( error ) throw error;

              });

              // Give the user their warhols.
              GetBalance( msg.from.id, function( error, currentBalance ){

                let newBalance = ( MAX_COUPON + currentBalance );

                AddWarhols( msg.from.id, newBalance );

              });

              let markup = bot.keyboard([
                [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
              );

              setMode( msg.from.id, 0 );

              return bot.sendMessage( msg.from.id, `Yay! Your account was
              credited with 10 Warhols. \nYou can now /spend them,
              or /get even more!`,
              { markup });

            }

          });

        });

      }

    }

  });

});



bot.on('ask.url', msg => {

  getMode( msg.from.id, function( error, currentMode ){

    if ( currentMode == 9 ) {

     if ( msg.text.startsWith('/') == true ) {

        if ( msg.text == '/back') {

          // It's a command but just let /back do its job.

        } else {

          return bot.sendMessage( msg.from.id, `That was a command.
            Please enter a url.`,
            { ask: 'url' });

        }

      } else {

        if ( isUrl( msg.text ) == true ){ // Check if the url is a valid one.

          pool.getConnection(function(err, connection) {

          // If it is valid then save it to the temporary data field of the user.

            connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner = ?',
            [  msg.text, msg.from.id ],
            function( error, confirmedContent){

              connection.release();

              if ( error ) throw error;

              setMode( msg.from.id, 10 );

              return bot.sendMessage( msg.from.id, `Now enter a 140 character
              description of the content.`,
              { ask: 'whatisit' });

            });

          });

        } else {

          return bot.sendMessage( msg.from.id, `You have not entered a valid web
          address. Please try again using the proper formatting.`,
          { ask: 'url' });

        }

      }

    }

  });

});


bot.on('ask.whatisit', msg => {

  getMode( msg.from.id, function( error, currentMode ){

    if ( currentMode == 10 ){

      if ( msg.text.startsWith('/') == true ) {

        if ( msg.text == '/back') {

          // It's a command but just let /back do its job.

        } else {

          return bot.sendMessage( msg.from.id, `That was a command.
          Please enter a description.`,
          { ask: 'whatisit' });

        }

      } else {

        let urlDescription = msg.text;

        if ( urlDescription.length > DESCRIPTION_MAX_LENGTH ) {

          return bot.sendMessage( msg.from.id, `Your description is longer than
          140 charcters. Please shorten it.`,
          { ask: 'whatisit' });

        } else if ( urlDescription.length <= DESCRIPTION_MAX_LENGTH ) {

          pool.getConnection( function (err, connection){

            connection.query( 'SELECT temp_user_data FROM accounts WHERE owner ='
            + msg.from.id,
            function( error, urlSubmission ){

              if ( error ) throw error;

              let content = (
                [ urlSubmission[0].temp_user_data,
                urlDescription ] ).toString();

              console.log(content);

              connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner = ?',
              [ content , msg.from.id ],
              function( error, confirmedContent ){

                if ( error ) throw error;

                connection.release();

                setMode( msg.from.id, 11 );

                return bot.sendMessage(
                  msg.from.id, `Please review your submission!
                  \n${ urlDescription } ${ urlSubmission[0].temp_user_data } \n
                  \nIs the content correct? \n/yes or /no` );

              });

            });

          });

        }

      }

    }

  });

});


// The gift based economy, where everyone sees themselves in the face of the other.

bot.on( GIFT_ECON, msg => {

    getMode( msg.from.id, function( error, currentMode ){

      if ( currentMode == 1 ){ // If we are in get mode...

        let markup = bot.keyboard([
          [ BACK_BUTTON ]], { resize: true }
        );

        setMode( msg.from.id, 3 ); // Set to get/gift

        GetGiftsContent( msg.from.id, function( error, content ){

          return bot.sendMessage(
            msg.from.id,
            `${ content }`
            , { markup } );

        });

      } else if ( currentMode == 4 ) { // If we are in spend mode...

        let markup = bot.keyboard([
          [ GIFT_FOUNTAIN ], [ GIFT_RANDOM ] ], { resize: true }
        );

        return bot.sendMessage(
          msg.from.id,
          `Give Warhols to everybody with the Warhols /fountain
          \nGive Warhols to a person at /random`,
          { markup });

      }

    });

});



bot.on( [ GIFT_RANDOM, GIFT_FOUNTAIN ], msg => {

  let markup = bot.keyboard([

  [ BACK_BUTTON ]], { resize: true }

  );

  // Ask the user how many Warhols they want to spend.

  getMode( msg.from.id, function( error, currentMode ){

    if ( currentMode == 4 ) { // Make sure they are in spend mode.

      if ( msg.text == '/random' ) {

        setMode( msg.from.id, 6 );

      } else if ( msg.text == '/fountain' ) {

        setMode( msg.from.id, 7 );

      }

      return bot.sendMessage(
        msg.from.id,
        `How many Warhols do you want to give? \n
        /5 \n /10 \n /20`,
        { markup } );

    }

  });

});



// The speculative economy, where everyone loses their shirt except for the socipaths.


bot.on( SPECULATIVE_ECON , msg => {

// first check if user exists
doesUserExist( msg.from.id, function(error, doThey){



if ( doThey == true ){

  setMode( msg.from.id, 13 ); // Entering speculation mode.

    betDate = new Date(); // this will be the time of their bet if they place one
    //console.log('betDate - ', betDate);

    pool.getConnection(function(err, connection) {

      connection.query( 'UPDATE accounts SET pre_bet1 = ? WHERE owner = ?',
      [ betDate, msg.from.id ],
      function( error, flavorChoice ){

        connection.release();

        if ( error ) throw error;

      });

    });

    // to do: check if user has enough balance, if not ask to choose other value


    let markup = bot.keyboard([

      [SPEC_FLAVOR_1 , SPEC_FLAVOR_2 , SPEC_FLAVOR_3],[ BACK_BUTTON ]],
      { resize: true }

    );

    pool.getConnection(function(err, connection) {
      // new connection to retrieve next market closure dates
      connection.query( 'SELECT close_time, id FROM market WHERE event = ?',
      [eventName],
      function (error, results, fields) {

        if (error) throw error;

        var currentDate = new Date();

        var i = 0;

        for (i = 0; i < results.length; i++) {

          marketClosureId = results[i].id;

          // console.log('marketClosureId - ', marketClosureId);

          var dateDifference = (results[i].close_time-currentDate);
          var timetoClosing = timeConversion(dateDifference);

          // choose the first date at least 10 minutes in the future
          if (dateDifference > 600000) { break; }

        }

        return bot.sendMessage(
          msg.from.id,
          `The Warhols exchange market will close in ` + timetoClosing + `.
          In which flavor would you like to invest?
          \n\n `+ SPEC_FLAVOR_1 +`
          Warhols \n `+
           SPEC_FLAVOR_2 +`
           Warhols \n `+
           SPEC_FLAVOR_3 +
           ` Warhols`,
           { markup } );

        });

        // end retrieving market closure dates

      });

    }

  }); // end of check if user exists

}); // end of speculation econ


// assign marketFlavor variable according to the choice of flavor by the user

bot.on( [ SPEC_FLAVOR_1, SPEC_FLAVOR_2, SPEC_FLAVOR_3 ], msg => {

  // if mode is speculation
  getMode( msg.from.id, function( error, currentMode ){

  if ( currentMode == 13 | currentMode == 12 ) {

    let markup = bot.keyboard([

    [ BACK_BUTTON ]], { resize: true }

  );

    pool.getConnection(function(err, connection){

      if ( msg.text == SPEC_FLAVOR_1 ) {

        connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner = ?',
        [ 1, msg.from.id ],
        function( error, flavorChoice ){

          connection.release();

          if ( error ) throw error;

          // console.log(msg.text);

        });

      } else if ( msg.text == SPEC_FLAVOR_2 ) {

        connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner = ?',
        [ 2, msg.from.id ],
        function( error, flavorChoice ){

          connection.release();

          // console.log(msg.text);

          if ( error ) throw error;

        });

      } else if ( msg.text == SPEC_FLAVOR_3 ) {

        connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner = ?',
        [ 3, msg.from.id ],
        function( error, flavorChoice ){

        connection.release();

        if ( error ) throw error;

        // console.log(msg.text);

      });

    }

  });

    setMode( msg.from.id, 12 );

      let flavorName = msg.text.substr(1);

      return bot.sendMessage(
        msg.from.id,
        `How many shares of ` + flavorName + ` Warhols you want to buy? \n\n
        /5 \n /10 \n /20 \n /50 \n /100`,
        { markup });

    }

  });

});


// '/*' listens for any activity entered by the user and then
// filters out the resulting strings. Checks the mode that
// the user is in to determine how to react to the numbers we are listening for.

bot.on( '/*' , msg => {

  let markup = bot.keyboard([
    [ BACK_BUTTON ]], { resize: true }
  );

  if ( msg.text.startsWith('/') == true ) {

    // first test for coupon or start command
    // since it's ok to activate even without user having an account

    if ( msg.text == '/coupon' | msg.text == '/start') {

      // just let /coupon do its job.

    } else {

    doesUserExist( msg.from.id, function(error, doThey){



    if ( doThey == false ){

      return bot.sendMessage( msg.from.id, `You don't have an account yet. /start to create one.`);

    }

    else {


    if ( msg.text == '/back') {

      // It's a command but just let /back do its job.

    } else {

      getMode( msg.from.id, function( error, currentMode ){ // Entering get mode.

        if ( currentMode == 2 ) { // In get/creative mode.

          // Extract the number value from the user input
          // Make sure that what the text is only a number.
          let taskNumber = Number( ( (msg.text).slice( 1, 2 ) ) );

          if ( isNaN( taskNumber ) ){

            // Do nothing.

          } else {

            DisplayCreativeContent( msg.from.id, taskNumber, markup );

          }

        } else if ( currentMode == 3 ){ // In get/gift mode.

          let taskNumber = Number( ( ( msg.text ).slice( 1, 2 ) ) );

          if ( isNaN( taskNumber ) ){

            // Do nothing.

          } else {

            DisplayGiftContent( msg.from.id, taskNumber, markup );

          }

        } else if ( currentMode == 6 ) { // Make sure we are in spend/gift/random mode.

          // Read from the second character in the message string.
          let warholAmount = Number( ( ( msg.text ).slice( 1, 3 ) ) );

          if ( isNaN( warholAmount ) ){

            // Do nothing.

          } else {

            // Check if the amount they have selected does not exceed the amount available in their account.
            GetBalance( msg.from.id, function( error, userBalance ){

              if ( userBalance < warholAmount ){

                return bot.sendMessage( msg.from.id, `You do not have enough warhols. Please choose a smaller amount or /get more warhols.`);

              } else if ( userBalance >= warholAmount ){

                GiveWarholsRandom( msg.from.id, warholAmount, markup );

              }

            });

          }

        } else if ( currentMode == 7 ){ // Make sure they are in spend/gift/fountain.

          // Read from the second character in the message string.
          let warholAmount = Number( ( ( msg.text ).slice( 1, 3 ) ) );

          if ( isNaN( warholAmount ) ){

            // Do nothing.

          } else {

            // Check if the amount they have selected does not exceed the amount available in their account.
            GetBalance( msg.from.id, function( error, userBalance ){

              if ( userBalance < warholAmount ){

                return bot.sendMessage( msg.from.id, `You do not have enough warhols. Please choose a smaller amount or /get more warhols.`);

              } else if ( userBalance >= warholAmount ){

                ShareTheWealth( msg.from.id, warholAmount );

              }

            });

          }

        } else if ( currentMode == 12 ){ // Make sure we are in speculation mode.

          let betAmount = Number( ( ( msg.text ).slice( 1, 4 ) ) );

          if( isNaN( betAmount ) ){  // if user types a command that is not a number, this can cause a bug, so betAmount must not be NaN.

            betAmount = 5;

          } else {

          // check if user has enough balance, if not ask to choose other value

          GetBalance( msg.from.id, function( error, result ){

          // Check what the balance is...
            if ( result < betAmount ) {

              return bot.sendMessage( msg.from.id, `You currently have only ${ result } Warhols. Please start with a lower investment.`);

            } else {   // Continue with the investment.

              // console.log('they have enough Warhols - ', result);

              // write to market bets database: user id, user name, flavor, amount, time bet placed

              let currentDate = new Date();

              if (typeof msg.from.last_name != "undefined"){ // if the user does not have a last name

                let betOwner = (msg.from.first_name +' '+ msg.from.last_name);

              } else {

                let betOwner = (msg.from.first_name);

              }

              pool.getConnection(function(err, connection) {

                // SELECT viewed FROM gifts WHERE task_id =' + currentGiftSelection[0] , function( error, timesViewed ){

                connection.query( 'SELECT temp_user_data FROM accounts WHERE owner=' + msg.from.id, function( error, result ){

                  if( error ) throw error;

                  let flavorChoice = result[0].temp_user_data;

                  console.log (flavorChoice);

                  let newBet = { time: betDate, event: eventName, market_id: marketClosureId, user: msg.from.id, name: msg.from.first_name, flavor: flavorChoice, amount: betAmount, credited: 0 };

                  connection.query('INSERT INTO market_bets SET ?', newBet, function( error, result ){

                    connection.release();

                    if( error ) throw error;

                  });

                });

              });

            }
            // deduct warhols from users account

            SubtractWarhols( msg.from.id, betAmount );
            setLastDate( msg.from.id ); // set last interaction date

            // send message with thanks, display home menu

            let markup = bot.keyboard([
              [ GET_BUTTON ],[ SPEND_BUTTON ],[ BALANCE_BUTTON ]], { resize: true }
            );

            setMode( msg.from.id, 0);

            return bot.sendMessage( msg.from.id, `Thanks for your investment! Check you balance again after the market closes. Good luck!`, { markup } );

          }); // end if balance enough

        }

        }

      });

    }

   }
   });  // end of checking if user exists

  }  // end of checking for /coupon or /start

  }  // end of checking for / commands

});


// currentList[0].temp_user_data.split(",");

// These two are only relevant for the end routine of a user who has chosen to earn Warhols through the gift economy.
// I could do an overall better implementation of this but for now I am just trying to get this project done. I am sure you understand how deadlines work.

bot.on( YES_BUTTON, msg => {

    getMode( msg.from.id, function( error, currentMode ){

      if ( currentMode == 8 ){ // Verify that they are in gift mode.

        let markup = bot.keyboard([
          [ BACK_BUTTON ]], { resize: true }
        );

        var warholValue = (Math.ceil( Math.random() * RAND_GIFT_RANGE ) + 1 );

        GetBalance( msg.from.id, function( error, result ){

          let newBalance;

          newBalance = ( warholValue + result );

          AddWarhols( msg.from.id, newBalance );

        });

        pool.getConnection(function(err, connection) {

          connection.query( 'SELECT temp_user_data FROM accounts WHERE owner =' + msg.from.id, function( error, selectedGift ){

            // let temp = Number( selectedGift[0].temp_user_data );

            connection.query( 'SELECT viewed FROM gifts WHERE task_id =' + selectedGift[0].temp_user_data, function( error, timesViewed ){

              if ( error ) throw error;

              let viewedIncrement = ( ( timesViewed[0].viewed ) + 1 );

              connection.query( 'UPDATE gifts SET viewed = ? WHERE task_id = ?', [ viewedIncrement, selectedGift[0].temp_user_data ], function( error, viewResult ){

                connection.release();

                if ( error ) throw error;

                resetRemoteData( msg.from.id );
                setMode( msg.from.id, 0 );

              });

            });

          });

        });

        return bot.sendMessage( msg.from.id, `Enjoy! Your account has been credited with ${ warholValue } Warhols`, { markup });

      } else if ( currentMode == 11 ) { // Verify that they are in spend/creative mode.

        let markup = bot.keyboard([
          [ BACK_BUTTON ]], { resize: true }
        );

        pool.getConnection(function(err, connection){

          connection.query( 'SELECT temp_user_data FROM accounts WHERE owner =' + msg.from.id, function( error, content ){

            connection.release();

            if ( error ) throw error;

            content = content[0].temp_user_data.split(",");

            // Add the submitted content to the database.
            AddCreativeContent( msg.from.id, msg.from.first_name, content );

            // Subtract Warhols from the account of the user.
            SubtractWarhols( msg.from.id, 10 );

            // Post to WarholsChannel New Content
            if ( typeof msg.from.last_name != "undefined" ){ // if the user does not have a last name

              var contentName = ( msg.from.first_name+' '+ msg.from.last_name );

            } else {

              var contentName = ( msg.from.first_name );

            }

            if ( typeof msg.from.username != "undefined" ){ // if the user does not have a username

              var contentUser = ( ' - @' + msg.from.username );

            } else  {

              var contentUser = (' ');

            }

            requestify.post('https://maker.ifttt.com/trigger/new_content/with/key/' + custom_data[5] , { // IFTTT secret key.

              value1: ( contentName + contentUser ) , // telegram user.
              value2: content[1] , // content title.
              value3: content[0] // content URL.

            })

            .then( function( response ) {

            // Get the response and write to console
            response.body;
            // console.log('IFTTT: ' + response.body);

          }); // End of WarholsChannel content posting routine.

          resetRemoteData( msg.from.id );
          setMode( msg.from.id, 0 );

          return bot.sendMessage( msg.from.id, `Excellent! Your content is now available for viewing and 10 Warhols have been subtracted from your account.`, { markup });

        });

      });

    }

  });

});

bot.on( NO_BUTTON, msg => {

  getMode( msg.from.id, function( error, currentMode ){

    if ( currentMode == 8 ){

      let markup = bot.keyboard([
        [ BACK_BUTTON ],[ GET_BUTTON ]], { resize: true }
      );

      resetRemoteData( msg.from.id );
      setMode( msg.from.id, 0 );

      return bot.sendMessage( msg.from.id, `Perhaps there is another good deed you are willing to perform instead? \n/get more gift suggestions or go /back to the main menu.`, { markup } );

    } else if ( currentMode == 11 ){ // Verify that they are in spend mode.

      resetRemoteData( msg.from.id );
      setMode( msg.from.id, 9);
      return bot.sendMessage( msg.from.id, `Enter the URL for the content.` , { ask: 'url'} );

    }

  });

});

// Last Interaction test command
/*
bot.on('/last', msg => {
  // Update database date_last column with current date timestamp.
  setLastDate( msg.from.id );
});

// Date comparison test command

bot.on('/date', msg => {
  // Compare current date and /last date.
  DateCompare ( msg.from.id );

});
*/



/* * * FUNCTIONS * * */

// Adds Warhols to a user account

function AddWarhols( userID, addedBalance ){

  pool.getConnection(function(err, connection) {

    connection.query( 'UPDATE accounts SET balance = ? WHERE owner = ?', [ addedBalance, userID ], function( error, current ){

      connection.release();

      if ( error ) throw error;

    });

  });

}


// Subtracts Warhols from a users account. Need to re-write function so that it does not call GetBalance within it.
// Have it just receive the value it needs to send to the database.

function SubtractWarhols( userID, subtractionAmount ){

    GetBalance( userID, function( error, result ){ // Get the current balance on the account of the user.

      let newBalance = ( result - subtractionAmount );

      pool.getConnection(function(err, connection) {

        connection.query( 'UPDATE accounts SET balance = ? WHERE owner =?', [ newBalance, userID ], function( error, current ){

          connection.release();

          if ( error ) throw error;

          // console.log('Changed ' + current.changedRows + ' rows');

      });

    });

  });

}



// Gets the current balance of a user account

function GetBalance( msgID, callback ){

  pool.getConnection(function(err, connection) {

    connection.query('SELECT balance FROM accounts WHERE owner =' + msgID , function( error, result ){

        connection.release();

        if ( error ) return error;

        return callback( error, result[0].balance );

    });

  });

}


function GetFountainBalance( callback ){

  pool.getConnection(function(err, connection) {

    connection.query('SELECT reservoir FROM fountain WHERE id =' + 1, function( error, result ){

      connection.release();

      if ( error ) return error;

      return callback( error, result[0].reservoir );

    });

  });

}



function AddToFountain( contribution ){

  pool.getConnection(function(err, connection) {

    connection.query('UPDATE fountain SET reservoir = ? WHERE id =?', [ contribution, 1 ], function( error, current ){

      connection.release();

      if ( error ) throw error;

    });

  });

}


function GiveWarholsRandom( userID, warholAmount, markup ){

    pool.getConnection(function(err, connection) {

      connection.query( 'SELECT * FROM accounts', function( error, users ){

        connection.release();

        if( error ) throw error;

        // Choose one user at random.

        // But first we have to make sure that the current user is not
        // accidentally giving themselves Warhols.

        let theOthers = [];

        for( let i = 0; i < users.length; i++ ){

          if ( users[i].owner != userID ){

            theOthers.push(users[i].owner);

          }

        }

        var randomUser = ( Math.ceil( Math.random() * theOthers.length ) - 1 );

        GetBalance( users[ randomUser ].owner, function( error, theirBalance ){

          let theirNewBalance = ( theirBalance + warholAmount );

          AddWarhols( users[ randomUser ].owner, theirNewBalance );

          SubtractWarhols( userID, warholAmount );

        });

        setMode( userID, 0 );

        return bot.sendMessage( userID, `Thank you for your gift! Your Warhols have been anonymously sent to a random person.`, { markup });

    });

  });

}


function ShareTheWealth( userID, fountainContribution ){

  let markup = bot.keyboard([
    [ BACK_BUTTON ]], { resize: true }
  );

  GetFountainBalance( function( error, fountainBalance ){

    // Add the new contribution of warhols to the current reservoir balance including the multiplier.
    let newReservoirBalance = ( fountainBalance + ( fountainContribution * GIFT_MULTIPLYER ) ) ;

    // Send the newly calculated value to the reservoir.
    AddToFountain( newReservoirBalance );

    // Subtract the contribution of the warhols from the user account.
    SubtractWarhols( userID, fountainContribution );

    pool.getConnection(function(err, connection) {

    // Find out how many warhols users there are.
      connection.query( 'SELECT * FROM accounts', function( error, howmanyusers ){

        if( error ) throw error;

        // Check if the reservoir is full enough for a distrobution of warhols to all the users.
        if ( newReservoirBalance >= ( ( MIN_DISTRO * howmanyusers.length ) ) ){

          connection.query( 'SELECT * FROM accounts', function( error, members ){

            connection.release();

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

              console.log('Fountain activated');

              // Requestify code here

              requestify.post('https://maker.ifttt.com/trigger/new_fountain/with/key/' + custom_data[5] , { // IFTTT secret key.

              value1: distroAmount

              })

              .then( function( response ) {

              // Get the response and write to console
              response.body;
              // console.log('IFTTT: ' + response.body);

            });

            setMode( userID, 0 );

            return bot.sendMessage( userID, `Much generosity activated the Warhols Fountain! Everyone will receive ${ distroAmount } Warhols :D`, { markup });

          });


        } else {

          console.log('Fountain received new funds');

          setMode( userID, 0 );

          return bot.sendMessage( userID, `Thanks for your gift! The Warhols will go to the fountain reservoir and will overflow into everybody’s account soon.`, { markup });

        }

      });

    });

  });

}


function SubtractFromFountain( amount, members, currentBalance ){

  // Multiply the amount of members with the amount each member received.
  let resetBalance = ( amount * members );

  makeFountainHistory( amount, resetBalance );

  // Subtract the total amount awarded from the reservoir account.
  resetBalance = ( currentBalance - resetBalance );

  // Update the reservoir.

  pool.getConnection(function(err, connection) {

    connection.query('UPDATE fountain SET reservoir = ? WHERE id =?', [ resetBalance, 1 ], function( error, current ){

      connection.release();

      if ( error ) throw error;

    });

  });

}


// Selects five random entries from the creative content for the user to choose from.

function GetCreativeContent( userID, callback ){

  pool.getConnection( function( err, connection ){

    connection.query('SELECT * FROM tasks', function( error, rows ){

      if ( error ) throw error;

      let randomCreativeSelection = [];
      let taskListDisplay = 'Here is some awesome content created by the Warhols users. Choose one to view to get a reward of 2 Warhols: \n \n';
      let contentSelector;
      let actualTaskID;

      // Randomly select 5 items from the table.
      while( randomCreativeSelection.length < MAX_LIST_DISPLAY ){
        // Set up the numbers usig minus 1 so that the numbers will read the list properly.
        let randNum = (Math.ceil( Math.random() * rows.length ) -1 );

        if( randomCreativeSelection.indexOf( randNum ) > -1 ) continue;

        randomCreativeSelection[ randomCreativeSelection.length ] = randNum;

      }

      // 'UPDATE accounts SET mode = ? WHERE owner =?', [ newMode, userID ], function( error, updatedMode ){

      console.log(randomCreativeSelection);

      let temp = randomCreativeSelection.toString(); // Convert the temporary array into a string so we can save it on the database.

      connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner =?', [ temp, userID ], function( error, listCurrent ){

        connection.release();

        if ( error ) throw error;

        // Prepare all of the tasks for display.
        // Keep track of which items were selected inside currentCreativeSelection as an array.

      });

      for ( let i = 0; i < ( randomCreativeSelection.length ) ; i++) {

          taskListDisplay += '/' + ( i + 1 ) + ' ';
          contentSelector = randomCreativeSelection[i];
          actualTaskID = rows[ contentSelector ].task_id;
          taskListDisplay += rows[ contentSelector ].description;
          taskListDisplay += '\n \n';

      }

      return callback( error, taskListDisplay );

      });

  });

}


// Selects five random items from the gifts for users to choose from.
// Function is called when the user selects '/gift' in '/get' mode (3).

function GetGiftsContent( userID, callback ){

  pool.getConnection(function(err, connection) {

    // Retrieve the list of gifts available from the gifts table.
    connection.query('SELECT * FROM gifts', function( error, gifts ){

      if ( error ) throw error;

      let randomGiftSelection = [];
      let giftListDisplay = 'Perform an act of kindness to pay forward for your Warhols. You will get rewarded a random amount by the gods of gratitude. \n \n';

      // Randomly select 5 items from the gifts table.
      while( randomGiftSelection.length < MAX_LIST_DISPLAY ){

        let randNum = ( Math.ceil( Math.random() * gifts.length ) );

        if( randomGiftSelection.indexOf( randNum ) > -1 ) continue; // Makes sure that the random number selected does not already exist in the list.

        randomGiftSelection[ randomGiftSelection.length ] = randNum;

      }

      // Prepare all of the tasks for display.
      // Keep track of which items were selected inside currentCreativeSelection as an array.

      console.log( randomGiftSelection );

      let temp = randomGiftSelection.toString(); // Convert the temporary array into a string so we can save it on the database.

      connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner =?', [ temp, userID ], function( error, listCurrent ){

        connection.release();

        if ( error ) throw error;

        // Prepare all of the tasks for display.
        // Keep track of which items were selected inside currentCreativeSelection as an array.

      });

      for ( let i = 0; i < ( randomGiftSelection.length ) ; i++ ) {

        giftListDisplay += '/' + ( i + 1 ) + ' '; // The number the user will select

        giftListDisplay += gifts[ ( randomGiftSelection[i] - 1 ) ].description; // The description of the gift

        giftListDisplay += '\n \n'; // Spaces for the string for the next line

      }

      return callback ( error, giftListDisplay );

    });

  });

}


// Adds creative content submitted by the user.
function AddCreativeContent( userID, userName, newContent ){

  let currentTDS = new Date();

  let loadContent = { owner: userID, owner_name: userName, description: newContent[1] , url: newContent[0], price: 2, date_created: currentTDS };

  pool.getConnection(function(err, connection) {

    connection.query('INSERT into tasks SET ?', loadContent, function( error, result ){

      connection.release();

      if( error ) throw error;

    });

  });

}


function DisplayCreativeContent( userID, taskNumber, markup ){

  // Read the creative table so we can extract the content associated with
  // the content description chosen by the user.

  pool.getConnection( function( err, connection ) {

    connection.query( 'SELECT * FROM tasks', function( error, creativeContent ){

      if ( error ) throw error;

      // Make sure that the number they have entered is either 1 or 5. If not, just act dumb and don't do anything.
      if ( taskNumber >= 1 && taskNumber <= 5 ) {

        // Retrieve the corresponding item number from the random selection made when the user selected the /creative option.
        // We use minus 1 to offset the reading of the array.
        connection.query( 'SELECT temp_user_data FROM accounts WHERE owner =' + userID, function( error, currentList ){

          let temp = currentList[0].temp_user_data.split(","); //
          console.log( Number( temp[0] ) );

          let contentSelector = Number(temp[ ( taskNumber - 1 ) ]);

          let taskID = creativeContent[ contentSelector ].task_id; // The id of the content in the database table.
          let taskURL = creativeContent[ contentSelector ].url; // Content address.
          let warholValue = creativeContent[ contentSelector ].price; // Content price, as in how many Warhols are earned by watching this media.

          let viewedIncrement = ( ( creativeContent[ contentSelector ].viewed ) + 1 ); // Update how many times the chosen content has been viewed.

          connection.query('UPDATE tasks SET viewed = ? WHERE task_id = ?', [ viewedIncrement , taskID ] , function( error, viewResult ){

            connection.release();

            if (error) throw error;

          });

          GetBalance( userID, function(error, result){ // Function talks to database and requires a callback.

            let newBalance = ( warholValue + result );

            AddWarhols( userID, newBalance ); // Function talks to database but does not require a callback.

            return bot.sendMessage( userID, `Here's the link to view the content you selected: \n${ taskURL }\n\nEnjoy!`, { markup });

          });

          setMode( userID, 0 );
          resetRemoteData( userID );

        });

      }

    });

    // Reset the random list to nothing so that if someone decides to use a command with a number nothing will happen.
    // currentCreativeSelection = []

  });

}


function DisplayGiftContent( userID, giftNumber, markup ){

  pool.getConnection(function(err, connection) {

    connection.query('SELECT * FROM gifts', function( error, giftContent ){

      if ( error ) throw error;

      // Make sure that the number they have entered is either 1 or 5. If not, just act dumb and don't do anything.
      if ( giftNumber >= 1 && giftNumber <= 5 ) {

        connection.query( 'SELECT temp_user_data FROM accounts WHERE owner =' + userID, function( error, currentList ){

          let temp = currentList[0].temp_user_data.split(","); // Convert the array of numbers in strings into an array.

          let contentSelector = Number(temp[ ( giftNumber - 1 ) ]); // Pad the number so we can use it to retreive the selection from the array.

          let giftDescription = giftContent[ ( contentSelector - 1 ) ].description; // Get the description of the gift.

          // Save the selection of the user in the temp_user_data field for the yes/no confirmation.
          connection.query( 'UPDATE accounts SET temp_user_data = ? WHERE owner = ?', [ contentSelector, userID ], function( error, selectionPending){

            setMode( userID, 8 );

            return bot.sendMessage( userID, `Will you ${ giftDescription }? \n\n/yes, I will. \n/no, thanks.`, { markup });

          });

        });

      }

    });

  });

}


// Update last interaction date

function setLastDate( userID ){

  var currentDate = new Date();

  pool.getConnection(function(err, connection) {

    connection.query( 'UPDATE accounts SET date_last = ? WHERE owner = ?', [ currentDate, userID ], function( error, current ){

    connection.release();

    if ( error ) throw error;

    });

  });

}


// Check for time since last interaction

function DateCompare( userID ){

    var currentDate = new Date();

    pool.getConnection(function(err, connection) {

    connection.query('SELECT date_last FROM accounts WHERE owner =' + userID , function( error, result ){

      connection.release();

      if ( error ) return error;

      var previousDate = result[0].date_last; // magical command to get one result into a variable

      var sincelastDate = Math.abs(currentDate-previousDate);  // difference in milliseconds

    });

  });

}



// Get last interaction date

function LastInteraction( userID, callback ){

  pool.getConnection(function(err, connection) {

    connection.query('SELECT date_last FROM accounts WHERE owner =' + userID , function( error, result ){

      connection.release();

      if ( error ) return error;

      return callback( error, result[0].date_last );

    });

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


// Records overflow of fountain, how much each user received, the total amount taken from the fountain and the date.

function makeFountainHistory( individual, grand ){

  let currentTDS = new Date();

  let loadContent = { amount_distro: individual, amount_total: grand, tds: currentTDS };

  pool.getConnection(function(err, connection) {

    connection.query('INSERT into fountain_history SET ?', loadContent, function( error, result ){

      connection.release();

      if( error ) throw error;

    });

  });

}

// Checks for new Market closures since bets placed

function newMarketActivity( userID, callback ){

      let marketActivityDisplay = 0;

      pool.getConnection(function(err, connection) {

      // Retrieve last market closure date
      connection.query('SELECT close_time, id, winner FROM market WHERE event = ?', [eventName], function (error, result, fields) {

        connection.release();

        if (error) throw error;

        var currentDate = new Date();
        var i = 0;

        for (i = 0; i < result.length; i++) {  // retrieve all market closures for this event

          if (currentDate > result[i].close_time) {   // check if any of dates are in the past

                lastMarketClosing = result[i].close_time;
                marketClosureId = result[i].id;
                var dateDifference = (currentDate-lastMarketClosing);
                marketWinners[i] = (result[i].winner + '' + result[i].id); // store pair of numbers (id + winning flavor) in array

                // console.log(marketWinners[i]);
                // console.log('closure ' + (i+1) + ': id ' + marketClosureId + ' - ' + timeConversion(dateDifference) + ' ago. Winner: ' + result[i].winner);
        }

        else { break; }

        }

      });

    // check if any bets by user
    connection.query('SELECT * FROM market_bets WHERE event = ? AND user = ?',[eventName, userID], function( error, result ){

        if ( error ) return error;

          var i = 0; // will count all bets by user
          var ii = 0; // will count bets not credited
          var iii = 0; // will count winning bets

          betCreditTotal = 0; // reset previous value of winnings
          var newMarketClosure = 0 ; // reset previous value of market closure

          for (i = 0; i < result.length; i++) {

              betInfo = (result[i].flavor + '' + result[i].market_id); // put together on a string closure id and flavor of bet

              // if bet has not closed yet do not process!

              // console.log(result[i].time + ' is bet date');
              // console.log(lastMarketClosing + ' is last closing date');

              if (result[i].time < lastMarketClosing) {

              if (result[i].credited == 0) { // check for any bets still not processed

                var credText = 'not credited yet' ;
                newMarketClosure = 1 ;
                ii++;

                if (marketWinners.indexOf(betInfo) === -1) {  // bet did not win - *sigh*
                    // console.log(betInfo + ' is NOT a winner');

                             // connection query to update credited field to 1 - bet processed!
                             connection.query( 'UPDATE market_bets SET credited = 1 WHERE user = ? AND market_id = ? AND flavor = ?', [ userID, betInfo.substring(1) , betInfo.substring(0, 1) ], function( error, current ){

                             if ( error ) throw error;

                             });

                }
                else {  // bet is a winner - YAY!
                    // console.log(betInfo + ' is a winner');

                    var betCredit = (result[i].amount * SPEC_MULTIPLIER) // multiply bet
                    betCreditTotal = (betCreditTotal+betCredit); // add value won on this bet with other winnings
                    iii++;
                    // console.log('betCredit: ' + betCredit);
                    // console.log('betCreditTotal: ' + betCreditTotal);
                    // console.log(betInfo.substring(0, 1)); // get back closure id from string
                    // console.log(betInfo.substring(1));  // get back bet flavor from string

                             // connection query to update credited field to 1 - bet processed!
                             connection.query( 'UPDATE market_bets SET credited = 1 WHERE user = ? AND market_id = ? AND flavor = ?', [ userID, betInfo.substring(1) , betInfo.substring(0, 1) ], function( error, current ){

                             if ( error ) throw error;

                             });

                }

              } else {

                var credText = 'already credited' ;

              }  // end check for any bets still not processed

            } else {

              var credText = 'not closed yet - do not process' ;

              }

          // console.log(result[i].name + ' bet ' + result[i].amount + ' Warhols on flavor ' + result[i].flavor + ' at market id ' + result[i].market_id + ' during event ' + result[i].event+ ' - ' + credText);

          }

          // console.log ('number of uncredited bets: ' + ii);
          // console.log ('winning bets: ' + iii);
          // console.log ('total winnings: ' + betCreditTotal);
          // console.log ('has market closed: ' + newMarketClosure);


        connection.query('SELECT balance FROM accounts WHERE owner =' + userID , function( error, result ){

          if ( error ) return error;

             var balance = result[0].balance;
             // console.log('current balance: ' + balance);

             var balancePlusBet = (balance + betCreditTotal);
             // console.log('new balance: ' + balancePlusBet);

             AddWarhols( userID, balancePlusBet ); // update users balance

            // return callback( error, result[0].balance );

             marketActivityDisplay = (' new balance after winnings: ' + balancePlusBet);
             // console.log('marketActivityDisplay1: ' + marketActivityDisplay);

             var newMarketNewBalance = [newMarketClosure, balancePlusBet];

             return callback( error, newMarketNewBalance );

        });

    });

  });

}

// Last line of code, all functions should be above here
bot.connect();
