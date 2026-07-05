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
  await loadCategories()
  setupCharacterPanel()
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
  const [{ count: userCount }, { count: msgCount }, pirateData, marineData] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('faction', 'pirate'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('faction', 'marine'),
  ])

  document.getElementById('stat-users').textContent = userCount ?? '—'
  document.getElementById('stat-messages').textContent = msgCount ?? '—'
  document.getElementById('stat-pirates').textContent = pirateData.count ?? '—'
  document.getElementById('stat-marines').textContent = marineData.count ?? '—'

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

// ── Characters CMS ────────────────────────────────────────────
let allCategories = []
let activeCatId = 'all'
let editingCharId = null
let pendingImageFile = null

async function loadCategories() {
  const { data } = await supabase.from('character_categories').select('*').order('name')
  allCategories = data || []
  renderCategoryChips()
  renderCatsTable()
  populateCategorySelect()
  await loadCharacters()
}

function renderCategoryChips() {
  const container = document.getElementById('category-chips')
  container.innerHTML = `<button class="cat-chip ${activeCatId === 'all' ? 'active' : ''}" data-cat-id="all">Tous</button>`
  allCategories.forEach(cat => {
    const btn = document.createElement('button')
    btn.className = `cat-chip ${activeCatId === cat.id ? 'active' : ''}`
    btn.dataset.catId = cat.id
    btn.textContent = cat.name
    container.appendChild(btn)
  })

  container.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCatId = btn.dataset.catId === 'all' ? 'all' : btn.dataset.catId
      container.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      loadCharacters()
    })
  })
}

function renderCatsTable() {
  const tbody = document.getElementById('cats-tbody')
  if (!allCategories.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:#475569;text-align:center;padding:16px;">Aucune catégorie.</td></tr>'
    return
  }
  tbody.innerHTML = allCategories.map(cat => `
    <tr>
      <td>${cat.name}</td>
      <td style="color:#64748B;font-size:12px;">${cat.slug}</td>
      <td>
        <button class="btn-table-delete" data-delete-cat="${cat.id}" data-cat-name="${cat.name}">Supprimer</button>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-delete-cat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const catName = btn.dataset.catName
      if (!confirm(`Supprimer la catégorie "${catName}" et tous ses personnages ?`)) return
      const { error } = await supabase.from('character_categories').delete().eq('id', btn.dataset.deleteCat)
      if (error) { showAlert(error.message, 'error') } else {
        showAlert('Catégorie supprimée.')
        if (activeCatId === btn.dataset.deleteCat) activeCatId = 'all'
        await loadCategories()
      }
    })
  })
}

function populateCategorySelect() {
  const sel = document.getElementById('char-category')
  sel.innerHTML = allCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')
}

async function loadCharacters() {
  const grid = document.getElementById('chars-grid')
  grid.innerHTML = '<div style="color:#475569;text-align:center;padding:32px;grid-column:1/-1;">Chargement…</div>'

  let query = supabase.from('characters').select('*, character_categories(name)').order('name')
  if (activeCatId !== 'all') query = query.eq('category_id', activeCatId)

  const { data: chars } = await query
  if (!chars?.length) {
    grid.innerHTML = '<div style="color:#475569;text-align:center;padding:32px;grid-column:1/-1;">Aucun personnage dans cette catégorie.</div>'
    return
  }

  grid.innerHTML = chars.map(c => {
    const img = c.image_url
      ? `<img src="${c.image_url}" alt="${c.name}" class="char-card-img">`
      : `<div class="char-card-img" style="display:flex;align-items:center;justify-content:center;background:#0f1929;"><i class="fas fa-user" style="font-size:32px;color:#334155;"></i></div>`
    const tags = [
      c.faction ? `<span class="char-tag faction-${c.faction}">${c.faction}</span>` : '',
      c.status ? `<span class="char-tag status-${c.status}">${c.status}</span>` : '',
    ].filter(Boolean).join('')

    return `<div class="char-card" data-char-id="${c.id}">
      ${img}
      <div class="char-card-body">
        <div class="char-card-name">${c.name}</div>
        <div class="char-card-cat">${c.character_categories?.name || '—'}</div>
        <div class="char-card-tags">${tags}</div>
      </div>
      <div class="char-card-actions">
        <button class="char-card-action-btn edit" data-edit-char="${c.id}"><i class="fas fa-edit"></i></button>
        <button class="char-card-action-btn delete" data-delete-char="${c.id}" data-char-name="${c.name}"><i class="fas fa-trash"></i></button>
      </div>
    </div>`
  }).join('')

  grid.querySelectorAll('[data-edit-char]').forEach(btn => {
    btn.addEventListener('click', () => {
      const char = chars.find(c => c.id === btn.dataset.editChar)
      openCharModal(char)
    })
  })

  grid.querySelectorAll('[data-delete-char]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Supprimer "${btn.dataset.charName}" ?`)) return
      const { error } = await supabase.from('characters').delete().eq('id', btn.dataset.deleteChar)
      if (error) { showAlert(error.message, 'error') } else {
        showAlert('Personnage supprimé.')
        loadCharacters()
      }
    })
  })
}

