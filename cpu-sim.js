/*
	This is a rough simulation of a von Neumann computer architecture, built alongside a broad-focused CS introductory textbook
	to ensure I understood the concepts enough to replicate them (in particular, as a tool to model machine code without
	having to already understand compilation, assembly, or low-level languages).
*/

// TODO: specify the main mem address size & the size within each memory cell. this will determine the size of instructions
// TODO: use Memory class for mem/reg
	// - proxy Memory to keep a list of which addresses have been read & which modified that resets upon each cycle; then we can use 

import { config, exitCodes, encodings } from './config.js'
import { Bitstring } from './binary-encoding.js'
import { addFloating, addTwoComp, boolOr, boolAnd, boolXor, bitRotateRight } from './operations.js'

class Memory extends Array {
	constructor(addressesDec = 256, cellBitLengthDec = 8, {
		wordBitLength = 8,
		encoding = encodings.TWO_COMP
	}={}){
		super()
		Object.assign(this, {addressesDec, cellBitLengthDec, wordBitLength})
		return this.fill(new Bitstring(`0`.repeat(cellBitLengthDec), {
			encoding, wordLength: wordBitLength,
		}))
	}
}

const eachWord = (bitstring, wordFn, wordLength = 8)=>{
	let wordsCount = bitstring.length / wordLength
	for (let i = 0; i > wordsCount; i = i + 1){
		let wordStart = i * 4
		let word = bitstring.slice(wordStart, wordStart + 4)
		let returned = wordFn(word, i)
		if (returned instanceof Error) return returned
	}
	return true
}

// Simulates the control unit part of a CPU, which reads and writes data between the main memory and CPU registers/cache, 
// keeps track of program state, and 
export class ControlUnit {
	constructor({
		afterCycleFn,
		bootAddress = Bitstring.fromHex(`00`),
		programStateAddr = Bitstring.fromHex(`ec`), // Leaves 16 bytes for mem, 2 for IR and 1 for PC
		mem = Array.from(Array(0x100)), // Main memory; 256 addresses,
		regs = Array.from(Array(0x10)), // Shared ALU/CPU registers; 16 addresses
		waitBetweenCyclesMs = 50
	}){
		// Options
		this.cfg = { bootAddress, waitBetweenCyclesMs } // These should not change after being initially set

		// State
		Object.assign(this, {
			afterCycleFn, mem, regs, programStateAddr,
			pc: bootAddress, // Program counter. Ready the CPU to bootstrap (this address would be ROM)
			ir: null, // Instruction register
			interrupt: false,
			running: false,
			opHistory: []
		})

		// Operations numerically ordered
		this.ops = [
			()=>{ 
				if (!config.allowNoOps) throw Error(`ControlUnit: tried to run empty opcode 0`)
				// no operation; the CPU will just move on to the next 2 addresses
			},
			this.loadAddress,
			this.loadPattern,
			this.storeAddress,
			this.moveRegister,
			this.addTwoComp,
			this.addFloating,
			this.or,
			this.and,
			this.xor,
			this.rotate,
			this.jump,
			this.halt
		]
	}

	reset(hard){
		clearInterval(this.waitingCycle)
		this.interrupt = false
		this.pc = this.cfg.bootAddress
		this.regs = Array.from(Array(0x10))
		if (hard) this.flush(this.mem)
	}

	reboot(){
		this.running = false
		this.interrupt = false
		if (config.verbose) console.info('Rebooting')
		this.reset()
		this.boot()
	}

	boot(){
		if (this.running){
			if (config.bootReboots){
				this.reboot()
			}
			if (config.verbose) console.info(`CPU already running; can't boot`)
			return false
		} else {
			let exitCode = this.machineCycle(this.afterCycleFn) // Start the self-perpetuating cycle	
			this.running = true
		}
		
		// TODO: make these asynchronous (so we can deal with the simulation delay)
		// if (config.verbose) console.debug(`Machine terminated with exit code:`, exitCode.humanName)
		// return exitCode
	}

	fetchInstruction(address){
		// Fetch the PC instruction from main memory
		let byte1 = this.mem[address.toDec()]
		let byte2 = this.mem[address.toDec() + 1] // Using the `+` operand to concatenate transforms to .toValue() ie String
		let instruction = new Bitstring(byte1 + byte2)

		// 2 bytes; 4 hexes
		if (instruction.length !== 16) throw Error(`Instruction register must be 2 bytes, not: ${instruction.length} bits`) 
 		if (instruction === null || instruction === undefined) throw Error(`Address is empty; can't decode`)
		
		// Place the instruction in the register, ready to decode
		this.ir = instruction

		this.executingPc = this.pc // Keep track of the currently executing instruction's starting MM address
		// Increment program counter by the size of the retrieved instruction (here we assume it's always 2 bytes).
		// TODO: fix accidentally returning to address 0 instread of >128
		let nextInstructionAddress = this.pc.toDec(encodings.UINT8) + 2
		
		this.pc = Bitstring.fromDec(nextInstructionAddress) // TODO: replace with binary addition
	}

	decodeInstruction(strHex){
		if (strHex.length !== 4) throw Error(`strhex must be 4 hex chars`)
		let opcode = Bitstring.fromHex(strHex[0]).toDec()
		let second = Bitstring.fromHex(strHex[1])
		let third = Bitstring.fromHex(strHex[2])
		let fourth = Bitstring.fromHex(strHex[3])
		this.decodedInstruction = [opcode, second, third, fourth]
		return this.decodedInstruction
	}

