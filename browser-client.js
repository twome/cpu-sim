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
	simulationDelayMs: 50
}

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
}

let regs = Array(0x10).fill(Bitstring.fromHex(`0`))
let mem = Array(0x100).fill(Bitstring.fromHex(`00`)).map((val, i) => i % 2 === 0 ? Bitstring.fromHex(`00`) : Bitstring.fromHex(`0f`))
// mem[0] = Bitstring.fromHex(`2032`)
// mem[1] = Bitstring.fromHex(`21ff`)
let cu = new ControlUnit({
	mem, regs,
	waitBetweenCyclesMs: vm.simulationDelayMs,
	afterCycleFn: (mem, regs, pc, ir)=>{
		// console.debug(pc.toHex(), ir.toHex(), regs, mem)
		renderView(mem, regs, pc, ir)
	}
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

let bootBtnEl = document.querySelector(`.js-BootBtn`)
let interruptBtnEl = document.querySelector(`.js-InterruptBtn`)
let resetBtnEl = document.querySelector(`.js-ResetBtn`)

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

document.querySelector(`.js-BootAddr`).addEventListener(`change`, function(){
	cu.pc = Bitstring.fromHex(this.value)
})

document.querySelector(`input[name="translateToHex"]`).addEventListener(`change`, function(){
	vm.translateToHex = this.checked
})

document.querySelector(`input[name="simulationDelay"]`).addEventListener(`change`, function(){
	vm.simulationDelayMs = Number(this.value)
	cu.cfg.waitBetweenCyclesMs = vm.simulationDelayMs
})

let memAddrToChangeEl = document.querySelector(`.js-MemAddrToChange`)
let memValToChangeEl = document.querySelector(`.js-MemValToChange`)

// memAddrToChangeEl.addEventListener(`change`, function(){
	// cu.mem[Bitstring.fromHex(this.value)] = Bitstring.fromHex(memValToChangeEl.value)
// })
memValToChangeEl.addEventListener(`change`, function(){
	let cellAddress = Bitstring.fromHex(memAddrToChangeEl.value)
	let cellValue = Bitstring.fromHex(this.value)
	cu.mem[cellAddress.toDec()] = cellValue
})

