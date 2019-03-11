/*
	These are the basic ALU operations on bit sequences (as strings)
*/

let boolToBinChar = bool => bool ? '1' : '0'

export const addTwoComp = (xStr, yStr, truncateTo = false)=>{
	let x = xStr.split(``).reverse() // LSB first
	let y = yStr.split(``).reverse()
	let results = []
	let carry = 0
	while (x.length > 0 || y.length > 0 || carry){
		let xBit = Number(x[0]) || 0 // A missing bit from just one party will turn into 0
		let yBit = Number(y[0]) || 0
		let sum = xBit + yBit + carry
		carry = 0
		let remainder = 0
		if (sum === 3){
			carry = 1
			remainder = 1
		} else if (sum === 2){
			carry = 1
		} else if (sum === 1){
			remainder = 1
		}
		results.push(remainder)
		x = x.slice(1)
		y = y.slice(1)
	}
	if (truncateTo) results = results.slice(0, truncateTo) // Cuts off most significant bits (still reversed)
	return results.reverse().join(``)
}

export const addFloating = ()=>{
	throw Error('unimplemented')
	// TODO
}

export const boolOr = (x, y) => {
	let longer = y.length > x.length ? y : x
	let resultArr = [...longer].map((val, i) => Number(x[i]) || Number(y[i]))
	return resultArr.join(``)
}

export const boolAnd = (x, y) => {
	let longer = y.length > x.length ? y : x
	let resultArr = [...longer].map((val, i) => Number(x[i]) && Number(y[i]))
	return resultArr.join(``)
}

export const boolXor = (x, y) => {
	let longer = y.length > x.length ? y : x
	let resultArr = [...longer].map((val, i) =>{
		let xBit = Number(x[i]), 
		    yBit = Number(y[i])
		let booled = (xBit || yBit) && !(xBit && yBit)
		return boolToBinChar(booled)
	}) 
	return resultArr.join(``)
}

export const bitRotateRight = (bits, places) => {
	let moduloed = places % bits.length
	let cutPoint = bits.length - moduloed
	let charactersOffRightEdge = bits.substr(cutPoint)
	return charactersOffRightEdge + bits.substr(0, cutPoint)
}