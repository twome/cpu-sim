import { encodings } from './config.js'
import { render } from './render.js'
import { binToHex, hexToBin, binToDec, decToBin } from './binary-encoding.js'
import { addFloating, addTwoComp, boolOr, boolAnd, boolXor, bitRotateRight } from './operations.js'

// Main memory
let mem = Array.from(Array(0x100)) // 256

// ALU registers
let regs = Array.from(Array(0x10)) // 16

// Program counter
let pc = null

// Instruction register
let ir = null

class Bitstring extends String {
	constructor(rawString = '', opt = {}){
		// console.debug('BITSTRING CONSTRUCTOR: ', rawString)
		if (rawString.match(/[^01]/)) throw Error('Bitstring: input string must consist of the characters "0" or "1"')
		super(rawString)
		this.encoding = opt.encoding || Bitstring.encodings.TWO_COMP
		this.wordLength = opt.wordLength || 8
		this.floatingExponentLength = opt.floatingExponentLength || 3
	}

	toDec(){
		return binToDec(this, this.encoding)
	}

	toHex(){
		return binToHex(this, this.encoding)
	}

	static fromHex(hex){
		return new Bitstring(hexToBin(hex))
	}

	static fromDec(integer, encoding = Bitstring.encodings.TWO_COMP, wordLength = 8){
		return new Bitstring(decToBin(integer, encoding, wordLength))
	}
}
Bitstring.encodings = encodings


class ControlUnit {
	constructor(){
		this.ops = [
			()=>{ throw Error('ControlUnit: tried to run empty opcode 0') },
			ControlUnit.loadAddress,
			ControlUnit.loadPattern,
			ControlUnit.storeAddress,
			ControlUnit.moveRegister,
			ControlUnit.addTwoComp,
			ControlUnit.addFloating,
			ControlUnit.or,
			ControlUnit.and,
			ControlUnit.xor,
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
		console.info('DECODE', strHex)
		if (strHex.length !== 4) throw Error('strhex must be 4 hex chars')
		let opcode = Number('0x' + strHex[0])
		let second = Bitstring.fromHex(strHex[1])
		let third = Bitstring.fromHex(strHex[2])
		let fourth = Bitstring.fromHex(strHex[3])
		let operation = this.ops[opcode]
		console.debug('DECODED: opcode, second, third, fourth', opcode, second, third, fourth)

		let argumentFormat = []
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
		operation.apply(this, argumentFormat)
		render(mem, regs)
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

	static storeAddress(regIndex, address){
		console.info('STORE ADDRESS', regIndex, address)
		mem[address.toDec()] = regs[regIndex.toDec()]

		return {
			opcode: '3'
		}
	}

	static moveRegister(regFrom, regTo) {
		regs[regTo.toDec()] = regs[regFrom.toDec()]

		console.debug(regs)

		return {
			opcode: '4'
		}
	}

	static addTwoComp(result, x, y) {
		regs[result] = addTwoComp(regs[x.toDec()], regs[y.toDec()])

		return {
			opcode: '5'
		}
	}

	static addFloating(result, x, y){
		regs[result] = addFloating(regs[x.toDec()], regs[y.toDec()])

		return {
			opcode: '6'
		}
	}

	static or(result, x, y){
		regs[result] = boolOr(regs[x.toDec()], regs[y.toDec()])

		return {
			opcode: '7'
		}
	}

	static and(result, x, y){
		regs[result] = boolAnd(regs[x.toDec()], regs[y.toDec()])

		return {
			opcode: '8'
		}
	}

	static xor(result, x, y){
		regs[result] = boolXor(regs[x.toDec()], regs[y.toDec()])

		return {
			opcode: '9'
		}
	}

	// TODO how many notches
	static rotate(target, rotations){
		regs[target] = bitRotateRight(regs[target], rotations)

		return {
			opcode: 'A'
		}
	}

	static jump(regToCheck, jumpTargetIndex){
		if (regs[regToCheck.toDec()].valueOf() === regs[0].valueOf()){ // Compare as strings
			pc = jumpTargetIndex
		}

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
			return acc + val
		}, '') // Concat all bitstrings into one
		return dumpString
	}

	flush(arr, wordLength){
		arr = arr.forEach( () => new Bitstring('0'.repeat(wordLength), {wordLength}) )
		return arr
	}
}

window.Bitstring = Bitstring
window.cu = new ControlUnit()
window.bs = new Bitstring('10100011')
window.bs2 = new Bitstring('11111111')

window.mem = mem
window.regs = regs

// window.bst = new Bitstring('1010001a')

// Bitstring.fromHex('0')
// Bitstring.fromDec(0)

// cu.decodeInstruction('20ff')
// console.debug('reg0', regs[0])
// regs = cu.flush(regs, 8)
// cu.dump(regs)
// let to8 = int => ((int + 180) % 256) - 180

// for (let i = 0; i < 100; i++){
// 	console.log(i * 10, to8(i * 10))
// }

window.a = new ArrayBuffer(32)
window.v = new Int8Array(a)