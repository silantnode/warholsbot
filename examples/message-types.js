'use strict';

const TeleBot = require('telebot');
const bot = new TeleBot('214012546:AAEAHZ04FXgPiSX1tqPzGfTZmHjUm0b8pTU');

// On every type of message (& command)
bot.on(['*', '/*'], (msg, self) => {
  let id = msg.from.id;
  let reply = msg.message_id;
  let type = self.type;
  let parse = 'html';
  return bot.sendMessage(
      /* use \r\n when you need to make a line break in node.js */
    id, `This is a <b>${ type }</b>\r\n message.`, { reply, parse }
  );
});

bot.connect();