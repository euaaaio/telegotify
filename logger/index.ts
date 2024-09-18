import { nanoid } from 'nanoid'

export function createLogger(type: string) {
	const uid = nanoid(4)
	return (message: string, ...args: any[]) => {
		// eslint-disable-next-line no-console
		console.log(`[${uid}] ${type}: ${message}`, ...args)
	}
}
