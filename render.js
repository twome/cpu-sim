export let render = (mem, reg)=>{
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