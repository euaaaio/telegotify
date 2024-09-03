import type { IValidateResponses } from '@spotify/web-api-ts-sdk'

import { SpotifyLimitError } from './errors.js'

// the same as DefaultResponseValidator from @spotify/web-api-ts-sdk
export class CustomResponseValidator implements IValidateResponses {
	public async validateResponse(response: Response): Promise<void> {
		switch (response.status) {
		case 401: {
			throw new Error('Bad or expired token. This can happen if the user revoked a token or the access token has expired. You should re-authenticate the user.')
		}
		case 403: {
			const body = await response.text()
			throw new Error(`Bad OAuth request (wrong consumer key, bad nonce, expired timestamp...). Unfortunately, re-authenticating the user won't help here. Body: ${body}`)
		}
		case 429: {
			throw new SpotifyLimitError('The app has exceeded its rate limits.', response)
		}
		default: {
			if (!response.status.toString().startsWith('20')) {
				const body = await response.text()
				throw new Error(`Unrecognised response code: ${response.status} - ${response.statusText}. Body: ${body}`)
			}
		}
		}
	}
}
