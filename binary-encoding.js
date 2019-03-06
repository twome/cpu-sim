/* eslint-env browser*/

import { config as cfg, encodings, hexAlphabet } from './config.js'

export let binToDec = (/*string*/bin, encoding)=>{
	// console.debug('TO DEC', this)
	let charactersDeep = 0
	let base10 = 0
	if (encoding === encodings.TWO_COMP){
		if (bin[0] === '1'){
			bin = negateTwosComplement(bin)
		}
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

export let binToHex = (/*string*/bin)=>{
	// console.debug('TO HEX', this)
	let hexString = ''
	if (bin.length % 4 !== 0) throw Error('toHex: bitstring not in multiple of 4 bits')
	while (bin.length > 0){
		let fourBits = bin.substr(0, 4)
		bin = bin.slice(4)
		let hexChar = hexAlphabet[binToDec(fourBits)]
		hexString = hexString + hexChar
	}
	return hexString
}


export let complementBit = char => char === '1' ? '0' : '1'
export let complementBitArr = arr => Array.from(arr).map(char => complementBit(char))
export let complementBitStr = str => complementBitArr(str).join('')
export let negateTwosComplement = str => { 
	let first1 = str.lastIndexOf('1')
	return complementBitStr(str.substr(0, first1)) + str.substr(first1, str.length - 1)
}

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

		// From right to left, exploit the modulo operation to keep finding x * 2^0 isolated from other bits
		let bits = ''
		while (integer > 0){
			let lsb = integer % 2 // Least significant bit is either 1 or 0 and we've subtracted all multiples of 2
			integer = (integer - lsb) / 2
			bits = new String(lsb) + bits
		}

		// Prepend non-significant 0 bits
		let zeroesToPrepend = Math.max(0, wordLength - 1 - bits.length)
		bits = '0'.repeat(zeroesToPrepend) + bits

		// Use a shortcut to get the negative two's complement, then add the sign bit
		if (isNegative){ 
			let bits = negateTwosComplement(bits)
			bits = '1' + bits
		} else {
			bits = '0' + bits
		}

		if (bits.length > wordLength) throw Error(`Final bit string required to represent integer ${givenInteger} is longer than word length.`)

		return bits
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