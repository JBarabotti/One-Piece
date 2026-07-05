import { supabase } from './supabase-client.js'
import { signOut } from './auth.js'

const NAV_HTML = `
  <a href="/index.html" class="logo">
    <img src="IMG/Logo.png" alt="Logo de One Piece" width="150">
  </a>
  <nav>
    <ul>
      <li><a href="/index.html">Accueil</a></li>
      <li>
        <a href="" class="monde">Monde <i class="fas fa-caret-right"></i></a>
        <div class="dropdown-menu-monde dropdown">
          <ul>
            <li>
              <a href="">Histoire <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-histoire dropdown1">
                <ul>
                  <li><a href="">Histoire du monde</a></li>
                  <li><a href="">Arcs de One Piece</a></li>
                </ul>
              </div>
            </li>
            <li>
              <a href="">Lieux <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-lieux dropdown1">
                <ul>
                  <li><a href="">East Blue</a></li>
                  <li><a href="">West Blue</a></li>
                  <li><a href="">North Blue</a></li>
                  <li><a href="">South Blue</a></li>
                  <li><a href="">Grand Line</a></li>
                  <li><a href="">Hors des mers principales</a></li>
                </ul>
              </div>
            </li>
            <li>
              <a href="">Fruits du démon <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-fruits dropdown1">
                <ul>
                  <li><a href="">Paramecia</a></li>
                  <li><a href="">Zoan</a></li>
                  <li><a href="">Logia</a></li>
                  <li><a href="">Zoan Mythiques</a></li>
                  <li><a href="">Éveil (Awakening)</a></li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </li>
      <li>
        <a href="/personnages.html">Personnages <i class="fas fa-caret-right"></i></a>
        <div class="dropdown-menu-personnages dropdown">
          <ul>
            <li>
              <a href="/personnages.html?cat=pirates">Pirates <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-pirates dropdown1">
                <ul>
                  <li><a href="/personnages.html?sub=equipages-pirates">Équipages pirates</a></li>
                  <li><a href="/personnages.html?sub=empereurs-yonko">Empereurs (Yonko)</a></li>
                  <li><a href="/personnages.html?sub=supernovas-worst-generation">Supernovas / Worst Generation</a></li>
                  <li><a href="/personnages.html?sub=organisations-pirates">Organisations pirates</a></li>
                  <li><a href="/personnages.html?sub=grands-corsaires-shichibukai">Grands Corsaires (Shichibukai)</a></li>
                  <li><a href="/personnages.html?sub=pirates-legendaires-anciens">Pirates légendaires / anciens</a></li>
                  <li><a href="/personnages.html?sub=pirates-independants-solos">Pirates indépendants / solos</a></li>
                </ul>
              </div>
            </li>
            <li>
              <a href="/personnages.html?cat=gouvernement">Gouvernement <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-gouvernement dropdown1">
                <ul>
                  <li><a href="/personnages.html?sub=marine">Marine</a></li>
                  <li><a href="/personnages.html?sub=cipher-pol-cp">Cipher Pol (CP)</a></li>
                  <li><a href="/personnages.html?sub=dragons-celestes">Dragons Célestes</a></li>
                  <li><a href="/personnages.html?sub=haut-commandement">Haut Commandement</a></li>
                  <li><a href="/personnages.html?sub=unites-speciales">Unités spéciales</a></li>
                  <li><a href="/personnages.html?sub=allies-gouvernement">Alliés du Gouvernement</a></li>
                </ul>
              </div>
            </li>
            <li>
              <a href="/personnages.html?cat=revolutionnaires">Révolutionnaires <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-revolutionnaires dropdown1">
                <ul>
                  <li><a href="/personnages.html?sub=dirigeants-revolutionnaires">Dirigeants</a></li>
                  <li><a href="/personnages.html?sub=commandants-revolutionnaires">Commandants</a></li>
                  <li><a href="/personnages.html?sub=membres-importants-revolutionnaires">Membres importants</a></li>
                  <li><a href="/personnages.html?sub=allies-revolutionnaires">Alliés des révolutionnaires</a></li>
                  <li><a href="/personnages.html?sub=anciens-membres-allies-revolutionnaires">Anciens membres / alliés</a></li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </li>
      <li>
        <a href="">Médias <i class="fas fa-caret-right"></i></a>
        <div class="dropdown-menu-medias dropdown">
          <ul>
            <li>
              <a href="">Manga <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-manga dropdown1">
                <ul>
                  <li><a href="">Tomes</a></li>
                  <li><a href="">Chapitres</a></li>
                </ul>
              </div>
            </li>
            <li><a href="">Animé</a></li>
            <li><a href="">Collaborations</a></li>
          </ul>
        </div>
      </li>
    </ul>
  </nav>
  <div class="header-account" id="header-account">
    <div class="header-account-placeholder"></div>
  </div>
  <button class="burger-btn" id="burger-btn" aria-label="Menu" aria-expanded="false">
    <span class="burger-line"></span>
    <span class="burger-line"></span>
    <span class="burger-line"></span>
  </button>
`

