import cron from 'node-cron'
import TelegramBot from 'node-telegram-bot-api'

import { TELEGRAM_BOT_TOKEN } from './env/index.js'
import { prisma } from './prisma/index.js'
import { extractPlaylistId, spotify } from './spotify/index.js'

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

let playlists = await prisma.chatPlaylist.findMany()
for (let { playlistId } of playlists) {
	cron.schedule('*/1 * * * *', () => checkForNewTracks(playlistId))
}

bot.onText(/\/start/, async msg => {
	let chatId = msg.chat.id
	await prisma.chat.upsert({
		where: { id: chatId },
		update: {},
		create: { id: chatId }
	})
	bot.sendMessage(chatId, 'Welcome! Please send me a link to a public Spotify playlist.')
})

bot.onText(/https:\/\/open.spotify.com\/playlist\/(.*)/, async (msg, match) => {
	let chatId = msg.chat.id
	let playlistUrl = msg.text
	if (!playlistUrl) {
		bot.sendMessage(chatId, 'Please send me a valid Spotify playlist URL.')
		return
	}
	let playlistId = extractPlaylistId(playlistUrl)
	if (!playlistId) {
		bot.sendMessage(chatId, 'Please send me a valid Spotify playlist URL.')
		return
	}

	bot.sendMessage(chatId, playlistId)
	bot.sendMessage(chatId, 'Processing your playlist. You will be notified when it is ready.')

	await prisma.playlist.upsert({
		where: { id: playlistId },
		update: {},
		create: { id: playlistId }
	})
	await prisma.chatPlaylist.upsert({
		where: { chatId_playlistId: { chatId, playlistId } },
		update: {},
		create: { chatId, playlistId }
	})

	let playlist = await spotify.playlists.getPlaylist(playlistId)
	let tracksList = [...(new Set(playlist.tracks.items.map(item => item.track.id)))]
	for (let trackId of tracksList) {
		await prisma.track.upsert({
			where: { id: trackId },
			update: {},
			create: { id: trackId }
		})
		await prisma.playlistTrack.upsert({
			where: { playlistId_trackId: { playlistId, trackId } },
			update: {},
			create: { playlistId, trackId }
		})
	}

	await prisma.chatPlaylist.upsert({
		where: { chatId_playlistId: { chatId, playlistId } },
		update: {},
		create: { chatId, playlistId }
	})

	bot.sendMessage(chatId, 'Your playlist is ready! You will be notified about new tracks.')

	cron.schedule('*/1 * * * *', () => checkForNewTracks(playlistId))
})

async function checkForNewTracks (playlistId: string) {
	try {
		let playlist = await spotify.playlists.getPlaylist(playlistId)
		let playlistTracksList = playlist.tracks.items.map(item => item.track.id)

		let existingTracks = await prisma.playlistTrack.findMany({
			where: { playlistId },
			select: { trackId: true }
		})
		let existingTrackList = new Set(existingTracks.map(track => track.trackId))
		let newTracks = playlistTracksList.filter(
			trackId => !existingTrackList.has(trackId)
		)

		if (newTracks.length > 0) {
			for (let trackId of newTracks) {
				await prisma.track.upsert({
					where: { id: trackId },
					update: {},
					create: { id: trackId }
				})
				await prisma.playlistTrack.upsert({
					where: { playlistId_trackId: { playlistId, trackId } },
					update: {},
					create: { playlistId, trackId }
				})

				let chatPlaylists = await prisma.chatPlaylist.findMany({
					where: { playlistId }
				})

				for (let chatPlaylist of chatPlaylists) {
					await bot.sendMessage(chatPlaylist.chatId, `New track added: https://open.spotify.com/track/${trackId}`)
				}
			}
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error retrieving playlist tracks', error)
	}
}