function setupCharacterPanel() {
  // Category add
  document.getElementById('cat-add-btn').addEventListener('click', async () => {
    const input = document.getElementById('cat-name-input')
    const name = input.value.trim()
    if (!name) return
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { error } = await supabase.from('character_categories').insert({ name, slug })
    if (error) { showAlert(error.message, 'error') } else {
      input.value = ''
      showAlert('Catégorie ajoutée.')
      await loadCategories()
    }
  })

  // Open modal for new character
  document.getElementById('char-add-btn').addEventListener('click', () => openCharModal(null))

  // Modal close
  document.getElementById('char-modal-close').addEventListener('click', closeCharModal)
  document.getElementById('char-modal-cancel').addEventListener('click', closeCharModal)
  document.getElementById('char-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('char-modal')) closeCharModal()
  })

  // Image upload preview
  document.getElementById('char-img-upload').addEventListener('change', e => {
    const file = e.target.files[0]
    if (!file) return
    pendingImageFile = file
    const preview = document.getElementById('char-img-preview')
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="preview" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
  })

  // Save character
  document.getElementById('char-modal-save').addEventListener('click', saveCharacter)
}

function openCharModal(char) {
  editingCharId = char?.id || null
  pendingImageFile = null

  document.getElementById('char-modal-title').textContent = char ? 'Modifier le personnage' : 'Nouveau personnage'
  document.getElementById('char-name').value = char?.name || ''
  document.getElementById('char-faction').value = char?.faction || ''
  document.getElementById('char-devil-fruit').value = char?.devil_fruit || ''
  document.getElementById('char-bounty').value = char?.bounty || ''
  document.getElementById('char-status').value = char?.status || 'vivant'
  document.getElementById('char-description').value = char?.description || ''

  const catSel = document.getElementById('char-category')
  if (char?.category_id) catSel.value = char.category_id

  const preview = document.getElementById('char-img-preview')
  if (char?.image_url) {
    preview.innerHTML = `<img src="${char.image_url}" alt="${char.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
  } else {
    preview.innerHTML = `<i class="fas fa-image" style="font-size:32px;color:#334155;"></i>`
  }

  document.getElementById('char-img-upload').value = ''
  document.getElementById('char-modal').classList.add('open')
}

function closeCharModal() {
  document.getElementById('char-modal').classList.remove('open')
  editingCharId = null
  pendingImageFile = null
}

async function saveCharacter() {
  const name = document.getElementById('char-name').value.trim()
  const categoryId = document.getElementById('char-category').value
  if (!name) { showAlert('Le nom est obligatoire.', 'error'); return }
  if (!categoryId) { showAlert('Sélectionnez une catégorie.', 'error'); return }

  const saveBtn = document.getElementById('char-modal-save')
  saveBtn.disabled = true

  let imageUrl = null

  // Upload image if pending
  if (pendingImageFile) {
    const ext = pendingImageFile.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('characters')
      .upload(filename, pendingImageFile, { upsert: true })

    if (uploadError) {
      showAlert('Erreur upload image: ' + uploadError.message, 'error')
      saveBtn.disabled = false
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('characters').getPublicUrl(filename)
    imageUrl = publicUrl
  }

  const fields = {
    name,
    category_id: categoryId,
    faction: document.getElementById('char-faction').value || null,
    devil_fruit: document.getElementById('char-devil-fruit').value.trim() || null,
    bounty: document.getElementById('char-bounty').value.trim() || null,
    status: document.getElementById('char-status').value,
    description: document.getElementById('char-description').value.trim() || null,
  }
  if (imageUrl) fields.image_url = imageUrl

  let error
  if (editingCharId) {
    ;({ error } = await supabase.from('characters').update(fields).eq('id', editingCharId))
  } else {
    ;({ error } = await supabase.from('characters').insert(fields))
  }

  saveBtn.disabled = false
  if (error) { showAlert(error.message, 'error') } else {
    closeCharModal()
    showAlert(editingCharId ? 'Personnage mis à jour.' : 'Personnage créé.')
    loadCharacters()
  }
}
