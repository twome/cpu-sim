/*
	Visual rendering of abstract CPU parts for browsers.

	NB. extremely ugly & temporary
*/

import { ControlUnit } from './cpu-sim.js'
import { Bitstring } from './binary-encoding.js'

const { document } = window // Browser deps imported from global to module scope

let memContainerEl = document.querySelector(`.memory`)
let regContainerEl = document.querySelector(`.register`)
let irEl = document.querySelector('.instructionRegister')
let pcEl = document.querySelector('.programCounter')

export let renderView = (mem, reg, pc, ir)=>{
	console.debug(typeof mem)
	mem.forEach((val, i)=>{
		let sequence = mem[i]
		let cellEl = memContainerEl.children[i] || document.createElement(`li`)
		console.debug(typeof i)
		if (pc.toDec() === i){
			console.debug('CURRENT PC', pc)
			cellEl.classList.add(`memory_lastExecutedCell`)
		}
		cellEl.innerText = sequence ? sequence : `undef`
		memContainerEl.appendChild(cellEl)
	})

	for (let i in reg){
		let sequence = reg[i]

		let registerEl = regContainerEl.children[i] || document.createElement(`li`)
		registerEl.innerText = sequence

		regContainerEl.appendChild(registerEl)
	}

	
	irEl.innerText = ir.toHex()

	pcEl.innerText = pc.toDec()
}

let regs = Array(0x10).fill(Bitstring.fromHex(`0`))
let mem = Array(0x100).fill(Bitstring.fromHex(`00`))
// mem[0] = Bitstring.fromHex(`2032`)
// mem[1] = Bitstring.fromHex(`21ff`)
let cu = new ControlUnit({
	mem, regs,
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
	cu.pc = Bitstring.fromHex(this.val)
})