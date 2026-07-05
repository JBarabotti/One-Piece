import { supabase } from './supabase-client.js'
import { requireAdmin, getProfileByUsername, signOut } from './auth.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

let adminUser = null
let adminProfile = null
let eventIds = { anime: null, manga: null }

const PANEL_TITLES = {
  dashboard: 'Tableau de bord',
  users: 'Utilisateurs',
  characters: 'Personnages',
  'event-anime': 'Évènement Animé',
  'event-manga': 'Évènement Manga',
  'send-message': 'Messagerie',
}

// ── Init ──────────────────────────────────────────────────────
;(async () => {
  const result = await requireAdmin()
  if (!result) return
  adminUser = result.user
  adminProfile = result.profile

  renderSidebarUser()
  setupSidebar()
  setupSignout()

  await Promise.all([loadStats(), loadUsers(), loadEvents()])
  setupEventEditors()
  setupAdminMessage()
  setupCharacters()
})()

// ── Sidebar user ──────────────────────────────────────────────
function renderSidebarUser() {
  document.getElementById('sidebar-username').textContent = adminProfile.username
  const avatarEl = document.getElementById('sidebar-avatar')
  if (adminProfile.avatar_url) {
    avatarEl.innerHTML = `<img src="${adminProfile.avatar_url}" alt="${adminProfile.username}">`
  } else {
    avatarEl.textContent = adminProfile.username[0].toUpperCase()
  }
}

// ── Sidebar navigation ────────────────────────────────────────
function setupSidebar() {
  const toggle = document.getElementById('menu-toggle')
  const sidebar = document.getElementById('admin-sidebar')
  const overlay = document.getElementById('sidebar-overlay')

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open')
    overlay.classList.toggle('open')
  })

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open')
    overlay.classList.remove('open')
  })

  document.querySelectorAll('.admin-nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPanel(btn.dataset.panel)
      // Auto-close sidebar on mobile
      sidebar.classList.remove('open')
      overlay.classList.remove('open')
    })
  })
}

function switchPanel(id) {
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'))
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'))

  document.querySelector(`.admin-nav-item[data-panel="${id}"]`)?.classList.add('active')
  document.getElementById(`panel-${id}`)?.classList.add('active')
  document.getElementById('topbar-title').textContent = PANEL_TITLES[id] || id
}

// ── Signout ───────────────────────────────────────────────────
function setupSignout() {
  document.getElementById('admin-signout').addEventListener('click', signOut)
}

// ── Alert ─────────────────────────────────────────────────────
function showAlert(msg, type = 'success') {
  const el = document.getElementById('alert-global')
  el.innerHTML = `<div class="dash-alert ${type}">${msg}</div>`
  setTimeout(() => { el.innerHTML = '' }, 4000)
}

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  const [{ count: userCount }, { count: msgCount }, pirateData, marineData, { count: charCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('faction', 'pirate'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('faction', 'marine'),
    supabase.from('characters').select('*', { count: 'exact', head: true }),
  ])

  document.getElementById('stat-users').textContent = userCount ?? '—'
  document.getElementById('stat-messages').textContent = msgCount ?? '—'
  document.getElementById('stat-pirates').textContent = pirateData.count ?? '—'
  document.getElementById('stat-marines').textContent = marineData.count ?? '—'
  document.getElementById('stat-characters').textContent = charCount ?? '—'

  // Recent users (last 5)
  const { data: recent } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const tbody = document.getElementById('recent-users-tbody')
  if (!recent?.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#475569;text-align:center;padding:20px;">Aucun utilisateur.</td></tr>'
    return
  }

  tbody.innerHTML = recent.map(u => {
    const avatarContent = u.avatar_url
      ? `<img src="${u.avatar_url}" alt="${u.username}">`
      : u.username[0].toUpperCase()
    const faction = u.faction
      ? `<span class="faction-pill ${u.faction}">${u.faction.charAt(0).toUpperCase() + u.faction.slice(1)}</span>`
      : '<span style="color:#475569;">—</span>'

    return `<tr>
      <td>
        <div class="user-cell">
          <div class="user-cell-avatar">${avatarContent}</div>
          <span class="user-cell-name">${u.username}</span>
        </div>
      </td>
      <td>${faction}</td>
      <td><span class="role-pill ${u.role}">${u.role}</span></td>
      <td style="color:#64748B;">${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>`
  }).join('')
}

