import eslintConfigPostanu from '@postanu/eslint-config/ts'
import { defineFlatConfig } from 'eslint-define-config'

export default defineFlatConfig([
	...eslintConfigPostanu
])
