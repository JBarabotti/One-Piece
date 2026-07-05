import { supabase } from './supabase-client.js'
import { initHeader, updateHeaderAuth } from './header.js'
import { requireAuth, getProfileByUsername } from './auth.js'
import { openCropModal } from './crop-modal.js'

initHeader()

let currentUser = null
let profile = null

const FACTION_LABELS = { pirate: 'Pirate', marine: 'Marine', revolutionnaire: 'Révolutionnaire' }

function showGlobal(msg, type = 'success') {
  const el = document.getElementById('alert-global')
  el.innerHTML = `<div class="alert alert-${type}" style="margin-bottom:18px;">${msg}</div>`
  setTimeout(() => { el.innerHTML = '' }, 4000)
}

function renderFactionBadge(faction) {
  if (!faction) return '<span class="profile-faction-badge badge-none">Aucune faction</span>'
  const cls = `badge-${faction}`
  const icon = faction === 'pirate' ? 'skull-crossbones' : faction === 'marine' ? 'anchor' : 'fist-raised'
  return `<span class="profile-faction-badge ${cls}"><i class="fas fa-${icon}"></i> ${FACTION_LABELS[faction]}</span>`
}

function renderAvatarDisplay(p) {
  const el = document.getElementById('profile-avatar-display')
  if (p.avatar_url) {
    el.innerHTML = `<img src="${p.avatar_url}" alt="${p.username}" class="profile-avatar-big">`
  } else {
    el.innerHTML = `<div class="profile-avatar-initial-big">${p.username[0].toUpperCase()}</div>`
  }
}

function applyFactionTheme(faction) {
  document.body.dataset.faction = faction || 'none'
}

async function loadProfile() {
  currentUser = await requireAuth()
  if (!currentUser) return

  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle()
  if (!data) return
  profile = data

  applyFactionTheme(profile.faction)
  renderAvatarDisplay(profile)
  document.getElementById('profile-username-display').textContent = profile.username
  document.getElementById('profile-faction-badge').innerHTML = renderFactionBadge(profile.faction)
  document.getElementById('profile-email-display').textContent = profile.email || currentUser.email || ''
  document.getElementById('username-val').textContent = profile.username
  document.getElementById('faction-val').innerHTML = renderFactionBadge(profile.faction)
}

loadProfile()

// ── Avatar tab switching ──────────────────────────────────────
document.querySelectorAll('.profile-avatar-option-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.profile-avatar-option-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    const which = tab.dataset.tab
    document.getElementById('avatar-tab-upload').style.display = which === 'upload' ? 'block' : 'none'
    document.getElementById('avatar-tab-gallery').style.display = which === 'gallery' ? 'block' : 'none'
    if (which === 'gallery') loadPresetAvatars()
  })
})

// ── Preset avatar gallery ─────────────────────────────────────
let presetsLoaded = false

async function loadPresetAvatars() {
  if (presetsLoaded) return
  presetsLoaded = true

  const { data, error } = await supabase
    .from('preset_avatars')
    .select('*')
    .eq('active', true)
    .order('sort_order')

  const grid = document.getElementById('preset-avatars-grid')
  if (error || !data?.length) {
    grid.innerHTML = '<div class="preset-empty">Aucun avatar disponible pour le moment.</div>'
    return
  }

  grid.innerHTML = data.map(a => `
    <button class="preset-avatar-item" data-url="${a.image_url}" title="${a.name || ''}">
      <img src="${a.image_url}" alt="${a.name || ''}">
      ${a.name ? `<span class="preset-avatar-name">${a.name}</span>` : ''}
    </button>`).join('')

  grid.querySelectorAll('.preset-avatar-item').forEach(btn => {
    btn.addEventListener('click', () => selectPresetAvatar(btn.dataset.url))
  })
}

async function selectPresetAvatar(url) {
  if (!currentUser) return
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUser.id)
  if (error) { showGlobal(error.message, 'error'); return }

  profile.avatar_url = url
  renderAvatarDisplay(profile)
  updateHeaderAuth()
  showGlobal('Avatar mis à jour.')

  // Highlight selected
  document.querySelectorAll('.preset-avatar-item').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.url === url)
  })
}

