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

let mem = Array(0x100).fill('0000')
mem[0] = '2032'
mem[1] = '21ff'
let cu = new ControlUnit({
	afterCycleFn: (mem, regs, pc, ir)=>{
		renderView(mem, regs, pc, ir)
	},
	mem: mem
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

