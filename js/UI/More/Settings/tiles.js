export function addOnOffTile(conf, icon, nameKey, descKey, key, func) {
	let item = document.createElement("div")
	item.classList.add("setting")
	item.classList.add("pointer")
	const nameText = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(nameKey) : nameKey
	const descText = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(descKey) : descKey
	item.innerHTML = `
		<i>${icon}</i>
		<div class="text">
			<div class="name" data-i18n="${nameKey}">${nameText}</div>
			<div class="desc" data-i18n="${descKey}">${descText}</div>
		</div>
		<div class="switch"></div>`

	let handleState = () => {
		let c = item.classList
		if (conf.get(key)) c.add("checked")
		else c.remove("checked")
	}

	let write = () => {
		let target_value = !conf.get(key)
		conf.set(key, target_value)
	}

	let f = () => {func(conf)}

	item.addEventListener("click", write)
	item.addEventListener("click", handleState)
	if (func) item.addEventListener("click", f)

	handleState()
	if (func) f()

	document.querySelector("#settings").appendChild(item)
	return item
}

export function addOptionsTile(conf, icon, name, desc, key, func) {
	let optionValues = ["Auto", "Off", "On"]
	let optionKeys = [
		'ui.settings.opt_auto',
		'ui.settings.opt_off',
		'ui.settings.opt_on'
	]
	let optionsHtml = document.createElement("div")
	optionsHtml.classList.add("options")

	let handleState = () => {
		let c = optionsHtml
		let value = conf.get(key)
		let n = optionValues.indexOf(value)
		for (let i = 0; i < optionValues.length; i++) {
			let cl = c.children[i].classList
			if (i == n) cl.add("active")
			else cl.remove("active")
		}
		c.setAttribute("style", `--item: ${n}; --items: ${optionValues.length}`)
	}

	let write = (val) => {
		conf.set(key, val)
	}

	let f = () => {func(conf)}

	optionKeys.forEach(k => {
		let node = document.createElement("div")
		node.setAttribute('data-i18n', k)
		node.innerText = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(k) : k
		node.addEventListener("click", () => {
			const idx = Array.from(optionsHtml.children).indexOf(node)
			const val = optionValues[idx]
			write(val)
			handleState()
			if (func) f()
		})
		optionsHtml.appendChild(node)
	})

	handleState()
	if (func) f()

	let item = document.createElement("div")
	item.classList.add("setting")
	const nameText = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(name) : name
	const descText = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(desc) : desc
	item.innerHTML = `
		<i>${icon}</i>
		<div class="text">
			<div class="name" data-i18n="${name}">${nameText}</div>
			<div class="desc" data-i18n="${desc}">${descText}</div>
		</div>`
	item.appendChild(optionsHtml)

	document.querySelector("#settings").appendChild(item)
	return item
}
