import Enum from './peers/enum/enum.js'
export const encodings = new Enum(['TWO_COMP', 'EXCESS', 'FLOATING'])
export const hexAlphabet = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

export let config = {
	noOverflows: false
}