// ── Users table ───────────────────────────────────────────────
async function loadUsers() {
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const tbody = document.getElementById('users-tbody')
  if (!users?.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#475569;text-align:center;padding:20px;">Aucun utilisateur.</td></tr>'
    return
  }

  tbody.innerHTML = users.map(u => {
    const isMe = u.id === adminUser.id
    const avatarContent = u.avatar_url ? `<img src="${u.avatar_url}" alt="${u.username}">` : u.username[0].toUpperCase()
    const faction = u.faction
      ? `<span class="faction-pill ${u.faction}">${u.faction.charAt(0).toUpperCase() + u.faction.slice(1)}</span>`
      : '<span style="color:#475569;">—</span>'

    return `<tr>
      <td>
        <div class="user-cell">
          <div class="user-cell-avatar">${avatarContent}</div>
          <span class="user-cell-name">${u.username}</span>
        </div>
      </td>
      <td style="color:#64748B;font-size:12px;">${u.email || '—'}</td>
      <td>${faction}</td>
      <td><span class="role-pill ${u.role}">${u.role}</span></td>
      <td style="color:#64748B;font-size:12px;">${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
      <td>
        ${isMe
          ? '<span style="color:#475569;font-size:12px;">Vous</span>'
          : `<div class="table-actions">
              <select class="table-select" data-user-id="${u.id}">
                <option value="user" ${u.role === 'user' ? 'selected' : ''}>Utilisateur</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
              <button class="btn-table-save" data-save-role="${u.id}">Sauver</button>
              <button class="btn-table-delete" data-delete-user="${u.id}" data-username="${u.username}">Supprimer</button>
            </div>`
        }
      </td>
    </tr>`
  }).join('')

  // Role change
  tbody.querySelectorAll('[data-save-role]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.saveRole
      const select = tbody.querySelector(`select[data-user-id="${userId}"]`)
      const { error } = await supabase.from('profiles').update({ role: select.value }).eq('id', userId)
      if (error) { showAlert(error.message, 'error') } else { showAlert('Rôle mis à jour.'); loadUsers() }
    })
  })

  // Delete user
  tbody.querySelectorAll('[data-delete-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.deleteUser
      const username = btn.dataset.username
      if (!confirm(`Supprimer définitivement le compte de ${username} ?`)) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-delete-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erreur')
        showAlert(`Compte de ${username} supprimé.`)
        loadUsers()
        loadStats()
      } catch (err) {
        showAlert(err.message, 'error')
      }
    })
  })
}

// ── Events ────────────────────────────────────────────────────
async function loadEvents() {
  const { data: events } = await supabase.from('events').select('*')
  if (!events) return

  for (const ev of events) {
    eventIds[ev.type] = ev.id
    const editor = document.getElementById(`event-editor-${ev.type}`)
    if (!editor) continue
    editor.querySelectorAll('.event-field-input[data-key]').forEach(input => {
      input.value = ev[input.dataset.key] || ''
    })
  }
}

function setupEventEditors() {
  document.querySelectorAll('.btn-save-primary[data-type]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type
      const editor = document.getElementById(`event-editor-${type}`)
      const fields = {}
      editor.querySelectorAll('.event-field-input[data-key]').forEach(input => {
        fields[input.dataset.key] = input.value.trim()
      })
      fields.updated_by = adminUser.id
      fields.updated_at = new Date().toISOString()

      let error
      if (eventIds[type]) {
        ;({ error } = await supabase.from('events').update(fields).eq('id', eventIds[type]))
      } else {
        const { data, error: ie } = await supabase.from('events').insert({ ...fields, type }).select().maybeSingle()
        error = ie
        if (data) eventIds[type] = data.id
      }

      if (error) { showAlert(error.message, 'error') } else { showAlert(`Évènement ${type} mis à jour.`) }
    })
  })
}

// ── Admin message ─────────────────────────────────────────────
function setupAdminMessage() {
  let targetUserId = null
  const usernameInput = document.getElementById('msg-target-username')
  const statusEl = document.getElementById('msg-target-status')
  let lookupTimeout = null

  usernameInput.addEventListener('input', () => {
    const val = usernameInput.value.trim()
    clearTimeout(lookupTimeout)
    statusEl.textContent = ''
    targetUserId = null
    if (val.length < 2) return

    lookupTimeout = setTimeout(async () => {
      const profile = await getProfileByUsername(val)
      if (!profile) {
        statusEl.style.color = '#FCA5A5'
        statusEl.textContent = '✗ Utilisateur introuvable.'
      } else {
        statusEl.style.color = '#6EE7B7'
        statusEl.textContent = `✓ ${profile.username} trouvé.`
        targetUserId = profile.id
      }
    }, 400)
  })

  document.getElementById('admin-send-msg-btn').addEventListener('click', async () => {
    const content = document.getElementById('msg-content').value.trim()
    if (!targetUserId) { showAlert('Sélectionnez un destinataire valide.', 'error'); return }
    if (!content) { showAlert('Le message est vide.', 'error'); return }

    const { error } = await supabase.from('messages').insert({
      sender_id: adminUser.id,
      receiver_id: targetUserId,
      content
    })

    if (error) { showAlert(error.message, 'error') } else {
      document.getElementById('msg-content').value = ''
      showAlert('Message envoyé.')
    }
  })
}

