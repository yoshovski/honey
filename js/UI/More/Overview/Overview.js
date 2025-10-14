import App from "../../../App";
import { analyzeService } from "./analyzer";
import { privacyBox } from "./tiles";
import { s, isare } from "../../../Utils/StringUtils";


export default class Overview {
	constructor() {
		this.app = new App()
		this.config = this.app.config
		this.div = document.querySelector(".overview").parentNode
	}

	init() {
		this.initPrivacyBoxes()
	}

	initPrivacyBoxes() {
		let stats = {
			total: 0,
			secure: 0,
			thirdParties: 0
		}
		for (let service of this.config.getServices()) {
			let analysis = analyzeService(service.href, this.config.get("trusted_domains"))
			stats.total++
			stats.secure += analysis.isSecure
			stats.thirdParties += analysis.isThirdParty
		}
		this.div.querySelector(".big").setAttribute("style", `--value: ${stats.total}`)
		const availableLabel = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t('ui.overview.available') : `Available service${s(stats.total)}`
		const tr = (key, fallback) => {
			if (!(window.i18n && typeof window.i18n.t === 'function')) return fallback
			const v = window.i18n.t(key)
			return (v === key) ? fallback : v
		}
		this.div.querySelector(".small").innerText = tr('ui.overview.available', `Available service${s(stats.total)}`).replace('{n}', stats.total).replace('{plural}', s(stats.total))

		let encryption_t, encryption_d
		if (stats.secure == stats.total) {
			encryption_t = tr('ui.overview.encryption.full.title', "Full encryption")
			encryption_d = tr('ui.overview.encryption.full.desc', "All services use secure connections (HTTPS).")
		}
		else if (stats.secure == 0) {
			encryption_t = tr('ui.overview.encryption.none.title', "No encryption")
			encryption_d = tr('ui.overview.encryption.none.desc', "It seems server does not support HTTPS.")

		}
		else {
			let insecure = stats.total - stats.secure
			encryption_t = tr('ui.overview.encryption.partial.title', "Partial encryption")
			encryption_d = tr('ui.overview.encryption.partial.desc', `${insecure} service${s(insecure)} do not use secure connections.`).replace('{n}', insecure).replace('{plural}', s(insecure))

		}

		let indepencence_t, indepencence_d
		if (stats.thirdParties == 0) {
			indepencence_t = tr('ui.overview.independence.full.title', "Independence")
			indepencence_d = tr('ui.overview.independence.full.desc', "This server is free of 3rd party services.")
		}
		else if (stats.thirdParties == stats.total) {
			indepencence_t = tr('ui.overview.independence.none.title', "Something is wrong...")
			indepencence_d = tr('ui.overview.independence.none.desc', "It seems only 3rd-party services are listed.")
		}
		else {
			indepencence_t = tr('ui.overview.independence.partial.title', "Partial independence")
			indepencence_d = tr('ui.overview.independence.partial.desc', `${stats.thirdParties} service${s(stats.thirdParties)} ${isare(stats.thirdParties)} provided by 3rd-parties.`).replace('{n}', stats.thirdParties).replace('{plural}', s(stats.thirdParties))
		}

		privacyBox("lock", "#0D6", encryption_t, encryption_d, stats.secure / stats.total)
		privacyBox("home", "#68F", indepencence_t, indepencence_d, 1 - stats.thirdParties / stats.total)
	}
}
