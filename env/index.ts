import dotenv from 'dotenv'

dotenv.config()

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string
export const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID as string
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET as string
export const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN as string