// ── Characters management ─────────────────────────────────────
let charsCategories = []
let charsAll = []
let charsActiveCat = null
let charsDeleteTarget = null

function setupCharacters() {
  document.getElementById('btn-add-character').addEventListener('click', () => openCharForm())
  document.getElementById('btn-chars-back').addEventListener('click', showCharList)
  document.getElementById('btn-char-cancel').addEventListener('click', showCharList)
  document.getElementById('btn-char-save').addEventListener('click', saveCharacter)
  document.getElementById('btn-char-delete-confirm').addEventListener('click', confirmDeleteChar)
  document.getElementById('btn-char-delete-cancel').addEventListener('click', () => {
    document.getElementById('chars-delete-modal').style.display = 'none'
  })
  document.getElementById('chars-cat-filter').addEventListener('change', (e) => {
    charsActiveCat = e.target.value || null
    renderCharList()
  })

  // Load when panel is first opened
  document.querySelector('.admin-nav-item[data-panel="characters"]').addEventListener('click', loadCharacters)
}

async function loadCharacters() {
  const [{ data: cats }, { data: chars }] = await Promise.all([
    supabase.from('character_categories').select('*').order('sort_order'),
    supabase.from('characters').select('*, character_categories(name)').order('sort_order'),
  ])
  charsCategories = cats || []
  charsAll = chars || []
  renderCatTabs()
  renderCatFilterSelect()
  renderCharList()
  populateCatSelect()
}

function renderCatTabs() {
  const el = document.getElementById('chars-category-tabs')
  el.innerHTML = `<button class="chars-cat-tab${!charsActiveCat ? ' active' : ''}" data-cat="">Tous</button>` +
    charsCategories.map(c =>
      `<button class="chars-cat-tab${charsActiveCat === c.id ? ' active' : ''}" data-cat="${c.id}">${c.name}</button>`
    ).join('')
  el.querySelectorAll('.chars-cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      charsActiveCat = btn.dataset.cat || null
      document.getElementById('chars-cat-filter').value = charsActiveCat || ''
      el.querySelectorAll('.chars-cat-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      renderCharList()
    })
  })
}

function renderCatFilterSelect() {
  const sel = document.getElementById('chars-cat-filter')
  sel.innerHTML = '<option value="">Toutes les catégories</option>' +
    charsCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
}

function populateCatSelect() {
  const sel = document.getElementById('char-category')
  sel.innerHTML = '<option value="">Choisir une catégorie</option>' +
    charsCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
}

function renderCharList() {
  const filtered = charsActiveCat
    ? charsAll.filter(c => c.category_id === charsActiveCat)
    : charsAll

  const container = document.getElementById('chars-list-content')

  if (!filtered.length) {
    container.innerHTML = '<div class="chars-empty">Aucun personnage. Cliquez sur <strong>Ajouter</strong> pour commencer.</div>'
    return
  }

  // Group by category
  const groups = {}
  filtered.forEach(c => {
    const key = c.category_id
    if (!groups[key]) groups[key] = { name: c.character_categories?.name || 'Sans catégorie', items: [] }
    groups[key].items.push(c)
  })

  container.innerHTML = Object.values(groups).map(g => `
    <div class="chars-group">
      <div class="chars-group-header">${g.name} <span class="chars-group-count">${g.items.length}</span></div>
      <div class="chars-grid">
        ${g.items.map(c => renderCharCard(c)).join('')}
      </div>
    </div>
  `).join('')

  container.querySelectorAll('[data-edit-char]').forEach(btn => {
    btn.addEventListener('click', () => openCharForm(btn.dataset.editChar))
  })
  container.querySelectorAll('[data-delete-char]').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.deleteChar, btn.dataset.charName))
  })
}

