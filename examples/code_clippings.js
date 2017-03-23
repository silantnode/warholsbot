// Display custom keyboard

let markup = bot.keyboard([
    [bot.button('contact', 'Your contact'), bot.button('location', 'Your location')],
    ['/back', '/hide']
  ], { resize: true });

  return bot.sendMessage(msg.from.id, 'Button example.', { markup });

// On every text message

bot.on('text', msg => {
  let id = msg.from.id;
  let text = msg.text;
  return bot.sendMessage(id, `You said: ${ text }`);
});

con.query('SELECT * FROM employees',function(err,rows){
  if(err) throw err;

  console.log('Data received from Db:\n');
  console.log(rows);
});

/*

for (var i = 0; i < rows.length; i++){
  
  if (rows[i].owner == msg.from.id){
    
    return bot.sendMessage(msg.from.id, `Welcome back to Warholsbot ${ msg.from.username }. Use the buttons below to interact with the bot to get and spend warhols or check your balance and see what current tasks you have assigned to yourself.`, { markup });
    
    break

  } 
}

*/

      
connection.query('SELECT balance FROM accounts WHERE owner =' + msg.from.id , function(error, result){

  if (error) throw error;
  console.log( result[0].balance );

});