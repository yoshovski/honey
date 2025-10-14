import App from "../../App";
import PingService from "../../Utils/PingService";

export default class Drawer {
	constructor() {
		this.app = new App()
		this.config = this.app.config
		this.init()
	}

	init() {
		this.importApps()
        
		window.addEventListener('langchange', () => {
			this.importApps()
		})
	}

	importApps() {
		let apps = this.config.getServices()
		let enablePingDots = this.config.get("ping_dots")
		let openNewTab = this.config.get("open_new_tab")
		let applist = document.querySelector("#app-list")
		applist.innerHTML = ""
		for (let app of apps) {
			let a = document.createElement("a")
			a.classList.add("box")
			a.href = app.href
			if (openNewTab) a.setAttribute("target", "_blank")
			let lang = (window.localStorage && localStorage.getItem('lang')) || navigator.language.split('-')[0]
			let desc = app.desc
			let name = app.name
			if (lang === 'it') {
				if (app.desc_it) desc = app.desc_it
				if (app.name_it) name = app.name_it
			}

			a.innerHTML = `
					<img src="${app.icon}">
					<div>
						<div class="name">${name}</div>
						<div class="desc">${desc}</div>
					</div>`

			if (enablePingDots) {
				a.classList.add("pingdot")
				PingService(app.href, status => {
					if (!status) return
					let resp = "down"
					if (status >= 200 && status < 400) resp = "up"
					else if (status >= 400) resp = "error"
					a.classList.add(resp)
				})
			}

			applist.appendChild(a)
		}

		let gears = this.config.getGear ? this.config.getGear() : (this.config.config["gear"] || [])
		let adminList = document.querySelector("#admin-list")
		if (adminList) adminList.innerHTML = ""
		for (let g of gears) {
			let a = document.createElement("a")
			a.classList.add("box")
			a.href = g.href
			if (openNewTab) a.setAttribute("target", "_blank")
			a.innerHTML = `
				<img src="${g.icon}">
				<div>
					<div class="name">${g.name}</div>
					<div class="desc">${g.desc}</div>
				</div>`

			if (enablePingDots) {
				a.classList.add("pingdot")
				PingService(g.href, status => {
					if (!status) return
					let resp = "down"
					if (status >= 200 && status < 400) resp = "up"
					else if (status >= 400) resp = "error"
					a.classList.add(resp)
				})
			}

			if (adminList) adminList.appendChild(a)
		}

		document.addEventListener('click', (e) => {
			let el = e.target
			while (el && el !== document) {
				if (el.classList && el.classList.contains && el.classList.contains('header-toggle')) break
				el = el.parentNode
			}
			if (!el || el === document) return
			let selector = el.getAttribute('data-toggle-target') || el.dataset.toggleTarget
			if (!selector) return
			e.preventDefault()
			let target = document.querySelector(selector)
			if (!target) return
			target.classList.toggle('open')
			el.classList.toggle('open')
		})
	}
}
