// Extracts playlist ID from URL
export function extractPlaylistId (url: string): null | string {
	try {
		let parsedUrl = new URL(url)
		let pathSegments = parsedUrl.pathname.split('/')
		return pathSegments.at(-1) ?? null
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Invalid URL', error)
		return null
	}
}
