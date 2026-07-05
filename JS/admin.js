import { supabase } from './supabase-client.js'
import { requireAdmin, getProfileByUsername, signOut } from './auth.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

let adminUser = null
let adminProfile = null
let eventIds = { anime: null, manga: null }

const PANEL_TITLES = {
  dashboard: 'Tableau de bord',
  users: 'Utilisateurs',
  categories: 'Catégories',
  subcategories: 'Sous-catégories',
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
  setupCategories()
  setupSubcategories()
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

  tbody.querySelectorAll('[data-save-role]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.saveRole
      const select = tbody.querySelector(`select[data-user-id="${userId}"]`)
      const { error } = await supabase.from('profiles').update({ role: select.value }).eq('id', userId)
      if (error) { showAlert(error.message, 'error') } else { showAlert('Rôle mis à jour.'); loadUsers() }
    })
  })

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

// ══════════════════════════════════════════════════════════════
// CATEGORIES MANAGEMENT
// ══════════════════════════════════════════════════════════════
let catsAll = []
let catsDeleteTarget = null

function setupCategories() {
  document.getElementById('btn-add-category').addEventListener('click', () => openCatForm())
  document.getElementById('btn-cats-back').addEventListener('click', showCatList)
  document.getElementById('btn-cat-cancel').addEventListener('click', showCatList)
  document.getElementById('btn-cat-save').addEventListener('click', saveCategory)
  document.getElementById('btn-cat-delete-confirm').addEventListener('click', confirmDeleteCat)
  document.getElementById('btn-cat-delete-cancel').addEventListener('click', () => {
    document.getElementById('cats-delete-modal').style.display = 'none'
  })

  document.querySelector('.admin-nav-item[data-panel="categories"]').addEventListener('click', loadCategories)

  // Auto-generate slug from name
  document.getElementById('cat-name').addEventListener('input', () => {
    if (!document.getElementById('cat-edit-id').value) {
      document.getElementById('cat-slug').value = slugify(document.getElementById('cat-name').value)
    }
  })
}

async function loadCategories() {
  const { data, error } = await supabase
    .from('character_categories')
    .select('*, character_subcategories(id)')
    .order('sort_order')

  if (error) { showAlert(error.message, 'error'); return }
  catsAll = data || []
  renderCatList()
}

function renderCatList() {
  const container = document.getElementById('cats-list-content')
  if (!catsAll.length) {
    container.innerHTML = '<div class="chars-empty">Aucune catégorie. Cliquez sur <strong>Ajouter</strong> pour commencer.</div>'
    return
  }

  container.innerHTML = `<div class="chars-grid">${catsAll.map(c => `
    <div class="chars-card">
      <div class="chars-card-cat-icon" style="background:${c.color || '#64748B'}22;color:${c.color || '#64748B'}">
        <i class="fas fa-${c.icon || 'folder'}"></i>
      </div>
      <div class="chars-card-body">
        <div class="chars-card-name">${c.name}</div>
        <div class="chars-card-role" style="color:#64748b;font-size:12px;">/${c.slug}</div>
        <div class="chars-card-meta">
          <span class="chars-status-pill chars-status-unknown">${c.character_subcategories?.length || 0} sous-cat.</span>
        </div>
        <div class="chars-card-actions">
          <button class="btn-table-save" data-edit-cat="${c.id}"><i class="fas fa-pencil-alt"></i> Modifier</button>
          <button class="btn-table-delete" data-delete-cat="${c.id}" data-cat-name="${c.name}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('')}</div>`

  container.querySelectorAll('[data-edit-cat]').forEach(btn => {
    btn.addEventListener('click', () => openCatForm(btn.dataset.editCat))
  })
  container.querySelectorAll('[data-delete-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      catsDeleteTarget = btn.dataset.deleteCat
      document.getElementById('cats-delete-name').textContent = btn.dataset.catName
      document.getElementById('cats-delete-modal').style.display = 'flex'
    })
  })
}

function showCatList() {
  document.getElementById('cats-view-form').style.display = 'none'
  document.getElementById('cats-view-list').style.display = 'block'
  document.getElementById('cats-delete-modal').style.display = 'none'
}

