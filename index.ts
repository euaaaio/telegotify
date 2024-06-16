import TelegramBot from 'node-telegram-bot-api'

import { TELEGRAM_BOT_TOKEN } from './core'

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

let chatId: null | number = null

bot.onText(/\/start/, msg => {
	chatId = msg.chat.id
	bot.sendMessage(chatId, 'Welcome! Please send me a link to a public Spotify playlist.')
})
