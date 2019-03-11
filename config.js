import Enum from './peers/enum/enum.js'

// Static data
export const encodings = new Enum(['TWO_COMP', 'EXCESS', 'FLOAT', 'UINT8']) // Number encodings in binary
export const exitCodes = new Enum([
	{
		accessor: 0, // Program successfully completed on its own terms
		humanName: 'SUCCESS' 
	},{
		accessor: 1, // Interrupted before program could complete & exit
		humanName: 'INTERRUPTED' 
	}
])

export const hexAlphabet = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'] 

// User config
export let config = {
	allowOverflows: false,
	allowNoOps: true,
	verbose: 1,
	bootReboots: true
}