/*
	Visual rendering of abstract CPU parts for browsers.

	NB. extremely ugly & temporary
*/

import { ControlUnit } from './cpu-sim.js'
import { Bitstring } from './binary-encoding.js'

const { document } = window // Browser deps imported from global to module scope

export let renderView = (mem, reg)=>{
	let memContainerEl = document.querySelector('.memory')
	memContainerEl.innerHTML = ''
	for (let sequence of mem){
		let addrEl = document.createElement('li')
		addrEl.innerText = sequence ? sequence : 'undef'
		memContainerEl.appendChild(addrEl)
	}

	let regContainerEl = document.querySelector('.register')
	regContainerEl.innerHTML = ''
	for (let sequence of reg){
		let regEl = document.createElement('li')
		regEl.innerText = sequence
		regContainerEl.appendChild(regEl)
	}
}


console.debug(Bitstring.fromHex('00'))
let regs = Array(0x10).fill(Bitstring.fromHex('0'))
let mem = Array(0x100).fill(Bitstring.fromHex('00'))
mem[0] = Bitstring.fromHex('2032')
mem[1] = Bitstring.fromHex('21ff')
let cu = new ControlUnit({
	mem, regs,
	afterCycleFn: (mem, regs, pc, ir)=>{
		console.debug(pc.toHex(), ir.toHex(), regs, mem)
		renderView(mem, regs, pc, ir)
	}
})
cu.boot()

/*
	Bindings for the browser REPL to access
*/

Object.assign(window, {
	Bitstring, cu, mem,
	bs: new Bitstring.fromDec(64),
	bs1: new Bitstring('11111111'),
	bs0: new Bitstring('00000000'),
	a: new ArrayBuffer(32),
	v: new Int8Array()
})