const MOBILE_NAV_HTML = `
  <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
  <aside class="mobile-nav" id="mobile-nav" aria-hidden="true">
    <div class="mobile-nav-header">
      <a href="/index.html" class="mobile-nav-logo">
        <img src="/IMG/Logo.png" alt="One Piece" height="40">
      </a>
      <button class="mobile-nav-close" id="mobile-nav-close" aria-label="Fermer">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <nav class="mobile-nav-body">
      <ul class="mobile-nav-list">
        <li><a href="/index.html" class="mobile-nav-link">Accueil</a></li>
        <li class="mobile-nav-group">
          <button class="mobile-nav-group-btn" aria-expanded="false">
            Monde <i class="fas fa-chevron-down"></i>
          </button>
          <ul class="mobile-nav-sub">
            <li><a href="" class="mobile-nav-link">Histoire du monde</a></li>
            <li><a href="" class="mobile-nav-link">Arcs de One Piece</a></li>
            <li><a href="" class="mobile-nav-link">East Blue</a></li>
            <li><a href="" class="mobile-nav-link">Grand Line</a></li>
            <li><a href="" class="mobile-nav-link">Fruits du démon</a></li>
          </ul>
        </li>
        <li class="mobile-nav-group">
          <button class="mobile-nav-group-btn" aria-expanded="false">
            Personnages <i class="fas fa-chevron-down"></i>
          </button>
          <ul class="mobile-nav-sub">
            <li><a href="/personnages.html" class="mobile-nav-link mobile-nav-link--section">Tous les personnages</a></li>
            <li><a href="/personnages.html?cat=pirates" class="mobile-nav-link mobile-nav-link--cat">Pirates</a></li>
            <li><a href="/personnages.html?sub=equipages-pirates" class="mobile-nav-link mobile-nav-link--sub">Équipages pirates</a></li>
            <li><a href="/personnages.html?sub=empereurs-yonko" class="mobile-nav-link mobile-nav-link--sub">Empereurs (Yonko)</a></li>
            <li><a href="/personnages.html?sub=supernovas-worst-generation" class="mobile-nav-link mobile-nav-link--sub">Supernovas</a></li>
            <li><a href="/personnages.html?sub=organisations-pirates" class="mobile-nav-link mobile-nav-link--sub">Organisations pirates</a></li>
            <li><a href="/personnages.html?sub=grands-corsaires-shichibukai" class="mobile-nav-link mobile-nav-link--sub">Grands Corsaires</a></li>
            <li><a href="/personnages.html?sub=pirates-legendaires-anciens" class="mobile-nav-link mobile-nav-link--sub">Pirates légendaires</a></li>
            <li><a href="/personnages.html?sub=pirates-independants-solos" class="mobile-nav-link mobile-nav-link--sub">Pirates solos</a></li>
            <li><a href="/personnages.html?cat=gouvernement" class="mobile-nav-link mobile-nav-link--cat">Gouvernement</a></li>
            <li><a href="/personnages.html?sub=marine" class="mobile-nav-link mobile-nav-link--sub">Marine</a></li>
            <li><a href="/personnages.html?sub=cipher-pol-cp" class="mobile-nav-link mobile-nav-link--sub">Cipher Pol (CP)</a></li>
            <li><a href="/personnages.html?sub=dragons-celestes" class="mobile-nav-link mobile-nav-link--sub">Dragons Célestes</a></li>
            <li><a href="/personnages.html?sub=haut-commandement" class="mobile-nav-link mobile-nav-link--sub">Haut Commandement</a></li>
            <li><a href="/personnages.html?sub=unites-speciales" class="mobile-nav-link mobile-nav-link--sub">Unités spéciales</a></li>
            <li><a href="/personnages.html?sub=allies-gouvernement" class="mobile-nav-link mobile-nav-link--sub">Alliés Gouvernement</a></li>
            <li><a href="/personnages.html?cat=revolutionnaires" class="mobile-nav-link mobile-nav-link--cat">Révolutionnaires</a></li>
            <li><a href="/personnages.html?sub=dirigeants-revolutionnaires" class="mobile-nav-link mobile-nav-link--sub">Dirigeants</a></li>
            <li><a href="/personnages.html?sub=commandants-revolutionnaires" class="mobile-nav-link mobile-nav-link--sub">Commandants</a></li>
            <li><a href="/personnages.html?sub=membres-importants-revolutionnaires" class="mobile-nav-link mobile-nav-link--sub">Membres importants</a></li>
            <li><a href="/personnages.html?sub=allies-revolutionnaires" class="mobile-nav-link mobile-nav-link--sub">Alliés</a></li>
            <li><a href="/personnages.html?sub=anciens-membres-allies-revolutionnaires" class="mobile-nav-link mobile-nav-link--sub">Anciens membres</a></li>
          </ul>
        </li>
        <li class="mobile-nav-group">
          <button class="mobile-nav-group-btn" aria-expanded="false">
            Médias <i class="fas fa-chevron-down"></i>
          </button>
          <ul class="mobile-nav-sub">
            <li><a href="" class="mobile-nav-link">Tomes</a></li>
            <li><a href="" class="mobile-nav-link">Chapitres</a></li>
            <li><a href="" class="mobile-nav-link">Animé</a></li>
            <li><a href="" class="mobile-nav-link">Collaborations</a></li>
          </ul>
        </li>
      </ul>
    </nav>
    <div class="mobile-nav-account" id="mobile-nav-account"></div>
  </aside>
`