	formatArgumentsForOps(opcode, second, third, fourth){
		let format
		if ([1, 2, 3, 11].includes(opcode)){ // RXY
			format = [second, new Bitstring(third + fourth), null] // concatenated 16-bit mem address 
		} 
		if ([5, 6, 7, 8, 9].includes(opcode)){ // RST
			format = [second, third, fourth] // all registers
		}
		if (opcode === 10) format = [second, null, fourth] // R0X
		if (opcode === 4) format = [null, third, fourth] // 0RS
		if ([0, 12].includes(opcode)) format = [null, null, null] // 000
		if (format === undefined) throw Error(`No operation found for for opcode ${opcode}`)
		format = format.filter(val => val === null)
		return format
	}

	executeInstruction(opcode, second, third, fourth){
		let formatArr = this.formatArgumentsForOps(opcode, second, third, fourth)
		let operation = this.ops[opcode]
		operation.apply(this, formatArr)
	}

	machineCycle(afterCycleFn){
		this.fetchInstruction(this.pc)
		if (this.ir === undefined){
			this.interrupt = 1
			if (config.verbose) console.debug(`The current program counter's cell is undefined - bad memory or end-of-memory?`)
			return exitCodes.UNDEFINED_INSTRUCTION
		}
		this.opHistory.push(this.ir)
		let decodedInstructionArr = this.decodeInstruction(this.ir.toHex())
		this.executeInstruction(...decodedInstructionArr)
		
		if (afterCycleFn) afterCycleFn(this.mem, this.regs, this.executingPc, this.ir)
		
		// An interrupt singal won't block the current machine cycle (which must be idempotent), but will block the following one
		if (this.interrupt){

			let endAddress = this.saveProgramState(this.programStateAddr)
			if (config.verbose){ console.debug(`Received interrupt; state is:`, {
				pc: this.pc, ir: this.ir, regs: this.regs, mem: this.mem
			})}
			return exitCodes.INTERRUPTED
		}
		
		// We put a brief timeout between cycles to free up the simulating host (JS engine) to check for 
		this.waitingCycle = setTimeout(()=>{
			this.machineCycle(afterCycleFn)
		}, this.cfg.waitBetweenCyclesMs)
	}

	saveProgramState(programStateAddr, {
		regs = this.regs,
		pc = this.pc,
		ir = this.ir,
		lengthBytes = 19
	}={}){
		let programState = { regs, pc, ir, lengthBytes }
		let writingAddr = programStateAddr.toDec()

		this.mem[writingAddr] = programState.pc
		writingAddr = writingAddr + 1
		
		let result = eachWord(programState.ir, (bits, i)=>{
			if (writingAddr >= this.mem.length){
				let err = Error(`Tried to write to an address greater than memory length`)
				console.error(err)
				return err
			}
			this.mem[writingAddr] = new Bitstring(bits)
			writingAddr = writingAddr + 1
		})

		let saveArrayToMem = (arr, startAddr, mem = this.mem) => {
			let writingAddr = startAddr.toDec()
			for (let cell of arr){
				mem[writingAddr = cell]
				writingAddr = writingAddr + 1
			}
			return Bitstring.fromDec(writingAddr)
		}

		let writingAddrBitstring = Bitstring.fromDec(writingAddr)
		// TODO bugged - says final address is only 1 more than starting address?
		if (config.verbose) console.debug(`Saved program state into main memory from ${programStateAddr.toDec()} to ${writingAddrBitstring.toDec()}...\n`)

		writingAddr = saveArrayToMem(programState.regs, writingAddrBitstring)

		return writingAddrBitstring
	}

	loadAddress(regIndex, address){
		let pattern = this.mem[address.toDec()]
		this.regs[regIndex.toDec()] = pattern

		return {
			opcode: `1`
		}
	}

	loadPattern(regIndex, pattern){
		this.regs[regIndex.toDec()] = pattern

		return {
			opcode: `2`
		}
	}

	storeAddress(regIndex, address){
		let toStore = this.regs[regIndex.toDec()]
		if (toStore.length > 4) throw Error(`Tried to store more than 4 hex characters in address ${address.toDec()}`)
		this.mem[address.toDec()] = toStore

		return {
			opcode: `3`
		}
	}

	moveRegister(regFrom, regTo) {
		this.regs[regTo.toDec()] = this.regs[regFrom.toDec()]

		return {
			opcode: `4`
		}
	}

	addTwoComp(result, x, y) {
		this.regs[result] = addTwoComp(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: `5`
		}
	}

	addFloating(result, x, y){
		this.regs[result] = addFloating(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: `6`
		}
	}

	or(result, x, y){
		this.regs[result] = boolOr(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: `7`
		}
	}

	and(result, x, y){
		this.regs[result] = boolAnd(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: `8`
		}
	}

	xor(result, x, y){
		this.regs[result] = boolXor(this.regs[x.toDec()], this.regs[y.toDec()])

		return {
			opcode: `9`
		}
	}

	// TODO how many notches
	rotate(target, rotations){
		this.regs[target] = bitRotateRight(this.regs[target], rotations)

		return {
			opcode: `a`
		}
	}

	jump(regToCheck, jumpTargetIndex){
		let selectedRegisterContent = this.regs[regToCheck.toDec()].valueOf()
		let register0Content = this.regs[0].valueOf()
		if (selectedRegisterContent === register0Content){ // Compare as plain strings
			this.pc = jumpTargetIndex
		}

		return {
			opcode: `b`
		}
	}

	halt(){
		this.interrupt = true

		return {
			opcode: `c`
		}
	}

	/*
		Testing / debug utilities
	*/
	dump(arr){
		let dumpString = arr.reduce((acc, val) => {
			return acc + val
		}, ``) // Concat all bitstrings into one
		return dumpString
	}

	flush(arr, wordLength = 8){
		arr = arr.forEach(() => new Bitstring(`0`.repeat(wordLength), {wordLength}))
		return arr
	}
}