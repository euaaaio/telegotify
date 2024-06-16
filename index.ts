import cron from 'node-cron'
import TelegramBot from 'node-telegram-bot-api'

import { TELEGRAM_BOT_TOKEN } from './env/index.js'
import { createLogger } from './logger/index.js'
import { prisma } from './prisma/index.js'
import { SpotifyLimitError } from './spotify/errors.js'
import { extractPlaylistId, spotify } from './spotify/index.js'

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

let playlists = await prisma.chatPlaylist.findMany()
for (let { playlistId } of playlists) {
	// cron.schedule('* * * * * *', () => checkForNewTracks(playlistId))
	await checkForNewTracks(playlistId)
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
	const log = createLogger(`Playlist(${playlistId})`)

	try {
		log('Checking for new tracks')

		let playlistItems = await getPlaylistItems(playlistId)
		log(`Retrieved ${playlistItems.length} tracks from Spotify`)

		let savedItems = await prisma.playlistTrack.findMany({
			where: { playlistId },
			select: { trackId: true }
		})
		log(`Retrieved ${savedItems.length} tracks from database`)

		let savedItemsSet = new Set(savedItems.map(item => item.trackId))
		let newTracks = playlistItems.filter(trackId => !savedItemsSet.has(trackId))
		log(`Found ${newTracks.length} new tracks`)

		if (newTracks.length > 0) {
			for (let trackId of newTracks) {
				const logTrack = createLogger(`Playlist(${playlistId})/${trackId})`)

				logTrack('Saving new track')
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

				logTrack('Notifying users about new track')
				let chatPlaylists = await prisma.chatPlaylist.findMany({
					where: { playlistId }
				})

				logTrack(`Found ${chatPlaylists.length} chats with this playlist`)
				for (let chatPlaylist of chatPlaylists) {
					logTrack(`Sending notification to chat ${chatPlaylist.chatId}`)
					await bot.sendMessage(
						String(chatPlaylist.chatId),
						`New track added: https://open.spotify.com/track/${trackId}`
					)
						.catch(error => {
							// eslint-disable-next-line no-console
							console.error('Error sending message', error)
						})
				}
			}
		}
	} catch (error) {
		// error.response.headers.get('retry-after') → 62081
		// eslint-disable-next-line no-console
		console.error('Error retrieving playlist tracks', { error })
	}
}

async function getPlaylistItems(
	playlistId: string,
	list: string[] = [],
	offset = 0
): Promise<string[]> {
	let playlistTracks = await spotify.playlists.getPlaylistItems(
		playlistId,
		undefined,
		'items(track(id)),total,next',
		50,
		offset
	)
	list = [...list, ...playlistTracks.items.map(item => item.track.id)]
	offset = offset + 50
	return playlistTracks.next
		? getPlaylistItems(playlistId, list, offset)
		: [...new Set(list)]
}
