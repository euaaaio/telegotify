export class SpotifyLimitError extends Error {
	public response: Response
	constructor(message: string, response: Response) {
		super(message)
		this.name = 'SpotifyLimitError'
		this.response = response
	}
}
