/*
	These are the basic ALU operations on bit sequences (as strings)
*/

export const addTwoComp = ()=>{

}

export const addFloating = ()=>{

}

export const boolOr = () => {
	
}

export const boolAnd = () => {
	
}

export const boolXor = () => {
	
}

export const bitRotateRight = (bits, places) => {
	let moduloed = places % bits.length
	let cutPoint = bits.length - moduloed
	let charactersOffRightEdge = bits.substr(cutPoint)
	return charactersOffRightEdge + bits.substr(0, cutPoint)
}