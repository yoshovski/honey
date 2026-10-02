import App from "./App"
import I18n from "./Utils/I18n"
import { initUser, loadJarvis } from "./UI/User/User"

window.addEventListener("DOMContentLoaded", async () => {
	window.i18n = new I18n()
	await window.i18n.load()

	const selector = document.getElementById('lang-select')
	if (selector) {
		selector.value = window.i18n.lang || 'en'
		selector.addEventListener('change', (e) => {
			window.i18n.load(e.target.value)
		})
	}


	const loadConfigForLang = (lang) => {
		return new Promise((resolve, reject) => {
			let path = `config/config.${lang}.json`
			let xhr = new XMLHttpRequest()
			xhr.open('GET', path)
			xhr.onload = function() {
				if (this.status >= 200 && this.status < 400) return resolve(JSON.parse(this.responseText))
				let xhr2 = new XMLHttpRequest()
				xhr2.open('GET', 'config/config.en.json')
				xhr2.onload = function() { resolve(JSON.parse(this.responseText)) }
				xhr2.onerror = reject
				xhr2.send()
			}
			xhr.onerror = reject
			xhr.send()
		})
	}

	const boot = async () => {
		let cfg = await loadConfigForLang(window.i18n.lang || 'en')
		initUser(cfg)
		loadJarvis(cfg)
		if (window.app) {
			if (window.app.config && typeof window.app.config === 'object') {
				window.app.config.config = cfg
			} else {
				window.app.config = new (await import('./Utils/Config.js')).default(cfg)
			}

			if (window.app.drawer && window.app.drawer.importApps) window.app.drawer.importApps()
			if (window.app.more && window.app.more.initPager) window.app.more.initPager()
		} else {
			window.app = new App(cfg)
		}
	}

	boot()

	window.addEventListener('langchange', () => {
		boot()
	})

	window.addEventListener('langchange', () => {
		if (window.i18n && typeof window.i18n.apply === 'function') window.i18n.apply()
	})
})
