/* eslint-env browser*/

import { config as cfg, encodings, hexAlphabet } from './config.js'

export let binToDec = (/*string*/bin, encoding)=>{
	// console.debug('TO DEC', this)
	let charactersDeep = 0
	let base10 = 0
	if (encoding === encodings.TWO_COMP){
		while (bin.length > 0){
			let lastChar = bin.substr(bin.length - 1, 1)
			bin = bin.substr(0, bin.length - 1)
			let denomination = Math.pow(2, charactersDeep)
			base10 = base10 + new Number(lastChar, 10) * denomination
			charactersDeep = charactersDeep + 1
		}
	}
	return base10
}

export let binToHex = (/*string*/bin, encoding)=>{
	// console.debug('TO HEX', this)
	let input = this.valueOf()
	let hexString = ''
	if (input.length % 4 !== 0) throw Error('toHex: bitstring not in multiple of 4 bits')
	while (input.length > 0){
		let fourBits = input.substr(0, 4)
		input = input.slice(4)
		let hexChar = hexAlphabet[binToDec(fourBits)]
		hexString = hexString + hexChar
	}
	return hexString
}


export let complementBit = char => char === '1' ? '0' : '1'
export let complementBitArr = arr => Array.from(arr).map(char => complementBit(char))
export let complementBitStr = str => complementBitArr(str).join('')

export let decToBin = (integer, encoding = encodings.TWO_COMP, wordLength = 8)=>{
	// console.debug('FROM DEC', integer)
	let givenInteger = integer
	let unsignedMax = Math.pow(2, wordLength)
	
	if (encoding === encodings.TWO_COMP){
		let isNegative = Math.sign(integer) === -1
		let signedMax = unsignedMax / 2 // Leave out 1 digit for sign
		
		if (cfg.noOverflows && integer > (signedMax / 2) - 1 ) throw Error('Exceeded maximum positive size')
		if (cfg.noOverflows && integer < -(signedMax / 2) ) throw Error('Exceeded maximum negative size')
		
		if (isNegative) integer = -integer

		// Spin the signed number into range
		integer = integer % signedMax

		let accumulator = ''
		while (integer > 0){
			let lsb = integer % 2 // Least significant bit is either 1 or 0 and we've subtracted all multiples of 2
			integer = (integer - lsb) / 2
			accumulator = new String(lsb) + accumulator
		}

		let beforeNegation = accumulator

		// Prepend non-significant 0 bits
		let zeroesToPrepend = Math.max(0, wordLength - 1 - accumulator.length)
		accumulator = '0'.repeat(zeroesToPrepend) + accumulator

		// Use a shortcut to get the negative two's complement, then add the sign bit
		if (isNegative){ 
			let first1 = accumulator.lastIndexOf('1')
			let negated = complementBitStr(accumulator.substr(0, first1)) + accumulator.substr(first1, accumulator.length - 1)
			accumulator = '1' + negated
		} else {
			accumulator = '0' + accumulator
		}

		if (accumulator.length > wordLength) throw Error(`Final bit string required to represent integer ${givenInteger} is longer than word length.`)

		console.debug('decToBin', givenInteger, beforeNegation, accumulator)

		return accumulator
	}
}



export let hexToBin = (hex)=>{
	// console.debug('FROM HEX', hex )
	if (!hex || hex.length <= 0 || hex.match(/[^abcdef1234567890]/)) throw Error('fromHex: includes non-hexadecimal characters')
	let accumulator = ''
	while (hex.length > 0){
		let hexChar = hex[0]
		hex = hex.slice(1)
		let decChar = hexAlphabet.indexOf(hexChar)
		accumulator = accumulator + decToBin(decChar, undefined, 4).valueOf() // Concat
	}
	return accumulator
}


window.hexToBin = hexToBin
window.decToBin = decToBin