import { initHeader } from './JS/header.js'
import { supabase } from './JS/supabase-client.js'

// ── Header ────────────────────────────────────────────────────
initHeader()

// ── Preloader ─────────────────────────────────────────────────
const preloader = document.getElementById('preloader')
const heroVideo = document.getElementById('hero-video')

const alreadyLoaded = sessionStorage.getItem('siteLoaded')

if (preloader) {
    if (alreadyLoaded) {
        preloader.remove()
        document.body.classList.remove('loading')
        if (heroVideo) heroVideo.play().catch(() => {})
    } else {
        sessionStorage.setItem('siteLoaded', 'true')
        setTimeout(() => {
            preloader.classList.add('hidden')
            document.body.classList.remove('loading')
            if (heroVideo) heroVideo.play().catch(() => {})
            setTimeout(() => preloader.remove(), 750)
        }, 3500)
    }
} else {
    if (heroVideo) heroVideo.play().catch(() => {})
}

// ── Hero video click-to-fullscreen ────────────────────────────
const video = document.querySelector('.video-fullscreen')

if (video) {
    video.addEventListener('click', () => {
        video.classList.add('fade-transition')
        setTimeout(() => {
            video.currentTime = 0
            video.muted = false
            video.play()
            video.controls = true
            video.style.cursor = 'default'
            video.style.pointerEvents = 'none'

            if (video.requestFullscreen) {
                video.requestFullscreen()
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen()
            } else if (video.msRequestFullscreen) {
                video.msRequestFullscreen()
            }
            video.classList.remove('fade-transition')
        }, 300)
    })

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            video.muted = true
            video.controls = false
            video.style.cursor = 'pointer'
            video.style.pointerEvents = 'auto'
        }
    })
}

// ── Load events from Supabase ─────────────────────────────────
;(async () => {
    const { data: events } = await supabase.from('events').select('*')
    if (!events) return

    for (const ev of events) {
        const t = ev.type
        const arcEl = document.getElementById(`event-${t}-arc`)
        const locationEl = document.getElementById(`event-${t}-location`)
        const descEl = document.getElementById(`event-${t}-desc`)
        const dateEl = document.getElementById(`event-${t}-date`)

        if (arcEl) arcEl.textContent = [ev.arc, ev.episode_chapter].filter(Boolean).join(' — ')
        if (locationEl) locationEl.textContent = ev.location || ''
        if (descEl) descEl.childNodes[0].textContent = ev.description ? ev.description + ' ' : ''
        if (dateEl) dateEl.textContent = ev.event_date || ''
    }
})()
