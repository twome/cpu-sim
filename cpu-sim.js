/*
	This is a rough simulation of a von Neumann computer architecture, built alongside a broad-focused CS introductory textbook
	to ensure I understood the concepts enough to replicate them (in particular, as a tool to model machine code without
	having to already understand compilation, assembly, or low-level languages).
*/

import { config } from './config.js'
import { Bitstring } from './binary-encoding.js'
import { addFloating, addTwoComp, boolOr, boolAnd, boolXor, bitRotateRight } from './operations.js'

// Simulates the control unit part of a CPU, which reads and writes data between the main memory and CPU registers/cache, 
// keeps track of program state, and 
export class ControlUnit {
	constructor({
		afterCycleFn,
		bootAddress = Bitstring.fromHex('00'),
		mem = Array.from(Array(0x100)), // Main memory; 256 addresses,
		regs = Array.from(Array(0x10)) // Shared ALU/CPU registers; 16 addresses
	}){
		this.cfg = { bootAddress } 
		Object.assign(this, {
			afterCycleFn, mem, regs,
			pc: bootAddress, // Program counter. Ready the CPU to bootstrap (this address would be ROM)
			ir: null // Instruction register
		})

		// Operations numerically ordered
		this.ops = [
			()=>{ 
				if (!config.allowNoOps) throw Error('ControlUnit: tried to run empty opcode 0')
				// no operation; the CPU will just move on to the next 2 addresses
			},
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

	boot(){
		this.machineCycle(this.afterCycleFn) // Start the self-perpetuating cycle
	}

	fetchInstruction(address){
		// Fetch the PC instruction from main memory
		let instruction = this.mem[address.toDec()]

		if (instruction === null || instruction === undefined) throw Error(`Address is empty; can't decode`)
		
		// Place the instruction in the register, ready to decode
		this.ir = instruction

		// Increment program counter by the size of the retrieved instruction (here we assume it's always 2 bytes)
		this.pc = Bitstring.fromDec((this.pc.toDec() + 2)) // TODO: replace with binary addition
	}

	decodeInstruction(strHex){
		if (strHex.length !== 4) throw Error('strhex must be 4 hex chars')
		let opcode = Number('0x' + strHex[0])
		let second = Bitstring.fromHex(strHex[1])
		let third = Bitstring.fromHex(strHex[2])
		let fourth = Bitstring.fromHex(strHex[3])
		this.decodedInstruction = [opcode, second, third, fourth]
	}

	executeInstruction(opcode, second, third, fourth){
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
		argumentFormat = argumentFormat.filter(val => val === null)
		let operation = this.ops[opcode]
		operation.apply(this, argumentFormat)
	}

	machineCycle(afterCycleFn){
		this.fetchInstruction(this.pc)
		this.decodeInstruction(this.ir)
		this.executeInstruction(...this.decodedInstruction)
		afterCycleFn(this.mem, this.regs, this.pc, this.ir)
		this.machineCycle()
	}

	static loadAddress(regIndex, address){
		let pattern = this.mem[address.toDec()] + this.mem[address.toDec() + 1]
		this.regs[regIndex.toDec()] = pattern

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

	static storeAddress(regIndex, address){
		let toStore = this.regs[regIndex.toDec()]
		if (toStore.length > 4) throw Error(`Tried to store more than 4 hex characters in address ${address.toDec()}`)
		this.mem[address.toDec()] = toStore

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
		this.regs[result] = addTwoComp(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: '5'
		}
	}

	static addFloating(result, x, y){
		this.regs[result] = addFloating(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: '6'
		}
	}

	static or(result, x, y){
		this.regs[result] = boolOr(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: '7'
		}
	}

	static and(result, x, y){
		this.regs[result] = boolAnd(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: '8'
		}
	}

	static xor(result, x, y){
		this.regs[result] = boolXor(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: '9'
		}
	}

	// TODO how many notches
	static rotate(target, rotations){
		this.regs[target] = bitRotateRight(this.regs[target], rotations)

		return {
			opcode: 'A'
		}
	}

	static jump(regToCheck, jumpTargetIndex){
		if (this.regs[regToCheck.toDec()].valueOf() === this.regs[0].valueOf()){ // Compare as strings
			this.pc = jumpTargetIndex
		}

		return {
			opcode: 'B'
		}
	}

	static halt(){
		// TODO: 

		return {
			opcode: 'C'
		}
	}

	/*
		Testing / debug utilities
	*/
	dump(arr){
		let dumpString = arr.reduce((acc, val) => {
			return acc + val
		}, '') // Concat all bitstrings into one
		return dumpString
	}

	flush(arr, wordLength){
		arr = arr.forEach(() => new Bitstring('0'.repeat(wordLength), {wordLength}))
		return arr
	}
}