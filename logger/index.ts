export function createLogger(type: string) {
	return (message: string, ...args: any[]) => {
		// eslint-disable-next-line no-console
		console.log(`${type}: ${message}`, ...args)
	}
}
