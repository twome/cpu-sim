let peerDir = './peers'
import Enum from './peers/enum/enum.js'

// ALU registers
let regs = Array.from(Array(0x10)) // 16

// Program counter
let pc = null

// Instruction register
let insReg = null

// Main memory
let mem = Array.from(Array(0x100)) // 256

let hexAlphabet = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

class Bitstring extends String {
	constructor(rawString = '', opt = {}){
		if (rawString.match(/[^01]/)) throw Error('Bitstring: input string must consist of the characters "0" or "1"')
		super(rawString)
		this.encoding = opt.encoding || Bitstring.encodings.TWO_COMP
		this.wordLength = opt.wordLength || 8
		this.floatingExponentLength = opt.floatingExponentLength || 3
	}

	toDec(){
		let input = this.valueOf()
		let charactersDeep = 0
		let base10 = 0
		if (encoding === Bitstring.encodings.TWO_COMP){
			while (input.length > 0){
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
		let input = this.valueOf()
		let hexString = ''
		if (input.length % 4 !== 0) throw Error('toHex: bitstring not in multiple of 4 bits')
		while (input.length > 0){
			let fourBits = input.substr(0, 4)
			input = input.slice(4)
			let hexChar = hexAlphabet[new Bitstring(fourBits).toDec]
			hexString = hexString + hexChar
		}
		return hexString
	}

	static fromHex(hex){
		if (!hex || hex.match(/[^abcdef1234567890]/)) throw Error('fromHex: includes non-hexadecimal characters')
		let accumulator = new Bitstring()
		while (hex.length > 0){
			console.debug(hex)
			let hexChar = hex[0] // TODO error is around here
			hex = hex.slice(1)
			console.debug(hex)
			let decChar = hexAlphabet.indexOf(hexChar)
			console.debug(decChar)
			accumulator = accumulator + Bitstring.fromDec(decChar)
		}
		return accumulator
	}

	static fromDec(int, encoding = Bitstring.encodings.TWO_COMP){
		console.debug('int', int)
		let accumulator = new Bitstring()
		if (encoding === Bitstring.encodings.TWO_COMP){
			while (int > 0){
				console.debug(int)
				let factor = Math.floor(int / 2) 
				let remainderStr = (int % 2).toString()
				int = factor
				accumulator = accumulator + new Bitstring(remainderStr)
			}
			return accumulator
		}
	}
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

		this.pc = null // Program Counter
		this.ir = '' // Instruction Register
		this.regs = Array.from(Array(0x10)) // 16  // ALU registers
		this.mem = Array.from(Array(0x100)) // 256  // Main memory
	}

	decodeInstruction(strHex){
		if (strHex.length !== 4) throw Error('')
		let opcode = Number('0x' + strHex[0])
		let second = Bitstring.fromHex(strHex[1])
		let third = Bitstring.fromHex(strHex[2])
		let fourth = Bitstring.fromHex(strHex[3])
		let operation = this.ops[opcode]

		let argumentFormat
		if ([1, 2, 3, 11].includes(opcode)){ // RXY
			argumentFormat = [second, third + fourth, null] // concatenated 16-bit mem address 
		} 
		if ([5, 6, 7, 8, 9].includes(opcode)){ // RST
			argumentFormat = [second, third, fourth] // all registers
		}
		if (opcode = 10) argumentFormat = [second, null, fourth] // R0X
		if (opcode = 4) argumentFormat = [null, third, fourth] // 0RS
		if (opcode = 12) argumentFormat = [null, null, null] // 000
		argumentFormat = argumentFormat.filter(arg => !!arg)
		operation.apply(null, argumentFormat)
	}

	static loadAddress(regIndex, address){
		let pattern = this.mem[address] + this.mem[address + 1]
		this.regs[regIndex] = pattern

		return {
			opcode: '1'
		}
	}

	static loadPattern(regIndex, pattern){
		this.regs[regIndex.toDec()] = pattern

		return {
			opcode: '2'
		}
	}

	static storeReg(regIndex, address){
		this.mem[address.toDec()] = this.regs[regIndex.toDec()]

		return {
			opcode: '3'
		}
	}

	static moveRegister(regFrom, regTo) {
		this.regs[regTo.toDec()] = this.regs[regFrom.toDec()]

		return {
			opcode: '4'
		}
	}

	static addTwoComp(result, x, y) {
		reg[result] = addBitstrings(this.regs[x.toDec()], this.regs[y.toDec()])

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

	dumpMem(){
		return this.mem.reduce((acc, val) => acc + val)
	}
}

window.cu = new ControlUnit()
window.bs = new Bitstring('10100011')
window.bs2 = new Bitstring('11111111')
// window.bst = new Bitstring('1010001a')

console.debug(Bitstring.encodings)
console.debug('' + Bitstring.encodings['TWO_COMP'])