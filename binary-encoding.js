import { config as cfg, encodings, hexAlphabet } from './config.js'

// TODO: is this correctly producing negatives?
// TODO this is completely broken
export let binToDec = (/*string*/bin, encoding = encodings.TWO_COMP)=>{
	let charactersDeep = 0
	let base10 = 0
	if (encoding === encodings.TWO_COMP){
		let isNegative
		if (bin[0] === '1'){
			isNegative = true
			bin = negateTwosComplement(bin)
		}
		while (bin.length > 0){
			let lastChar = bin.substr(bin.length - 1, 1)
			bin = bin.substr(0, bin.length - 1)
			let denomination = Math.pow(2, charactersDeep)
			base10 = base10 + new Number(lastChar, 10) * denomination
			charactersDeep = charactersDeep + 1
		}
		if (isNegative) base10 = -base10
	} else if (encoding === encodings.UINT8){
		// TODO: dedupe
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
	let hexString = ''
	if (bin.length % 4 !== 0) throw Error('toHex: bitstring not in multiple of 4 bits')
	while (bin.length > 0){
		let fourBits = bin.substr(0, 4)
		bin = bin.slice(4)
		let hexChar = hexAlphabet[binToDec(fourBits, encodings.UINT8)]
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

export let decToSimpleBin = dec => {
	// From right to left, exploit the modulo operation to keep finding (x * 2^0) isolated from other bits (x * 2^1 + x * 2^2 + etc.)
	let bits = ''
	while (dec > 0){
		let lsb = dec % 2 // Least significant bit is either 1 or 0 and we've subtracted all multiples of 2
		dec = (dec - lsb) / 2 // Move this bit's number value out of the decimal, then reduce all the powers of 2 by one
		bits = new String(lsb) + bits // Add this bit's number value into the binary
	}
	return bits
}

// TODO fix 4-bit uint translation
export let decToBin = (integer, encoding = encodings.TWO_COMP, wordLength = 8, allowOverflows = cfg.allowOverflows)=>{
	let givenInteger = integer
	let unsignedMax = Math.pow(2, wordLength)
	
	if (encoding === encodings.TWO_COMP){
		let inputNegative = Math.sign(integer) === -1
		let outputNegative = inputNegative
		let signedMax = unsignedMax / 2 // Leave out 1 digit for sign
		
		if (allowOverflows && integer > (signedMax / 2) - 1 ) throw Error('Exceeded maximum positive size')
		if (allowOverflows && integer < -(signedMax / 2) ) throw Error('Exceeded maximum negative size')
		
		// Spin the signed number into range
		// By feeding this function |integer| and then negating the value of fn(integer) [the y-axis], 
		let xAbs = Math.abs(integer) // Mirrors the resulting function around y-axis
		let sawtoothed = ((xAbs + signedMax) % unsignedMax) - signedMax // This is mirrored
		
		// Then we flip the negative half of fn(x) around the x-axis, so that it now aligns with a 
		// theoretical sawtooth
		if (Math.sign(sawtoothed) === -1) outputNegative = !outputNegative
		
		// Do the actual numeric format translation as if the number we have were positive
		let bits = decToSimpleBin(Math.abs(sawtoothed)) 

		if ( Math.abs(sawtoothed) === signedMax && bits[0] === '1' && [...bits].slice(1).every(val => val === '0') ){
			// 
			// By inputting -(max signed size + 1), decToSimpleBin already happens to return 100000...; the highest negative value (correct output), and doesn't need negating / prepending.
			return bits
		}

		// Prepend non-significant 0 bits
		// We subtract one from this to account for the sign bit
		let zeroesToPrepend = Math.max(0, wordLength - 1 - bits.length)
		bits = '0'.repeat(zeroesToPrepend) + bits

		// Use a shortcut to get the negative two's complement, then add the sign bit
		if (outputNegative){ 
			bits = negateTwosComplement(bits)
			bits = '1' + bits
		} else {
			bits = '0' + bits
		}

		if (bits.length > wordLength) throw Error(`Final bit string required to represent integer ${givenInteger} is longer than word length.`)

		return bits
	} else if (encoding === encodings.UINT8){
		// TODO: dedupe the different encoding algos
		let bits = decToSimpleBin(integer)

		// Prepend non-significant 0 bits
		let zeroesToPrepend = Math.max(0, wordLength - bits.length)
		bits = '0'.repeat(zeroesToPrepend) + bits

		if (bits.length > wordLength) throw Error(`Final bit string required to represent integer ${givenInteger} is longer than word length.`)

		return bits
	}
}

export let hexToBin = (hex)=>{
	if (typeof hex !== 'string') throw Error('hex must be a string')
	hex = hex.replace(/^0x/, '')
	if (!hex || hex.length <= 0 || hex.match(/[^abcdef1234567890]/)) throw Error('fromHex: includes non-hexadecimal characters')
	let accumulator = ''
	while (hex.length > 0){
		let hexChar = hex[0]
		hex = hex.slice(1)
		let decChar = hexAlphabet.indexOf(hexChar)
		let bin = decToBin(decChar, undefined, 4)
		accumulator = accumulator + bin.valueOf() // Concat
	}
	return accumulator
}

/* 
	This is a representation of a bit sequence in the form of a string - basically just to allow easier manipulation & checking.
*/
export class Bitstring extends String {
	constructor(/*string,number*/inputSequence = '', {
		encoding = Bitstring.encodings.TWO_COMP,
		wordLength = 8, // In bits
		floatingExponentLength = 3, // The rest of the float we'll fill with mantissa,
		allowOverflows = cfg.allowOverflows
	}={}){
		// Translate input strings
		if (typeof inputSequence === 'number'){
			inputSequence = decToBin(inputSequence, encoding, wordLength)
		} else if (inputSequence.match(/^0x/)){
			inputSequence = hexToBin(inputSequence)
		}
		if (inputSequence.match(/[^01]/)) throw Error('Bitstring: input string must consist of the characters "0" or "1"')

		super(inputSequence)
		Object.assign(this, {encoding, wordLength, floatingExponentLength}) // Bind options to instance	
	}

	toDec(encoding = this.encoding){
		return binToDec(this, encoding)
	}

	toHex(){
		return binToHex(this, this.encoding)
	}

	static fromHex(hex){
		return new Bitstring(hexToBin(hex))
	}

	static fromDec(integer, encoding = Bitstring.encodings.TWO_COMP, wordLength = 8){
		return new Bitstring(decToBin(integer, encoding, wordLength), {
			encoding, wordLength, 
			allowOverflows: this.allowOverflows
		})
	}
}
Bitstring.encodings = encodings