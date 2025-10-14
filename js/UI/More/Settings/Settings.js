import App from "../../../App";
import { addOnOffTile, addOptionsTile } from "./tiles";
import * as EVENTS from "./events"


export default class Settings {
	constructor() {
		this.app = new App()
		this.config = this.app.config
	}

	init() {
		this.checkLocalStorage()
		this.initSettings()
	}

	initSettings() {
		let darkMode = addOptionsTile(this.config,
			"dark_mode",
			"ui.settings.dark_mode",
			"ui.settings.dark_mode_desc",
			"dark_mode", EVENTS.onThemeChange
		)

		addOnOffTile(this.config,
			"open_in_new",
			"ui.settings.open_in_new",
			"ui.settings.open_in_new_desc",
			"open_new_tab", EVENTS.onNewTabChange
		)

		addOnOffTile(this.config,
			"sensors",
			"ui.settings.ping_dots",
			"ui.settings.ping_dots_desc",
			"ping_dots", EVENTS.onPingDotsChange
		)

		addOnOffTile(this.config,
			"blur_on",
			"ui.settings.blur_on",
			"ui.settings.blur_on_desc",
			"blur", EVENTS.onBlurChange
		)

		addOnOffTile(this.config,
			"animation",
			"ui.settings.animations",
			"ui.settings.animations_desc",
			"animations", EVENTS.onAnimationChange
		)

		document.querySelector("#theme-switcher").addEventListener("click", () => {
			let targetButtons = darkMode.querySelector(".options").children
			let storedValue = this.config.get("dark_mode")
			let target;
			if (storedValue == "Auto") {
				let isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
				target = 2 - isSystemDark
			}
			else {
				let isEnforcedDark = storedValue == "On"
				target = !isEnforcedDark + 1
			}
			targetButtons[target].click()
		})
	}

	checkLocalStorage() {
		let warn = document.querySelector("#no-cookies").classList
		if (this.config.storageAvailable) warn.add("hidden")
	}
}