export function showPage(target) {
	let bg = document.querySelector("#background").classList
	if (target == "home") bg.add("scaled")
	else bg.remove("scaled")
	let pages = document.querySelectorAll(".page")

	for (let page of pages) {
		let p = page.getAttribute("p")
		if (p == target) page.classList.add("current")
		else page.classList.remove("current")
	}

	let top = document.querySelector('#top-gear')
	if (top) {
		if (target == 'more') {
			top.innerHTML = '<i>home</i>'
			top.title = (window.i18n && window.i18n.t('ui.topgear_back_services')) || 'Back'
			top.onclick = () => showPage('services')
		} else {
			top.innerHTML = '<i>settings</i>'
			top.title = (window.i18n && window.i18n.t('ui.topgear_open_settings')) || 'Settings'
			top.onclick = () => showPage('more')
		}
	}

}
