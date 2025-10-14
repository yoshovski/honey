export default class I18n {
  constructor() {
    this.lang = localStorage.getItem('lang') || navigator.language.split('-')[0] || 'en'
    this.translations = {}
  }

  async load(lang) {
    if (!lang) lang = this.lang
    try {
      const res = await fetch(`/i18n/${lang}.json`)
      if (!res.ok) throw new Error('not found')
      this.translations = await res.json()
      this.lang = lang
      localStorage.setItem('lang', lang)
      this.apply()
  try { window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } })) } catch (e) {}
    } catch (e) {
      if (lang !== 'en') return this.load('en')
      console.warn('i18n load failed', e)
    }
  }

  t(path) {
    const parts = path.split('.')
    let cur = this.translations
    for (let p of parts) {
      if (!cur) return path
      cur = cur[p]
    }
    return cur || path
  }

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n')
      const text = this.t(key)
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = text
      else el.innerText = text
    })
  }
}
