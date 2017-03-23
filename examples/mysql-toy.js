// Connect to the warhols database

const mysql      = require('mysql');
const connection = mysql.createConnection({
  host     : 'mysql.coinspiration.org',
  user     : 'coinspiration',
  password : 'c01nspiration',
  database : 'warholsbot'
});

var newTask = { 
  owner: '38797379', 
  owner_name: "Ilan", 
  description: "Listen to and share a track from SoundCloud that has only been listened to once.", 
  price: 40, duration: 20 };

connection.connect(function(error){
  if(error){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
});

/*

connection.query(
  'DELETE FROM tasks WHERE task_id = ?',[16], function (err, result) {
    if (err) throw err;
    console.log('Deleted ' + result.affectedRows + ' rows');
  }
);

connection.query('INSERT INTO tasks SET ?', newTask, function( error, result ){
    
  if( error ) throw error;
    
  console.log('Last insert ID:', result.insertId);

});

connection.query('UPDATE accounts SET owner = ? Where acct_id = ?',['38797379', 2],function (error, result) {
    if (error) throw error;
    console.log('Changed ' + result.changedRows + ' rows');
  }
);



acct_id: 2,
owner: '38797379',
owner_name: 'Ilan',
date_created: 2015-08-04T22:00:00.000Z,
balance: 253,
tasks_created: '',
tasks_performed: '1, 2',
sponsor: 1 }


task_id: 10,
owner: '3879737',
owner_name: 'ilan',
description: 'Distribute 100 flyers in your neighborhood promoting the use of Telegram.',
url: 'http://telegram.org',
sponsored: 0,
sponsor_name: 'Telegram',
price: 200,
date_created: '0000-00-00',
duration: 500,
available: 5,
claimed_by: '',
confirmed: 0 }


*/