// ── Avatar upload ─────────────────────────────────────────────
document.getElementById('avatar-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file || !currentUser) return
  e.target.value = ''

  let blob
  try {
    blob = await openCropModal(file)
  } catch {
    return
  }

  const path = `${currentUser.id}/avatar.jpg`
  const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (upErr) { showGlobal(upErr.message, 'error'); return }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = urlData.publicUrl + `?v=${Date.now()}`

  const { error: updateErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id)
  if (updateErr) { showGlobal(updateErr.message, 'error'); return }

  profile.avatar_url = avatarUrl
  renderAvatarDisplay(profile)
  updateHeaderAuth()
  showGlobal('Photo de profil mise à jour.')
})

// ── Username edit ─────────────────────────────────────────────
document.getElementById('username-edit-btn').addEventListener('click', () => {
  document.getElementById('username-edit-form').style.display = 'block'
  document.getElementById('username-edit-btn').style.display = 'none'
  document.getElementById('username-new-input').value = profile.username
})

document.getElementById('username-cancel-btn').addEventListener('click', () => {
  document.getElementById('username-edit-form').style.display = 'none'
  document.getElementById('username-edit-btn').style.display = 'inline-flex'
  document.getElementById('username-check-status').textContent = ''
})

let usernameCheckTimeout = null
document.getElementById('username-new-input').addEventListener('input', () => {
  const val = document.getElementById('username-new-input').value.trim()
  const status = document.getElementById('username-check-status')
  clearTimeout(usernameCheckTimeout)
  status.textContent = ''
  if (val.length < 3 || val === profile.username) return

  status.style.color = '#64748B'
  status.textContent = 'Vérification...'
  usernameCheckTimeout = setTimeout(async () => {
    const existing = await getProfileByUsername(val)
    if (existing) {
      status.style.color = '#FCA5A5'
      status.textContent = '✗ Nom d\'utilisateur déjà pris.'
    } else {
      status.style.color = '#6EE7B7'
      status.textContent = '✓ Disponible.'
    }
  }, 500)
})

document.getElementById('username-save-btn').addEventListener('click', async () => {
  const newUsername = document.getElementById('username-new-input').value.trim()
  const status = document.getElementById('username-check-status')

  if (newUsername === profile.username) {
    document.getElementById('username-cancel-btn').click()
    return
  }

  if (newUsername.length < 3) { status.style.color = '#FCA5A5'; status.textContent = 'Minimum 3 caractères.'; return }

  const existing = await getProfileByUsername(newUsername)
  if (existing) { status.style.color = '#FCA5A5'; status.textContent = '✗ Nom d\'utilisateur déjà pris.'; return }

  const { error } = await supabase.from('profiles').update({ username: newUsername }).eq('id', currentUser.id)
  if (error) { showGlobal(error.message, 'error'); return }

  profile.username = newUsername
  document.getElementById('profile-username-display').textContent = newUsername
  document.getElementById('username-val').textContent = newUsername
  document.getElementById('username-cancel-btn').click()
  updateHeaderAuth()
  showGlobal('Nom d\'utilisateur mis à jour.')
})

// ── Faction edit ──────────────────────────────────────────────
document.getElementById('faction-edit-btn').addEventListener('click', () => {
  window.location.href = '/faction.html?from=profile'
})

// ── Password edit ─────────────────────────────────────────────
document.getElementById('password-edit-btn').addEventListener('click', () => {
  document.getElementById('password-edit-form').style.display = 'block'
  document.getElementById('password-edit-btn').style.display = 'none'
})

document.getElementById('password-cancel-btn').addEventListener('click', () => {
  document.getElementById('password-edit-form').style.display = 'none'
  document.getElementById('password-edit-btn').style.display = 'inline-flex'
  document.getElementById('new-password-input').value = ''
  document.getElementById('confirm-password-input').value = ''
  document.getElementById('password-status').textContent = ''
})

document.getElementById('password-save-btn').addEventListener('click', async () => {
  const np = document.getElementById('new-password-input').value
  const cp = document.getElementById('confirm-password-input').value
  const st = document.getElementById('password-status')

  if (np.length < 8) { st.style.color = '#FCA5A5'; st.textContent = 'Minimum 8 caractères.'; return }
  if (np !== cp) { st.style.color = '#FCA5A5'; st.textContent = 'Les mots de passe ne correspondent pas.'; return }

  const { error } = await supabase.auth.updateUser({ password: np })
  if (error) { showGlobal(error.message, 'error'); return }

  document.getElementById('password-cancel-btn').click()
  showGlobal('Mot de passe mis à jour.')
})