function openCatForm(catId = null) {
  document.getElementById('cats-view-list').style.display = 'none'
  document.getElementById('cats-view-form').style.display = 'block'

  const title = document.getElementById('cats-form-title')
  const idInput = document.getElementById('cat-edit-id')

  if (catId) {
    const c = catsAll.find(x => x.id === catId)
    if (!c) return
    title.innerHTML = '<i class="fas fa-pencil-alt"></i> Modifier la catégorie'
    idInput.value = c.id
    document.getElementById('cat-name').value = c.name || ''
    document.getElementById('cat-slug').value = c.slug || ''
    document.getElementById('cat-icon').value = c.icon || ''
    document.getElementById('cat-color').value = c.color || ''
    document.getElementById('cat-sort').value = c.sort_order ?? 0
    document.getElementById('cat-description').value = c.description || ''
  } else {
    title.innerHTML = '<i class="fas fa-plus"></i> Ajouter une catégorie'
    idInput.value = ''
    document.getElementById('cat-name').value = ''
    document.getElementById('cat-slug').value = ''
    document.getElementById('cat-icon').value = ''
    document.getElementById('cat-color').value = ''
    document.getElementById('cat-sort').value = '0'
    document.getElementById('cat-description').value = ''
  }
}

async function saveCategory() {
  const id = document.getElementById('cat-edit-id').value
  const name = document.getElementById('cat-name').value.trim()
  const slug = document.getElementById('cat-slug').value.trim()

  if (!name) { showAlert('Le nom est requis.', 'error'); return }
  if (!slug) { showAlert('Le slug est requis.', 'error'); return }

  const payload = {
    name,
    slug,
    icon: document.getElementById('cat-icon').value.trim() || null,
    color: document.getElementById('cat-color').value.trim() || null,
    sort_order: parseInt(document.getElementById('cat-sort').value) || 0,
    description: document.getElementById('cat-description').value.trim() || null,
  }

  let error
  if (id) {
    ;({ error } = await supabase.from('character_categories').update(payload).eq('id', id))
  } else {
    ;({ error } = await supabase.from('character_categories').insert(payload))
  }

  if (error) { showAlert(error.message, 'error'); return }
  showAlert(id ? 'Catégorie mise à jour.' : 'Catégorie ajoutée.')
  await loadCategories()
  showCatList()
}

async function confirmDeleteCat() {
  if (!catsDeleteTarget) return
  const { error } = await supabase.from('character_categories').delete().eq('id', catsDeleteTarget)
  if (error) { showAlert(error.message, 'error'); return }
  showAlert('Catégorie supprimée.')
  catsDeleteTarget = null
  document.getElementById('cats-delete-modal').style.display = 'none'
  await loadCategories()
}

// ══════════════════════════════════════════════════════════════
// SUBCATEGORIES MANAGEMENT
// ══════════════════════════════════════════════════════════════
let subsAll = []
let subsCategories = []
let subsFilterCat = null
let subsDeleteTarget = null

function setupSubcategories() {
  document.getElementById('btn-add-subcategory').addEventListener('click', () => openSubForm())
  document.getElementById('btn-subs-back').addEventListener('click', showSubList)
  document.getElementById('btn-sub-cancel').addEventListener('click', showSubList)
  document.getElementById('btn-sub-save').addEventListener('click', saveSubcategory)
  document.getElementById('btn-sub-delete-confirm').addEventListener('click', confirmDeleteSub)
  document.getElementById('btn-sub-delete-cancel').addEventListener('click', () => {
    document.getElementById('subs-delete-modal').style.display = 'none'
  })

  document.querySelector('.admin-nav-item[data-panel="subcategories"]').addEventListener('click', loadSubcategories)

  // Auto-generate slug from name
  document.getElementById('sub-name').addEventListener('input', () => {
    if (!document.getElementById('sub-edit-id').value) {
      document.getElementById('sub-slug').value = slugify(document.getElementById('sub-name').value)
    }
  })
}

async function loadSubcategories() {
  const [{ data: cats }, { data: subs }] = await Promise.all([
    supabase.from('character_categories').select('*').order('sort_order'),
    supabase.from('character_subcategories').select('*, character_categories(name, color)').order('sort_order'),
  ])
  subsCategories = cats || []
  subsAll = subs || []
  renderSubFilterRow()
  renderSubList()
  populateSubCatSelect()
}

function renderSubFilterRow() {
  const row = document.getElementById('subs-filter-row')
  row.innerHTML = `
    <div class="chars-category-tabs">
      <button class="chars-group-tab${!subsFilterCat ? ' active' : ''}" data-filter-cat="">Toutes</button>
      ${subsCategories.map(c => `<button class="chars-group-tab${subsFilterCat === c.id ? ' active' : ''}" data-filter-cat="${c.id}" style="--gcolor:${c.color || '#64748b'}">${c.name}</button>`).join('')}
    </div>`

  row.querySelectorAll('[data-filter-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      subsFilterCat = btn.dataset.filterCat || null
      row.querySelectorAll('[data-filter-cat]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      renderSubList()
    })
  })
}

