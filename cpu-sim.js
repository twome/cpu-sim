let peerDir = './peers'
import Enum from './peers/enum/enum.js'

// ALU registers
let regs = Array.from(Array(0x10)) // 16

// Program counter
let pc = null

// Instruction register
let ir = null

// Main memory
let mem = Array.from(Array(0x100)) // 256

let hexAlphabet = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

class Bitstring extends String {
	constructor(rawString = '', opt = {}){
		console.debug('BITSTRING CONSTRUCTOR: ', rawString)
		if (rawString.match(/[^01]/)) throw Error('Bitstring: input string must consist of the characters "0" or "1"')
		super(rawString)
		this.encoding = opt.encoding || Bitstring.encodings.TWO_COMP
		this.wordLength = opt.wordLength || 8
		this.floatingExponentLength = opt.floatingExponentLength || 3
	}

	toDec(){
		console.debug('%cTO DEC', 'background-color: green', this)
		let input = this.valueOf()
		let charactersDeep = 0
		let base10 = 0
		if (this.encoding === Bitstring.encodings.TWO_COMP){
			while (input.length > 0){
				console.debug('this', this.valueOf())
				let lastChar = input.substr(input.length - 1, 1)
				input = input.substr(0, input.length - 1)
				let denomination = Math.pow(2, charactersDeep)
				base10 = base10 + new Number(lastChar, 10) * denomination
				charactersDeep = charactersDeep + 1
			}
		}
		return base10
	}

	toHex(){
		console.debug('TO HEX', this)
		let input = this.valueOf()
		let hexString = ''
		if (input.length % 4 !== 0) throw Error('toHex: bitstring not in multiple of 4 bits')
		while (input.length > 0){
			let fourBits = input.substr(0, 4)
			input = input.slice(4)
			let hexChar = hexAlphabet[new Bitstring(fourBits).toDec()]
			hexString = hexString + hexChar
		}
		return hexString
	}

	static fromHex(hex){
		console.debug('%cFROM HEX', 'background-color: yellow;', hex )
		if (!hex || hex.length <= 0 || hex.match(/[^abcdef1234567890]/)) throw Error('fromHex: includes non-hexadecimal characters')
		let accumulator = ''
		while (hex.length > 0){
			let hexChar = hex[0]
			hex = hex.slice(1)
			let decChar = hexAlphabet.indexOf(hexChar)
			accumulator = accumulator + Bitstring.fromDec(decChar, undefined, 4).valueOf() // Concat
		}
		return new Bitstring(accumulator)
	}

	static fromDec(integer, encoding = Bitstring.encodings.TWO_COMP, wordLength = 8){
		console.debug('FROM DEC', integer)
		let givenInteger = integer
		if (Math.sign(integer) === -1) throw Error('negatives not implemented yet')
		if (encoding === Bitstring.encodings.TWO_COMP){
			let accumulator = ''
			while (integer >= 2){
				let mostSignificantBit = Math.floor(Math.log2(integer))
				let overlay = '1' + '0'.repeat(mostSignificantBit)
				accumulator = accumulator.substr(0, accumulator.length - mostSignificantBit - 1) + overlay // Add this amount to the bitstring
				integer = integer - Math.pow(2, mostSignificantBit) // Subtract that much from the decimal
			}
			if (integer === 1) accumulator = accumulator ? accumulator.replace(/0$/, '1') : '1'
			if (integer === 0) accumulator = accumulator ? accumulator : '0'
			if (accumulator.length > wordLength) throw Error(`Final bit string required to represent integer ${givenInteger} is longer than word length.`)
			let zeroesToPrepend = wordLength - accumulator.length
			return new Bitstring('0'.repeat(zeroesToPrepend) + accumulator, {
				encoding,
				wordLength
			})
		}
	}

	/*
		# 5
		biggest denomination = floor(5 / 2) * 2 = 4
		Math.log2(4)


	*/
}
Bitstring.encodings = new Enum(['TWO_COMP', 'EXCESS', 'FLOATING'])


