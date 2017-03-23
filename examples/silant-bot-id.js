'use strict';

// Initialize telebot

const TeleBot = require('telebot');
const bot = new TeleBot('307637270:AAHU2mHwhjH2RReL_kxCC2SruPFOb6A4QDc');

bot.on('/start', msg => {

    console.log(msg.from.id);

});

bot.connect();