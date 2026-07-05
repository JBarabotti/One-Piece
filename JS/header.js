import { supabase } from './supabase-client.js'
import { signOut } from './auth.js'

const NAV_HTML = `
  <a href="/index.html" class="logo">
    <img src="/IMG/Logo.png" alt="Logo de One Piece" width="150">
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
        <a href="">Personnages <i class="fas fa-caret-right"></i></a>
        <div class="dropdown-menu-personnages dropdown">
          <ul>
            <li>
              <a href="">Pirates <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-pirates dropdown1">
                <ul>
                  <li><a href="">Équipages pirates</a></li>
                  <li><a href="">Empereurs (Yonko)</a></li>
                  <li><a href="">Supernovas / Worst Generation</a></li>
                  <li><a href="">Organisations pirates</a></li>
                  <li><a href="">Grands Corsaires (Shichibukai)</a></li>
                  <li><a href="">Pirates légendaires / anciens</a></li>
                  <li><a href="">Pirates indépendants / solos</a></li>
                </ul>
              </div>
            </li>
            <li>
              <a href="">Gouvernement <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-gouvernement dropdown1">
                <ul>
                  <li><a href="">Marine</a></li>
                  <li><a href="">Cipher Pol (CP)</a></li>
                  <li><a href="">Dragons Célestes</a></li>
                  <li><a href="">Haut Commandement</a></li>
                  <li><a href="">Unités spéciales</a></li>
                  <li><a href="">Alliés du Gouvernement</a></li>
                </ul>
              </div>
            </li>
            <li>
              <a href="">Révolutionnaires <i class="fas fa-caret-right"></i></a>
              <div class="dropdown-menu-revolutionnaires dropdown1">
                <ul>
                  <li><a href="">Dirigeants</a></li>
                  <li><a href="">Commandants</a></li>
                  <li><a href="">Membres importants</a></li>
                  <li><a href="">Alliés des révolutionnaires</a></li>
                  <li><a href="">Anciens membres / alliés</a></li>
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
`

export async function initHeader() {
  const headerEl = document.getElementById('site-header')
  if (!headerEl) return
  headerEl.innerHTML = NAV_HTML
  await updateHeaderAuth()
}

export async function updateHeaderAuth() {
  const accountEl = document.getElementById('header-account')
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
    }
  } else {
    accountEl.innerHTML = `
      <a href="/login.html" class="header-compte-btn">
        <i class="fas fa-user"></i>
        <span>Compte</span>
      </a>
    `
  }
}