class ControlUnit {
	constructor(){
		this.ops = [
			()=>{ throw Error('ControlUnit: tried to run empty opcode 0') },
			ControlUnit.loadAddress,
			ControlUnit.loadPattern,
			ControlUnit.storeReg,
			ControlUnit.moveRegister,
			ControlUnit.addTwoComp,
			ControlUnit.addFloating,
			ControlUnit.orBool,
			ControlUnit.andBool,
			ControlUnit.xorBool,
			ControlUnit.rotate,
			ControlUnit.jump,
			ControlUnit.halt
		]
	}

	fetchInstruction(address){
		// Fetch the PC instruction from main memory
		let instruction = mem[address.toDec()]
		
		// Place the instruction in the register, ready to decode
		ir = instruction

		// Increment program counter by the size of the retrieved instruction
		pc = Bitstring.fromDec((pc.toDec() + 2)) // TODO replace with binary addition
	}

	decodeInstruction(strHex){
		console.log('DECODE', strHex)
		if (strHex.length !== 4) throw Error('strhex must be 4 hex chars')
		let opcode = Number('0x' + strHex[0])
		let second = Bitstring.fromHex(strHex[1])
		let third = Bitstring.fromHex(strHex[2])
		let fourth = Bitstring.fromHex(strHex[3])
		let operation = this.ops[opcode]
		console.debug('DECODED: opcode, second, third, fourth', opcode, second, third, fourth)

		let argumentFormat
		if ([1, 2, 3, 11].includes(opcode)){ // RXY
			argumentFormat = [second, new Bitstring(third + fourth), null] // concatenated 16-bit mem address 
		} 
		if ([5, 6, 7, 8, 9].includes(opcode)){ // RST
			argumentFormat = [second, third, fourth] // all registers
		}
		if (opcode === 10) argumentFormat = [second, null, fourth] // R0X
		if (opcode === 4) argumentFormat = [null, third, fourth] // 0RS
		if (opcode === 12) argumentFormat = [null, null, null] // 000
		argumentFormat = argumentFormat.filter(val => val)
		console.debug('argumentFormat: ', argumentFormat)
		operation.apply(null, argumentFormat)
	}

	static loadAddress(regIndex, address){
		let pattern = mem[address.toDec()] + mem[address.toDec() + 1]
		regs[regIndex.toDec()] = pattern

		return {
			opcode: '1'
		}
	}

	static loadPattern(regIndex, pattern){
		console.info('LOAD PATTERN', regIndex.toHex(), pattern.toHex())
		regs[regIndex.toDec()] = pattern

		return {
			opcode: '2'
		}
	}

	static storeReg(regIndex, address){
		mem[address.toDec()] = regs[regIndex.toDec()]

		return {
			opcode: '3'
		}
	}

	static moveRegister(regFrom, regTo) {
		regs[regTo.toDec()] = regs[regFrom.toDec()]

		return {
			opcode: '4'
		}
	}

	static addTwoComp(result, x, y) {
		reg[result] = binaryAdd(regs[x.toDec()], regs[y.toDec()])

		return {
			opcode: '5'
		}
	}

	static addFloating(result, x, y){


		return {
			opcode: '6'
		}
	}

	static orBool(result, x, y){


		return {
			opcode: '7'
		}
	}

	static andBool(result, x, y){


		return {
			opcode: '8'
		}
	}

	static xorBool(result, x, y){


		return {
			opcode: '9'
		}
	}

	// TODO how many notches
	static rotate(result, inputIndex){


		return {
			opcode: 'A'
		}
	}

	static jump(regToCheck, jumpTargetIndex){


		return {
			opcode: 'B'
		}
	}

	static halt(){


		return {
			opcode: 'C'
		}
	}

	dump(arr){
		let dumpString = arr.reduce((acc, val) => {
			acc = acc ? acc : ''
			return acc + val
		}) // Concat all bitstrings into one
		return dumpString
	}

	flush(arr, wordLength){
		arr = arr.map( val => new Bitstring('0'.repeat(wordLength), {wordLength}) )
		return arr
	}
}

window.Bitstring = Bitstring
window.cu = new ControlUnit()
window.bs = new Bitstring('10100011')
window.bs2 = new Bitstring('11111111')
// window.bst = new Bitstring('1010001a')

// Bitstring.fromHex('0')
// Bitstring.fromDec(0)

// cu.decodeInstruction('20ff')
// console.debug('reg0', regs[0])
regs = cu.flush(regs, 8)
cu.dump(regs)