export async function initHeader() {
  const headerEl = document.getElementById('site-header')
  if (!headerEl) return
  headerEl.innerHTML = NAV_HTML

  document.body.insertAdjacentHTML('beforeend', MOBILE_NAV_HTML)

  setupBurger()
  setupMobileGroupToggles()
  await updateHeaderAuth()
}

function setupBurger() {
  const btn = document.getElementById('burger-btn')
  const nav = document.getElementById('mobile-nav')
  const overlay = document.getElementById('mobile-nav-overlay')
  const closeBtn = document.getElementById('mobile-nav-close')

  function openNav() {
    nav.classList.add('open')
    overlay.classList.add('open')
    nav.setAttribute('aria-hidden', 'false')
    btn.setAttribute('aria-expanded', 'true')
    btn.classList.add('open')
    document.body.style.overflow = 'hidden'
  }

  function closeNav() {
    nav.classList.remove('open')
    overlay.classList.remove('open')
    nav.setAttribute('aria-hidden', 'true')
    btn.setAttribute('aria-expanded', 'false')
    btn.classList.remove('open')
    document.body.style.overflow = ''
  }

  btn?.addEventListener('click', openNav)
  closeBtn?.addEventListener('click', closeNav)
  overlay?.addEventListener('click', closeNav)
}

function setupMobileGroupToggles() {
  document.querySelectorAll('.mobile-nav-group-btn').forEach(btn => {
    const sub = btn.nextElementSibling
    if (!sub) return
    sub.style.maxHeight = '0'
    sub.style.overflow = 'hidden'
    sub.style.transition = 'max-height 0.3s ease'

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true'
      document.querySelectorAll('.mobile-nav-group-btn[aria-expanded="true"]').forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false')
          other.nextElementSibling.style.maxHeight = '0'
        }
      })
      btn.setAttribute('aria-expanded', String(!isOpen))
      sub.style.maxHeight = isOpen ? '0' : sub.scrollHeight + 'px'
    })
  })
}

export async function updateHeaderAuth() {
  const accountEl = document.getElementById('header-account')
  const mobileAccountEl = document.getElementById('mobile-nav-account')
  if (!accountEl) return

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      const avatarContent = profile.avatar_url
        ? `<img src="${profile.avatar_url}" alt="${profile.username}" class="header-avatar-img">`
        : `<span class="header-avatar-initial">${profile.username[0].toUpperCase()}</span>`

      accountEl.innerHTML = `
        <div class="header-user-menu">
          <a href="/profile.html" class="header-user-link">
            <div class="header-avatar-circle">${avatarContent}</div>
            <span class="header-username-label">${profile.username}</span>
          </a>
          <div class="header-user-dropdown">
            <div class="header-user-dropdown-inner">
              <a href="/profile.html"><i class="fas fa-user"></i> Profil</a>
              <a href="/messages.html"><i class="fas fa-envelope"></i> Messages</a>
              ${profile.role === 'admin' ? `<a href="/admin.html"><i class="fas fa-crown"></i> Admin</a>` : ''}
              <button class="header-signout-btn" id="header-signout"><i class="fas fa-sign-out-alt"></i> Déconnexion</button>
            </div>
          </div>
        </div>
      `
      document.getElementById('header-signout')?.addEventListener('click', signOut)

      if (mobileAccountEl) {
        mobileAccountEl.innerHTML = `
          <a href="/profile.html" class="mobile-nav-account-link">
            <div class="mobile-nav-avatar">${avatarContent}</div>
            <span>${profile.username}</span>
          </a>
          <a href="/profile.html" class="mobile-nav-link"><i class="fas fa-user"></i> Profil</a>
          <a href="/messages.html" class="mobile-nav-link"><i class="fas fa-envelope"></i> Messages</a>
          ${profile.role === 'admin' ? `<a href="/admin.html" class="mobile-nav-link"><i class="fas fa-crown"></i> Admin</a>` : ''}
          <button class="mobile-nav-signout" id="mobile-nav-signout"><i class="fas fa-sign-out-alt"></i> Déconnexion</button>
        `
        document.getElementById('mobile-nav-signout')?.addEventListener('click', signOut)
      }
    }
  } else {
    accountEl.innerHTML = `
      <a href="/login.html" class="header-compte-btn">
        <i class="fas fa-user"></i>
        <span>Compte</span>
      </a>
    `
    if (mobileAccountEl) {
      mobileAccountEl.innerHTML = `
        <a href="/login.html" class="mobile-nav-link mobile-nav-link--cta">
          <i class="fas fa-user"></i> Se connecter
        </a>
      `
    }
  }
}
