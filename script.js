// ── Preloader ─────────────────────────────────────────────────

const preloader = document.getElementById('preloader');
const heroVideo = document.getElementById('hero-video');

// Vérifie si le site a déjà été lancé dans cette session
const alreadyLoaded = sessionStorage.getItem('siteLoaded');

if (preloader) {

    // Si déjà visité → supprime directement le preloader
    if (alreadyLoaded) {

        preloader.remove();
        document.body.classList.remove('loading');
        if (heroVideo) heroVideo.play();

    } else {

        // Première ouverture du site
        sessionStorage.setItem('siteLoaded', 'true');

        setTimeout(() => {

            // 1. Fade out du preloader
            preloader.classList.add('hidden');

            // 2. Révèle le site
            document.body.classList.remove('loading');
            if (heroVideo) heroVideo.play();

            // 3. Supprime le preloader du DOM
            setTimeout(() => preloader.remove(), 750);

        }, 3500);
    }
} else {
    if (heroVideo) heroVideo.play();
}

const video = document.querySelector('.video-fullscreen');

video.addEventListener("click", () => {
    video.classList.add("fade-transition");
    setTimeout(() => {
        video.currentTime = 0;
        video.muted = false;
        video.play();
        video.controls = true;
        video.style.cursor = "default";
        video.style.pointerEvents = "none";

    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) { 
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
    video.classList.remove("fade-transition");
    }, 300);
});

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        video.muted = true;
        video.controls = false;
        video.style.cursor = "pointer";
        video.style.pointerEvents = "auto";
    }
});