function renderCharCard(c) {
  const statusClass = c.status === 'alive' ? 'chars-status-alive' : c.status === 'dead' ? 'chars-status-dead' : 'chars-status-unknown'
  const statusLabel = c.status === 'alive' ? 'Vivant' : c.status === 'dead' ? 'Mort' : 'Inconnu'
  const img = c.image_url
    ? `<img src="${c.image_url}" alt="${c.name}" class="chars-card-img">`
    : `<div class="chars-card-img-placeholder"><i class="fas fa-user"></i></div>`
  return `
    <div class="chars-card">
      ${img}
      <div class="chars-card-body">
        <div class="chars-card-name">${c.name}</div>
        ${c.role ? `<div class="chars-card-role">${c.role}</div>` : ''}
        <div class="chars-card-meta">
          ${c.faction ? `<span class="faction-pill ${c.faction}">${c.faction.charAt(0).toUpperCase()+c.faction.slice(1)}</span>` : ''}
          <span class="chars-status-pill ${statusClass}">${statusLabel}</span>
        </div>
        <div class="chars-card-actions">
          <button class="btn-table-save" data-edit-char="${c.id}"><i class="fas fa-pencil-alt"></i> Modifier</button>
          <button class="btn-table-delete" data-delete-char="${c.id}" data-char-name="${c.name}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`
}

function showCharList() {
  document.getElementById('chars-view-form').style.display = 'none'
  document.getElementById('chars-view-list').style.display = 'block'
  document.getElementById('chars-delete-modal').style.display = 'none'
}

function openCharForm(charId = null) {
  document.getElementById('chars-view-list').style.display = 'none'
  document.getElementById('chars-view-form').style.display = 'block'

  const title = document.getElementById('chars-form-title')
  const idInput = document.getElementById('char-edit-id')

  if (charId) {
    const c = charsAll.find(x => x.id === charId)
    if (!c) return
    title.innerHTML = '<i class="fas fa-pencil-alt"></i> Modifier le personnage'
    idInput.value = c.id
    document.getElementById('char-name').value = c.name || ''
    document.getElementById('char-category').value = c.category_id || ''
    document.getElementById('char-role').value = c.role || ''
    document.getElementById('char-faction').value = c.faction || ''
    document.getElementById('char-status').value = c.status || 'alive'
    document.getElementById('char-bounty').value = c.bounty || ''
    document.getElementById('char-devil-fruit').value = c.devil_fruit || ''
    document.getElementById('char-sort').value = c.sort_order ?? 0
    document.getElementById('char-image-url').value = c.image_url || ''
    document.getElementById('char-description').value = c.description || ''
  } else {
    title.innerHTML = '<i class="fas fa-plus"></i> Ajouter un personnage'
    idInput.value = ''
    document.getElementById('char-name').value = ''
    document.getElementById('char-category').value = ''
    document.getElementById('char-role').value = ''
    document.getElementById('char-faction').value = ''
    document.getElementById('char-status').value = 'alive'
    document.getElementById('char-bounty').value = ''
    document.getElementById('char-devil-fruit').value = ''
    document.getElementById('char-sort').value = '0'
    document.getElementById('char-image-url').value = ''
    document.getElementById('char-description').value = ''
  }
}

async function saveCharacter() {
  const id = document.getElementById('char-edit-id').value
  const name = document.getElementById('char-name').value.trim()
  const category_id = document.getElementById('char-category').value

  if (!name) { showAlert('Le nom est requis.', 'error'); return }
  if (!category_id) { showAlert('Choisissez une catégorie.', 'error'); return }

  const payload = {
    name,
    category_id,
    role: document.getElementById('char-role').value.trim() || null,
    faction: document.getElementById('char-faction').value || null,
    status: document.getElementById('char-status').value,
    bounty: document.getElementById('char-bounty').value.trim() || null,
    devil_fruit: document.getElementById('char-devil-fruit').value.trim() || null,
    sort_order: parseInt(document.getElementById('char-sort').value) || 0,
    image_url: document.getElementById('char-image-url').value.trim() || null,
    description: document.getElementById('char-description').value.trim() || null,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    ;({ error } = await supabase.from('characters').update(payload).eq('id', id))
  } else {
    ;({ error } = await supabase.from('characters').insert(payload))
  }

  if (error) { showAlert(error.message, 'error'); return }

  showAlert(id ? 'Personnage mis à jour.' : 'Personnage ajouté.')
  await loadCharacters()
  loadStats()
  showCharList()
}

function openDeleteModal(charId, charName) {
  charsDeleteTarget = charId
  document.getElementById('chars-delete-name').textContent = charName
  document.getElementById('chars-delete-modal').style.display = 'flex'
}

async function confirmDeleteChar() {
  if (!charsDeleteTarget) return
  const { error } = await supabase.from('characters').delete().eq('id', charsDeleteTarget)
  if (error) { showAlert(error.message, 'error'); return }
  showAlert('Personnage supprimé.')
  charsDeleteTarget = null
  document.getElementById('chars-delete-modal').style.display = 'none'
  await loadCharacters()
  loadStats()
}
