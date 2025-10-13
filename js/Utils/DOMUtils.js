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
			top.onclick = () => showPage('services')
		} else {
			top.innerHTML = '<i>settings</i>'
			top.onclick = () => showPage('more')
		}
	}

}
