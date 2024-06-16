import { SpotifyApi } from '@spotify/web-api-ts-sdk'

import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '../env/index.js'
import { CustomResponseValidator } from './responseValidator.js'

export const spotify = SpotifyApi.withClientCredentials(
	SPOTIFY_CLIENT_ID,
	SPOTIFY_CLIENT_SECRET,
	[],
	{
		responseValidator: new CustomResponseValidator()
	}
)
