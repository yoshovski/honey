// The signed-in person (top right) and the Jarvis widget. Both come from the server-filtered config:
// `user` is null without sign-in, `jarvis.enabled` only for roles allowed to use Jarvis.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
const t = (key, fallback) => { const v = window.i18n && window.i18n.t ? window.i18n.t(key) : ""; return v && v !== key ? v : fallback }

export function initUser(cfg) {
	const controls = document.getElementById("top-controls")
	document.getElementById("user-menu")?.remove()
	const user = cfg && cfg.user
	if (!controls || !user) return
	const initials = String(user.name || user.email || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
	const wrap = document.createElement("div")
	wrap.id = "user-menu"
	wrap.innerHTML = `
		<button id="user-button" aria-haspopup="true" aria-expanded="false" title="${esc(user.email)}">
			<span class="avatar">${esc(initials)}</span><span class="uname">${esc(String(user.name).split(" ")[0])}</span>
		</button>
		<div id="user-pop" hidden>
			<div class="who"><b>${esc(user.name)}</b><small>${esc(user.email)}</small></div>
			${user.roles && user.roles.length ? `<div class="roles">${user.roles.map((r) => `<span>${esc(r)}</span>`).join("")}</div>` : ""}
			<a class="signout" href="${esc(user.logout || "/oauth2/sign_out")}"><i>logout</i>${esc(t("ui.sign_out", "Sign out"))}</a>
		</div>`
	controls.prepend(wrap)
	const button = wrap.querySelector("#user-button"), pop = wrap.querySelector("#user-pop")
	const show = (on) => { pop.hidden = !on; button.setAttribute("aria-expanded", String(on)) }
	button.addEventListener("click", (e) => { e.stopPropagation(); show(pop.hidden) })
	document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) show(false) })
	document.addEventListener("keydown", (e) => { if (e.key === "Escape") show(false) })
}

export function loadJarvis(cfg) {
	const j = cfg && cfg.jarvis
	if (!j || !j.enabled || document.getElementById("jarvis-widget-script")) return
	const s = document.createElement("script")
	s.id = "jarvis-widget-script"
	s.src = j.script || "/jarvis-api/jarvis-widget.js"
	s.defer = true
	document.body.appendChild(s)
}
