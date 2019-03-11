/*
	Visual rendering of abstract CPU parts for browsers.

	NB. extremely ugly & temporary; this is just for quickly controlling the abstract model
*/

import { ControlUnit } from './cpu-sim.js'
import { Bitstring } from './binary-encoding.js'

const { document } = window // Browser deps imported from global to module scope

let memContainerEl = document.querySelector(`.memory`)
let regContainerEl = document.querySelector(`.register`)
let irEl = document.querySelector(`.instructionRegister`)
let pcEl = document.querySelector(`.programCounter`)

let vm = {
	translateToHex: false,
	simulationDelayMs: 1000
}

let regs = Array(0x10).fill(Bitstring.fromHex(`00`))
let mem = Array(0x100).fill(Bitstring.fromHex(`00`)).map((val, i) => i % 2 === 0 ? Bitstring.fromHex(`00`) : Bitstring.fromHex(`0f`))

// Load instruction into memory
let loadIns = (startAddr, hex) => {
	mem[startAddr] = Bitstring.fromHex(hex.slice(0,2))
	mem[startAddr + 1] = Bitstring.fromHex(hex.slice(2))
}
loadIns(0, '20ff') // Load into reg0 pattern 0xff
loadIns(2, '2109') // Load into reg1 pattern 0x09
loadIns(4, '2208') // Load into reg2 pattern 0x08
loadIns(6, '5312') // Add into reg3 result of reg1 + reg2
loadIns(8, '4034') // "Move" copy) reg3 to reg4
loadIns(10, '7541') // reg5 = reg4 OR reg1
loadIns(12, '8641') // reg6 = reg4 AND reg1
loadIns(14, '9741') // reg7 = reg4 XOR reg1
loadIns(16, 'a305') // rotateRight reg3 by 5
loadIns(18, 'a303') // rotateRight reg3 by 3 (return to original)
loadIns(20, 'a309') // rotateRight reg3 by 9 (same as 1)
loadIns(22, '3440') // store reg4 into mem0x40
loadIns(24, '1840') // load mem0x40 into reg8
loadIns(26, 'b830') // if (reg8===reg0) jump to mem0x30
loadIns(28, '4080') // copy reg8 over reg0
loadIns(30, 'b830') // if (reg8===reg0) jump to mem0x30
loadIns(50, 'c000') // halt
// TODO - test addFloat

export let renderView = (mem, reg, pc, ir)=>{
	let lastExecutedEls = memContainerEl.querySelectorAll(`.lastActiveCell`)
	mem.forEach((val, i)=>{
		let sequence = mem[i]
		let cellEl = memContainerEl.children[i]
		let toWrite = sequence || `undef`
		if (sequence && vm.translateToHex) toWrite = toWrite.toHex()
		if (!cellEl){
			cellEl = document.createElement(`li`)
			memContainerEl.appendChild(cellEl)
			let numberEl = document.createElement(`span`)
			numberEl.classList.add(`cellNumber`)
			numberEl.innerText = i + `:`
			let textNode = document.createTextNode(toWrite)
			cellEl.appendChild(numberEl)
			cellEl.appendChild(textNode)
		} else {
			let textNode = cellEl.childNodes[1]
			textNode.textContent = toWrite
		}
		
		if (pc.toDec() === i || pc.toDec() === i - 1){ // These cells represents the memory address(es) last executed
			if (lastExecutedEls.length > 0) lastExecutedEls.forEach(el => el.classList.remove(`lastActiveCell`))
			cellEl.classList.add(`lastActiveCell`)
		}
	})

	for (let i in reg){
		i = Number(i)
		let sequence = reg[i]

		let registerEl = regContainerEl.children[i]
		if (!registerEl){
			registerEl = document.createElement(`li`)
			regContainerEl.appendChild(registerEl)
		}
		registerEl.innerText = sequence
	}
	
	irEl.innerText = ir.toHex()

	pcEl.innerText = pc.toDec()

	// Visual "tick" indicator
	document.body.style.transition = 'background-color 50ms'
	document.body.style.backgroundColor = 'hsla(55, 100%, 53%, 0.51)'
	setTimeout(()=>{
		document.body.style.backgroundColor = 'white'
	}, 50)
}

let cu = new ControlUnit({
	mem, regs,
	waitBetweenCyclesMs: vm.simulationDelayMs,
	afterCycleFn: (mem, regs, pc, ir)=>{
		// console.debug(pc.toHex(), ir.toHex(), regs, mem)
		renderView(mem, regs, pc, ir)
	}
})



/* 
	Bind user inputs
*/

let bootBtnEl = document.querySelector(`.js-BootBtn`)
let interruptBtnEl = document.querySelector(`.js-InterruptBtn`)
let resetBtnEl = document.querySelector(`.js-ResetBtn`)
let bootAddrEl = document.querySelector(`.js-BootAddr`)
let translateHexEl = document.querySelector(`input[name="translateToHex"]`)
let simDelayEl = document.querySelector(`input[name="simulationDelay"]`)
let memAddrToChangeEl = document.querySelector(`.js-MemAddrToChange`)
let memValToChangeEl = document.querySelector(`.js-MemValToChange`)

bootBtnEl.addEventListener(`click`, e => {
	memContainerEl.innerHTML = ``
	regContainerEl.innerHTML = ``
	cu.boot()
	interruptBtnEl.focus()
})
bootBtnEl.focus()

interruptBtnEl.addEventListener(`click`, e => {
	cu.interrupt = 1
})

resetBtnEl.addEventListener(`click`, e => {
	cu.reset()
})

bootAddrEl.addEventListener(`change`, function(){
	cu.pc = Bitstring.fromHex(this.value)
})

translateHexEl.addEventListener(`change`, function(){
	vm.translateToHex = this.checked
})

simDelayEl.addEventListener(`change`, function(){
	vm.simulationDelayMs = Number(this.value)
	cu.cfg.waitBetweenCyclesMs = vm.simulationDelayMs
})
simDelayEl.value = vm.simulationDelayMs

memValToChangeEl.addEventListener(`change`, function(){
	let cellAddress = Bitstring.fromHex(memAddrToChangeEl.value)
	let cellValue = Bitstring.fromHex(this.value)
	cu.mem[cellAddress.toDec()] = cellValue
})



/*
	Bindings for the browser REPL to access
*/

Object.assign(window, {
	Bitstring, cu, mem,
	bs: Bitstring.fromDec(64),
	bs1: new Bitstring(`11111111`),
	bs0: new Bitstring(`00000000`),
	a: new ArrayBuffer(32),
	v: new Int8Array()
})