function renderSubList() {
  const container = document.getElementById('subs-list-content')
  const filtered = subsFilterCat
    ? subsAll.filter(s => s.category_id === subsFilterCat)
    : subsAll

  if (!filtered.length) {
    container.innerHTML = '<div class="chars-empty">Aucune sous-catégorie. Cliquez sur <strong>Ajouter</strong> pour commencer.</div>'
    return
  }

  container.innerHTML = `<div class="chars-grid">${filtered.map(s => {
    const catColor = s.character_categories?.color || '#64748B'
    return `
    <div class="chars-card">
      ${s.image_url
        ? `<img src="${s.image_url}" alt="${s.name}" class="chars-card-img">`
        : `<div class="chars-card-img-placeholder" style="background:${catColor}22;color:${catColor}"><i class="fas fa-users"></i></div>`}
      <div class="chars-card-body">
        <div class="chars-card-name">${s.name}</div>
        <div class="chars-card-role" style="color:#64748b;font-size:12px;">/${s.slug}</div>
        <div class="chars-card-meta">
          ${s.character_categories ? `<span class="chars-status-pill chars-status-unknown" style="background:${catColor}22;color:${catColor};border-color:${catColor}44">${s.character_categories.name}</span>` : ''}
        </div>
        <div class="chars-card-actions">
          <button class="btn-table-save" data-edit-sub="${s.id}"><i class="fas fa-pencil-alt"></i> Modifier</button>
          <button class="btn-table-delete" data-delete-sub="${s.id}" data-sub-name="${s.name}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`
  }).join('')}</div>`

  container.querySelectorAll('[data-edit-sub]').forEach(btn => {
    btn.addEventListener('click', () => openSubForm(btn.dataset.editSub))
  })
  container.querySelectorAll('[data-delete-sub]').forEach(btn => {
    btn.addEventListener('click', () => {
      subsDeleteTarget = btn.dataset.deleteSub
      document.getElementById('subs-delete-name').textContent = btn.dataset.subName
      document.getElementById('subs-delete-modal').style.display = 'flex'
    })
  })
}

function populateSubCatSelect() {
  const sel = document.getElementById('sub-category')
  sel.innerHTML = '<option value="">Choisir une catégorie</option>'
  subsCategories.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = c.name
    sel.appendChild(opt)
  })
}

function showSubList() {
  document.getElementById('subs-view-form').style.display = 'none'
  document.getElementById('subs-view-list').style.display = 'block'
  document.getElementById('subs-delete-modal').style.display = 'none'
}

function openSubForm(subId = null) {
  document.getElementById('subs-view-list').style.display = 'none'
  document.getElementById('subs-view-form').style.display = 'block'

  const title = document.getElementById('subs-form-title')
  const idInput = document.getElementById('sub-edit-id')

  if (subId) {
    const s = subsAll.find(x => x.id === subId)
    if (!s) return
    title.innerHTML = '<i class="fas fa-pencil-alt"></i> Modifier la sous-catégorie'
    idInput.value = s.id
    document.getElementById('sub-name').value = s.name || ''
    document.getElementById('sub-slug').value = s.slug || ''
    document.getElementById('sub-category').value = s.category_id || ''
    document.getElementById('sub-sort').value = s.sort_order ?? 0
    document.getElementById('sub-image-url').value = s.image_url || ''
    document.getElementById('sub-description').value = s.description || ''
  } else {
    title.innerHTML = '<i class="fas fa-plus"></i> Ajouter une sous-catégorie'
    idInput.value = ''
    document.getElementById('sub-name').value = ''
    document.getElementById('sub-slug').value = ''
    document.getElementById('sub-category').value = ''
    document.getElementById('sub-sort').value = '0'
    document.getElementById('sub-image-url').value = ''
    document.getElementById('sub-description').value = ''
  }
}

async function saveSubcategory() {
  const id = document.getElementById('sub-edit-id').value
  const name = document.getElementById('sub-name').value.trim()
  const slug = document.getElementById('sub-slug').value.trim()
  const category_id = document.getElementById('sub-category').value

  if (!name) { showAlert('Le nom est requis.', 'error'); return }
  if (!slug) { showAlert('Le slug est requis.', 'error'); return }
  if (!category_id) { showAlert('Choisissez une catégorie parente.', 'error'); return }

  const payload = {
    name,
    slug,
    category_id,
    sort_order: parseInt(document.getElementById('sub-sort').value) || 0,
    image_url: document.getElementById('sub-image-url').value.trim() || null,
    description: document.getElementById('sub-description').value.trim() || null,
  }

  let error
  if (id) {
    ;({ error } = await supabase.from('character_subcategories').update(payload).eq('id', id))
  } else {
    ;({ error } = await supabase.from('character_subcategories').insert(payload))
  }

  if (error) { showAlert(error.message, 'error'); return }
  showAlert(id ? 'Sous-catégorie mise à jour.' : 'Sous-catégorie ajoutée.')
  await loadSubcategories()
  showSubList()
}

async function confirmDeleteSub() {
  if (!subsDeleteTarget) return
  const { error } = await supabase.from('character_subcategories').delete().eq('id', subsDeleteTarget)
  if (error) { showAlert(error.message, 'error'); return }
  showAlert('Sous-catégorie supprimée.')
  subsDeleteTarget = null
  document.getElementById('subs-delete-modal').style.display = 'none'
  await loadSubcategories()
}

// ══════════════════════════════════════════════════════════════
// CHARACTERS MANAGEMENT
// ══════════════════════════════════════════════════════════════
let charsCategories = []
let charsSubcategories = []
let charsAll = []
let charsActiveCat = null
let charsActiveGroup = null
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

  // Cascade: when top category changes, reload subcategory select
  document.getElementById('char-top-category').addEventListener('change', () => {
    populateSubcategorySelect(document.getElementById('char-top-category').value)
  })

  document.querySelector('.admin-nav-item[data-panel="characters"]').addEventListener('click', loadCharacters)
}

async function loadCharacters() {
  const [{ data: cats }, { data: subs }, { data: chars }] = await Promise.all([
    supabase.from('character_categories').select('*').order('sort_order'),
    supabase.from('character_subcategories').select('*').order('sort_order'),
    supabase.from('characters').select('*, character_subcategories(name, category_id, character_categories(name, color))').order('sort_order'),
  ])
  charsCategories = cats || []
  charsSubcategories = subs || []
  charsAll = chars || []
  renderGroupTabs()
  renderCharList()
  populateTopCategorySelect()
}

function renderGroupTabs() {
  const el = document.getElementById('chars-category-tabs')

  let html = `<button class="chars-group-tab${!charsActiveGroup && !charsActiveCat ? ' active' : ''}" data-group="" data-cat="">Tous</button>`

  charsCategories.forEach(cat => {
    const subsForCat = charsSubcategories.filter(s => s.category_id === cat.id)
    const groupActive = charsActiveGroup === cat.id && !charsActiveCat
    html += `<div class="chars-tab-group">
      <button class="chars-group-tab${groupActive ? ' active' : ''}" data-group="${cat.id}" data-cat="" style="--gcolor:${cat.color || '#64748b'}">
        <i class="fas fa-${cat.icon || 'users'}"></i> ${cat.name}
      </button>
      <div class="chars-subcat-row" data-for-group="${cat.id}" style="${charsActiveGroup === cat.id ? '' : 'display:none'}">
        ${subsForCat.map(s => `<button class="chars-cat-tab${charsActiveCat === s.id ? ' active' : ''}" data-cat="${s.id}" data-group="${cat.id}">${s.name}</button>`).join('')}
      </div>
    </div>`
  })

  el.innerHTML = html

  el.querySelectorAll('.chars-group-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const g = btn.dataset.group
      const wasActive = charsActiveGroup === g
      charsActiveGroup = wasActive ? null : (g || null)
      charsActiveCat = null

      el.querySelectorAll('.chars-group-tab').forEach(b => b.classList.remove('active'))
      el.querySelectorAll('.chars-subcat-row').forEach(r => r.style.display = 'none')

      if (!wasActive && g) {
        btn.classList.add('active')
        const row = el.querySelector(`.chars-subcat-row[data-for-group="${g}"]`)
        if (row) row.style.display = 'flex'
      } else if (!g) {
        btn.classList.add('active')
      }

      renderCharList()
    })
  })

  el.querySelectorAll('.chars-cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      charsActiveCat = btn.dataset.cat || null
      charsActiveGroup = btn.dataset.group || null
      el.querySelectorAll('.chars-cat-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      renderCharList()
    })
  })
}

function populateTopCategorySelect() {
  const sel = document.getElementById('char-top-category')
  sel.innerHTML = '<option value="">Choisir une catégorie</option>'
  charsCategories.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = c.name
    sel.appendChild(opt)
  })
  // Reset subcategory select
  populateSubcategorySelect('')
}

function populateSubcategorySelect(catId) {
  const sel = document.getElementById('char-subcategory')
  sel.innerHTML = '<option value="">Choisir une sous-catégorie</option>'
  sel.disabled = !catId

  if (!catId) return

  const subs = charsSubcategories.filter(s => s.category_id === catId)
  subs.forEach(s => {
    const opt = document.createElement('option')
    opt.value = s.id
    opt.textContent = s.name
    sel.appendChild(opt)
  })
}

function renderCharList() {
  let filtered = charsAll
  if (charsActiveCat) {
    filtered = charsAll.filter(c => c.subcategory_id === charsActiveCat)
  } else if (charsActiveGroup) {
    const subIds = new Set(charsSubcategories.filter(s => s.category_id === charsActiveGroup).map(s => s.id))
    filtered = charsAll.filter(c => subIds.has(c.subcategory_id))
  }

  const container = document.getElementById('chars-list-content')

  if (!filtered.length) {
    container.innerHTML = '<div class="chars-empty">Aucun personnage dans cette catégorie. Cliquez sur <strong>Ajouter</strong> pour commencer.</div>'
    return
  }

  // Group by subcategory
  const subMap = {}
  charsSubcategories.forEach(s => { subMap[s.id] = s })
  const catMap = {}
  charsCategories.forEach(c => { catMap[c.id] = c })

  const groups = {}
  filtered.forEach(c => {
    const key = c.subcategory_id || '__none__'
    if (!groups[key]) {
      const sub = subMap[key]
      const parentCat = sub ? catMap[sub.category_id] : null
      groups[key] = {
        name: sub?.name || 'Sans sous-catégorie',
        catName: parentCat?.name || '',
        catColor: parentCat?.color || '#64748B',
        sortOrder: sub?.sort_order ?? 999,
        items: [],
      }
    }
    groups[key].items.push(c)
  })

  const sorted = Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder)

  container.innerHTML = sorted.map(g => `
    <div class="chars-group">
      <div class="chars-group-header">
        ${g.catName ? `<span class="chars-group-badge" style="background:${g.catColor}22;color:${g.catColor};border-color:${g.catColor}44">${g.catName}</span>` : ''}
        ${g.name}
        <span class="chars-group-count">${g.items.length}</span>
      </div>
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
    document.getElementById('char-role').value = c.role || ''
    document.getElementById('char-faction').value = c.faction || ''
    document.getElementById('char-status').value = c.status || 'alive'
    document.getElementById('char-bounty').value = c.bounty || ''
    document.getElementById('char-devil-fruit').value = c.devil_fruit || ''
    document.getElementById('char-sort').value = c.sort_order ?? 0
    document.getElementById('char-image-url').value = c.image_url || ''
    document.getElementById('char-description').value = c.description || ''

    // Set 2-level selects
    const sub = charsSubcategories.find(s => s.id === c.subcategory_id)
    const catId = sub?.category_id || ''
    document.getElementById('char-top-category').value = catId
    populateSubcategorySelect(catId)
    document.getElementById('char-subcategory').value = c.subcategory_id || ''
  } else {
    title.innerHTML = '<i class="fas fa-plus"></i> Ajouter un personnage'
    idInput.value = ''
    document.getElementById('char-name').value = ''
    document.getElementById('char-role').value = ''
    document.getElementById('char-faction').value = ''
    document.getElementById('char-status').value = 'alive'
    document.getElementById('char-bounty').value = ''
    document.getElementById('char-devil-fruit').value = ''
    document.getElementById('char-sort').value = '0'
    document.getElementById('char-image-url').value = ''
    document.getElementById('char-description').value = ''
    document.getElementById('char-top-category').value = ''
    populateSubcategorySelect('')
  }
}

async function saveCharacter() {
  const id = document.getElementById('char-edit-id').value
  const name = document.getElementById('char-name').value.trim()
  const subcategory_id = document.getElementById('char-subcategory').value

  if (!name) { showAlert('Le nom est requis.', 'error'); return }
  if (!subcategory_id) { showAlert('Choisissez une sous-catégorie.', 'error'); return }

  const payload = {
    name,
    subcategory_id,
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

// ── Utilities ─────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
