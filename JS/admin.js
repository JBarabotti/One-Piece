import { supabase } from './supabase-client.js'
import { requireAdmin, getProfileByUsername, signOut } from './auth.js'
import { openCropModal } from './crop-modal.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

let adminUser = null
let adminProfile = null
let eventIds = { anime: null, manga: null }

const PANEL_TITLES = {
  dashboard:     'Tableau de bord',
  users:         'Utilisateurs',
  categories:    'Catégories',
  subcategories: 'Sous-catégories',
  characters:    'Personnages',
  'event-anime': 'Évènement Animé',
  'event-manga': 'Évènement Manga',
  avatars:       'Avatars prédéfinis',
  messages:      'Messages',
}

const PAGE_SIZE = 20

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
  setupMessages()
  setupCategories()
  setupSubcategories()
  setupCharacters()
  setupAvatars()
  setupImageUpload('cat', 'categories')
  setupImageUpload('sub', 'subcategories')
  setupImageUpload('char', 'characters')
  setupAvatarAdminUpload()
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

  // Update unread badge
  const { count: unreadCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
  const badge = document.getElementById('unread-badge')
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount
      badge.style.display = 'inline-flex'
    } else {
      badge.style.display = 'none'
    }
  }

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
      <td><div class="user-cell"><div class="user-cell-avatar">${avatarContent}</div><span class="user-cell-name">${u.username}</span></div></td>
      <td>${faction}</td>
      <td><span class="role-pill ${u.role}">${u.role}</span></td>
      <td style="color:#64748B;">${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>`
  }).join('')
}

// ── Users table ───────────────────────────────────────────────
async function loadUsers() {
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

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
      <td><div class="user-cell"><div class="user-cell-avatar">${avatarContent}</div><span class="user-cell-name">${u.username}</span></div></td>
      <td style="color:#64748B;font-size:12px;">${u.email || '—'}</td>
      <td>${faction}</td>
      <td><span class="role-pill ${u.role}">${u.role}</span></td>
      <td style="color:#64748B;font-size:12px;">${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
      <td>${isMe
        ? '<span style="color:#475569;font-size:12px;">Vous</span>'
        : `<div class="table-actions">
            <select class="table-select" data-user-id="${u.id}">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>Utilisateur</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <button class="btn-table-save" data-save-role="${u.id}">Sauver</button>
            <button class="btn-table-delete" data-delete-user="${u.id}" data-username="${u.username}">Supprimer</button>
          </div>`
      }</td>
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ userId })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erreur')
        showAlert(`Compte de ${username} supprimé.`)
        loadUsers(); loadStats()
      } catch (err) { showAlert(err.message, 'error') }
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

// ── Image upload helper ────────────────────────────────────────
function setupImageUpload(prefix, bucket) {
  const urlInput = document.getElementById(`${prefix}-image-url`)
  const fileInput = document.getElementById(`${prefix}-file-input`)
  const uploadBtn = document.getElementById(`btn-${prefix}-upload`)
  const preview = document.getElementById(`${prefix}-img-preview`)
  if (!urlInput || !fileInput || !uploadBtn || !preview) return

  uploadBtn.addEventListener('click', () => fileInput.click())

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0]
    if (!file) return
    uploadBtn.disabled = true
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload…'

    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
    uploadBtn.disabled = false
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Importer'

    if (error) { showAlert('Erreur upload : ' + error.message, 'error'); return }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    urlInput.value = publicUrl
    updatePreview(preview, publicUrl)
    fileInput.value = ''
  })

  urlInput.addEventListener('input', () => updatePreview(preview, urlInput.value.trim()))
}

function updatePreview(previewEl, url) {
  if (!url) { previewEl.innerHTML = ''; return }
  previewEl.innerHTML = `<img src="${url}" alt="Aperçu" class="img-preview" onerror="this.parentElement.innerHTML='<span class=img-preview-error>Image introuvable</span>'">`
}

// ══════════════════════════════════════════════════════════════
// MESSAGES MANAGEMENT
// ══════════════════════════════════════════════════════════════
let msgsPage = 0
let msgsTotal = 0
let msgsDeleteTarget = null

function setupMessages() {
  // Tab switching
  document.querySelectorAll('.msgs-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.msgs-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const view = tab.dataset.msgsView
      document.getElementById('msgs-view-list').style.display = view === 'list' ? 'block' : 'none'
      document.getElementById('msgs-view-compose').style.display = view === 'compose' ? 'block' : 'none'
    })
  })

  // Compose
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
        statusEl.style.color = '#FCA5A5'; statusEl.textContent = '✗ Utilisateur introuvable.'
      } else {
        statusEl.style.color = '#6EE7B7'; statusEl.textContent = `✓ ${profile.username} trouvé.`
        targetUserId = profile.id
      }
    }, 400)
  })

  document.getElementById('admin-send-msg-btn').addEventListener('click', async () => {
    const content = document.getElementById('msg-content').value.trim()
    if (!targetUserId) { showAlert('Sélectionnez un destinataire valide.', 'error'); return }
    if (!content) { showAlert('Le message est vide.', 'error'); return }
    const { error } = await supabase.from('messages').insert({
      sender_id: adminUser.id, receiver_id: targetUserId, content
    })
    if (error) { showAlert(error.message, 'error') } else {
      document.getElementById('msg-content').value = ''
      showAlert('Message envoyé.')
      loadStats()
    }
  })

  // Edit modal
  document.getElementById('btn-msg-edit-cancel').addEventListener('click', () => {
    document.getElementById('msgs-edit-modal').style.display = 'none'
  })
  document.getElementById('btn-msg-edit-save').addEventListener('click', saveMessage)

  // Delete modal
  document.getElementById('btn-msg-delete-cancel').addEventListener('click', () => {
    document.getElementById('msgs-delete-modal').style.display = 'none'
  })
  document.getElementById('btn-msg-delete-confirm').addEventListener('click', confirmDeleteMessage)

  // Load on panel open
  document.querySelector('.admin-nav-item[data-panel="messages"]').addEventListener('click', () => {
    msgsPage = 0; loadMessages()
  })
}

async function loadMessages(append = false) {
  const from = msgsPage * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, count, error } = await supabase
    .from('messages')
    .select(`
      id, content, read, created_at, updated_at,
      sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
      receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) { showAlert(error.message, 'error'); return }

  msgsTotal = count || 0
  const container = document.getElementById('msgs-list-content')

  if (!data?.length && !append) {
    container.innerHTML = '<div class="chars-empty">Aucun message pour le moment.</div>'
    document.getElementById('msgs-pagination').innerHTML = ''
    return
  }

  const html = (data || []).map(m => {
    const senderName = m.sender?.username || 'Inconnu'
    const receiverName = m.receiver?.username || 'Inconnu'
    const senderAvatar = m.sender?.avatar_url
      ? `<img src="${m.sender.avatar_url}" alt="${senderName}">`
      : senderName[0]?.toUpperCase()
    const preview = m.content?.slice(0, 100) + (m.content?.length > 100 ? '…' : '')
    const date = new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    return `
      <div class="msg-row${m.read ? '' : ' msg-unread'}" data-msg-id="${m.id}">
        <div class="msg-row-avatar">${senderAvatar}</div>
        <div class="msg-row-body">
          <div class="msg-row-meta">
            <span class="msg-row-from">${senderName}</span>
            <span class="msg-row-arrow"><i class="fas fa-arrow-right"></i></span>
            <span class="msg-row-to">${receiverName}</span>
            ${!m.read ? '<span class="msg-unread-dot"></span>' : ''}
          </div>
          <div class="msg-row-preview">${preview}</div>
          <div class="msg-row-date">${date}</div>
        </div>
        <div class="msg-row-actions">
          <button class="btn-msg-read" data-msg-id="${m.id}" data-read="${m.read}" title="${m.read ? 'Marquer non lu' : 'Marquer lu'}">
            <i class="fas fa-${m.read ? 'envelope' : 'envelope-open'}"></i>
          </button>
          <button class="btn-msg-edit" data-msg-id="${m.id}" data-msg-content="${encodeURIComponent(m.content || '')}" title="Modifier">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="btn-msg-delete" data-msg-id="${m.id}" title="Supprimer">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`
  }).join('')

  if (append) {
    container.insertAdjacentHTML('beforeend', html)
  } else {
    container.innerHTML = html
  }

  // Bind actions
  container.querySelectorAll('.btn-msg-read').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.msgId
      const isRead = btn.dataset.read === 'true'
      await supabase.from('messages').update({ read: !isRead }).eq('id', id)
      loadMessages(); loadStats()
    })
  })
  container.querySelectorAll('.btn-msg-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('msgs-edit-id').value = btn.dataset.msgId
      document.getElementById('msgs-edit-content').value = decodeURIComponent(btn.dataset.msgContent)
      document.getElementById('msgs-edit-modal').style.display = 'flex'
    })
  })
  container.querySelectorAll('.btn-msg-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      msgsDeleteTarget = btn.dataset.msgId
      document.getElementById('msgs-delete-modal').style.display = 'flex'
    })
  })

  // Pagination
  const loaded = from + (data?.length || 0)
  const paginationEl = document.getElementById('msgs-pagination')
  if (loaded < msgsTotal) {
    paginationEl.innerHTML = `<button class="btn-load-more" id="btn-msgs-more">Voir plus (${msgsTotal - loaded} restants)</button>`
    document.getElementById('btn-msgs-more').addEventListener('click', () => {
      msgsPage++
      loadMessages(true)
    })
  } else {
    paginationEl.innerHTML = msgsTotal > 0 ? `<span class="pagination-info">${msgsTotal} message${msgsTotal > 1 ? 's' : ''} au total</span>` : ''
  }
}

async function saveMessage() {
  const id = document.getElementById('msgs-edit-id').value
  const content = document.getElementById('msgs-edit-content').value.trim()
  if (!content) { showAlert('Le contenu est vide.', 'error'); return }
  const { error } = await supabase.from('messages').update({ content, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) { showAlert(error.message, 'error'); return }
  showAlert('Message modifié.')
  document.getElementById('msgs-edit-modal').style.display = 'none'
  loadMessages()
}

async function confirmDeleteMessage() {
  if (!msgsDeleteTarget) return
  const { error } = await supabase.from('messages').delete().eq('id', msgsDeleteTarget)
  if (error) { showAlert(error.message, 'error'); return }
  showAlert('Message supprimé.')
  msgsDeleteTarget = null
  document.getElementById('msgs-delete-modal').style.display = 'none'
  msgsPage = 0; loadMessages(); loadStats()
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
  document.getElementById('cat-name').addEventListener('input', () => {
    if (!document.getElementById('cat-edit-id').value)
      document.getElementById('cat-slug').value = slugify(document.getElementById('cat-name').value)
  })
  document.getElementById('cat-image-url').addEventListener('input', () => {
    updatePreview(document.getElementById('cat-img-preview'), document.getElementById('cat-image-url').value.trim())
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
      ${c.image_url
        ? `<img src="${c.image_url}" alt="${c.name}" class="chars-card-img">`
        : `<div class="chars-card-cat-icon" style="background:${c.color || '#64748B'}22;color:${c.color || '#64748B'}"><i class="fas fa-${c.icon || 'folder'}"></i></div>`}
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

  container.querySelectorAll('[data-edit-cat]').forEach(btn => btn.addEventListener('click', () => openCatForm(btn.dataset.editCat)))
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
  const idInput = document.getElementById('cat-edit-id')

  if (catId) {
    const c = catsAll.find(x => x.id === catId)
    if (!c) return
    document.getElementById('cats-form-title').innerHTML = '<i class="fas fa-pencil-alt"></i> Modifier la catégorie'
    idInput.value = c.id
    document.getElementById('cat-name').value = c.name || ''
    document.getElementById('cat-slug').value = c.slug || ''
    document.getElementById('cat-icon').value = c.icon || ''
    document.getElementById('cat-color').value = c.color || ''
    document.getElementById('cat-sort').value = c.sort_order ?? 0
    document.getElementById('cat-description').value = c.description || ''
    document.getElementById('cat-image-url').value = c.image_url || ''
    updatePreview(document.getElementById('cat-img-preview'), c.image_url || '')
  } else {
    document.getElementById('cats-form-title').innerHTML = '<i class="fas fa-plus"></i> Ajouter une catégorie'
    idInput.value = ''
    ;['cat-name','cat-slug','cat-icon','cat-color','cat-description','cat-image-url'].forEach(id => { document.getElementById(id).value = '' })
    document.getElementById('cat-sort').value = '0'
    document.getElementById('cat-img-preview').innerHTML = ''
  }
}

async function saveCategory() {
  const id = document.getElementById('cat-edit-id').value
  const name = document.getElementById('cat-name').value.trim()
  const slug = document.getElementById('cat-slug').value.trim()
  if (!name) { showAlert('Le nom est requis.', 'error'); return }
  if (!slug) { showAlert('Le slug est requis.', 'error'); return }
  const payload = {
    name, slug,
    icon: document.getElementById('cat-icon').value.trim() || null,
    color: document.getElementById('cat-color').value.trim() || null,
    sort_order: parseInt(document.getElementById('cat-sort').value) || 0,
    description: document.getElementById('cat-description').value.trim() || null,
    image_url: document.getElementById('cat-image-url').value.trim() || null,
  }
  let error
  if (id) { ;({ error } = await supabase.from('character_categories').update(payload).eq('id', id)) }
  else     { ;({ error } = await supabase.from('character_categories').insert(payload)) }
  if (error) { showAlert(error.message, 'error'); return }
  showAlert(id ? 'Catégorie mise à jour.' : 'Catégorie ajoutée.')
  await loadCategories(); showCatList()
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
  document.getElementById('sub-name').addEventListener('input', () => {
    if (!document.getElementById('sub-edit-id').value)
      document.getElementById('sub-slug').value = slugify(document.getElementById('sub-name').value)
  })
  document.getElementById('sub-image-url').addEventListener('input', () => {
    updatePreview(document.getElementById('sub-img-preview'), document.getElementById('sub-image-url').value.trim())
  })
}

async function loadSubcategories() {
  const [{ data: cats }, { data: subs }] = await Promise.all([
    supabase.from('character_categories').select('*').order('sort_order'),
    supabase.from('character_subcategories').select('*, character_categories(name, color)').order('sort_order'),
  ])
  subsCategories = cats || []
  subsAll = subs || []
  renderSubFilterRow(); renderSubList(); populateSubCatSelect()
}

function renderSubFilterRow() {
  const row = document.getElementById('subs-filter-row')
  row.innerHTML = `<div class="chars-category-tabs">
    <button class="chars-group-tab${!subsFilterCat ? ' active' : ''}" data-filter-cat="">Toutes</button>
    ${subsCategories.map(c => `<button class="chars-group-tab${subsFilterCat === c.id ? ' active' : ''}" data-filter-cat="${c.id}" style="--gcolor:${c.color || '#64748b'}">${c.name}</button>`).join('')}
  </div>`
  row.querySelectorAll('[data-filter-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      subsFilterCat = btn.dataset.filterCat || null
      row.querySelectorAll('[data-filter-cat]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active'); renderSubList()
    })
  })
}

function renderSubList() {
  const container = document.getElementById('subs-list-content')
  const filtered = subsFilterCat ? subsAll.filter(s => s.category_id === subsFilterCat) : subsAll
  if (!filtered.length) {
    container.innerHTML = '<div class="chars-empty">Aucune sous-catégorie. Cliquez sur <strong>Ajouter</strong> pour commencer.</div>'
    return
  }
  container.innerHTML = `<div class="chars-grid">${filtered.map(s => {
    const catColor = s.character_categories?.color || '#64748B'
    return `<div class="chars-card">
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

  container.querySelectorAll('[data-edit-sub]').forEach(btn => btn.addEventListener('click', () => openSubForm(btn.dataset.editSub)))
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
    opt.value = c.id; opt.textContent = c.name; sel.appendChild(opt)
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
  const idInput = document.getElementById('sub-edit-id')

  if (subId) {
    const s = subsAll.find(x => x.id === subId)
    if (!s) return
    document.getElementById('subs-form-title').innerHTML = '<i class="fas fa-pencil-alt"></i> Modifier la sous-catégorie'
    idInput.value = s.id
    document.getElementById('sub-name').value = s.name || ''
    document.getElementById('sub-slug').value = s.slug || ''
    document.getElementById('sub-category').value = s.category_id || ''
    document.getElementById('sub-sort').value = s.sort_order ?? 0
    document.getElementById('sub-image-url').value = s.image_url || ''
    document.getElementById('sub-description').value = s.description || ''
    updatePreview(document.getElementById('sub-img-preview'), s.image_url || '')
  } else {
    document.getElementById('subs-form-title').innerHTML = '<i class="fas fa-plus"></i> Ajouter une sous-catégorie'
    idInput.value = ''
    ;['sub-name','sub-slug','sub-image-url','sub-description'].forEach(id => { document.getElementById(id).value = '' })
    document.getElementById('sub-category').value = ''
    document.getElementById('sub-sort').value = '0'
    document.getElementById('sub-img-preview').innerHTML = ''
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
    name, slug, category_id,
    sort_order: parseInt(document.getElementById('sub-sort').value) || 0,
    image_url: document.getElementById('sub-image-url').value.trim() || null,
    description: document.getElementById('sub-description').value.trim() || null,
  }
  let error
  if (id) { ;({ error } = await supabase.from('character_subcategories').update(payload).eq('id', id)) }
  else     { ;({ error } = await supabase.from('character_subcategories').insert(payload)) }
  if (error) { showAlert(error.message, 'error'); return }
  showAlert(id ? 'Sous-catégorie mise à jour.' : 'Sous-catégorie ajoutée.')
  await loadSubcategories(); showSubList()
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
let charsPage = 0
let charsTotal = 0
let charsActiveCat = null
let charsActiveGroup = null
let charsDeleteTarget = null
let charBlocks = []

function setupCharacters() {
  document.getElementById('btn-add-character').addEventListener('click', () => openCharForm())
  document.getElementById('btn-chars-back').addEventListener('click', showCharList)
  document.getElementById('btn-char-cancel').addEventListener('click', showCharList)
  document.getElementById('btn-char-save').addEventListener('click', saveCharacter)
  document.getElementById('btn-char-delete-confirm').addEventListener('click', confirmDeleteChar)
  document.getElementById('btn-char-delete-cancel').addEventListener('click', () => {
    document.getElementById('chars-delete-modal').style.display = 'none'
  })
  document.getElementById('char-top-category').addEventListener('change', () => {
    populateSubcategorySelect(document.getElementById('char-top-category').value)
  })
  document.getElementById('char-image-url').addEventListener('input', () => {
    updatePreview(document.getElementById('char-img-preview'), document.getElementById('char-image-url').value.trim())
  })
  setupBlockEditor()
  document.querySelector('.admin-nav-item[data-panel="characters"]').addEventListener('click', () => {
    charsPage = 0; loadCharacters()
  })
}

async function loadCharacters(append = false) {
  if (!append) {
    const [{ data: cats }, { data: subs }] = await Promise.all([
      supabase.from('character_categories').select('*').order('sort_order'),
      supabase.from('character_subcategories').select('*').order('sort_order'),
    ])
    charsCategories = cats || []
    charsSubcategories = subs || []
    renderGroupTabs()
    populateTopCategorySelect()
  }

  // Build filter
  let query = supabase
    .from('characters')
    .select('*, character_subcategories(name, category_id, character_categories(name, color))', { count: 'exact' })
    .order('sort_order')

  if (charsActiveCat) {
    query = query.eq('subcategory_id', charsActiveCat)
  } else if (charsActiveGroup) {
    const subIds = charsSubcategories.filter(s => s.category_id === charsActiveGroup).map(s => s.id)
    if (subIds.length) query = query.in('subcategory_id', subIds)
    else query = query.eq('subcategory_id', '00000000-0000-0000-0000-000000000000')
  }

  const from = charsPage * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, count } = await query.range(from, to)
  charsTotal = count || 0

  if (append) {
    charsAll = [...charsAll, ...(data || [])]
  } else {
    charsAll = data || []
  }

  renderCharList(append)
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
        el.querySelector(`.chars-subcat-row[data-for-group="${g}"]`)?.style.setProperty('display', 'flex')
      } else if (!g) { btn.classList.add('active') }
      charsPage = 0; loadCharacters()
    })
  })

  el.querySelectorAll('.chars-cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      charsActiveCat = btn.dataset.cat || null
      charsActiveGroup = btn.dataset.group || null
      el.querySelectorAll('.chars-cat-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      charsPage = 0; loadCharacters()
    })
  })
}

function populateTopCategorySelect() {
  const sel = document.getElementById('char-top-category')
  sel.innerHTML = '<option value="">Choisir une catégorie</option>'
  charsCategories.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id; opt.textContent = c.name; sel.appendChild(opt)
  })
  populateSubcategorySelect('')
}

function populateSubcategorySelect(catId) {
  const sel = document.getElementById('char-subcategory')
  sel.innerHTML = '<option value="">Choisir une sous-catégorie</option>'
  sel.disabled = !catId
  if (!catId) return
  charsSubcategories.filter(s => s.category_id === catId).forEach(s => {
    const opt = document.createElement('option')
    opt.value = s.id; opt.textContent = s.name; sel.appendChild(opt)
  })
}

function renderCharList(append = false) {
  const container = document.getElementById('chars-list-content')

  if (!charsAll.length && !append) {
    container.innerHTML = '<div class="chars-empty">Aucun personnage. Cliquez sur <strong>Ajouter</strong> pour commencer.</div>'
    document.getElementById('chars-pagination').innerHTML = ''
    return
  }

  const subMap = {}
  charsSubcategories.forEach(s => { subMap[s.id] = s })
  const catMap = {}
  charsCategories.forEach(c => { catMap[c.id] = c })

  // Group by subcategory
  const groups = {}
  charsAll.forEach(c => {
    const key = c.subcategory_id || '__none__'
    if (!groups[key]) {
      const sub = subMap[key]
      const parentCat = sub ? catMap[sub.category_id] : null
      groups[key] = { name: sub?.name || 'Sans sous-catégorie', catName: parentCat?.name || '', catColor: parentCat?.color || '#64748B', sortOrder: sub?.sort_order ?? 999, items: [] }
    }
    groups[key].items.push(c)
  })

  const sorted = Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder)
  const html = sorted.map(g => `
    <div class="chars-group">
      <div class="chars-group-header">
        ${g.catName ? `<span class="chars-group-badge" style="background:${g.catColor}22;color:${g.catColor};border-color:${g.catColor}44">${g.catName}</span>` : ''}
        ${g.name} <span class="chars-group-count">${g.items.length}</span>
      </div>
      <div class="chars-grid">${g.items.map(c => renderCharCard(c)).join('')}</div>
    </div>`).join('')

  if (append) {
    const existingGroups = container.querySelectorAll('.chars-group')
    existingGroups.forEach(g => g.remove())
    container.insertAdjacentHTML('beforeend', html)
  } else {
    container.innerHTML = html
  }

  container.querySelectorAll('[data-edit-char]').forEach(btn => {
    btn.addEventListener('click', () => openCharForm(btn.dataset.editChar))
  })
  container.querySelectorAll('[data-delete-char]').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.deleteChar, btn.dataset.charName))
  })

  // Pagination
  const loaded = charsAll.length
  const paginationEl = document.getElementById('chars-pagination')
  if (loaded < charsTotal) {
    paginationEl.innerHTML = `<button class="btn-load-more" id="btn-chars-more">Voir plus (${charsTotal - loaded} restants)</button>`
    document.getElementById('btn-chars-more').addEventListener('click', () => {
      charsPage++; loadCharacters(true)
    })
  } else {
    paginationEl.innerHTML = charsTotal > 0 ? `<span class="pagination-info">${charsTotal} personnage${charsTotal > 1 ? 's' : ''} au total</span>` : ''
  }
}

function renderCharCard(c) {
  const statusClass = c.status === 'alive' ? 'chars-status-alive' : c.status === 'dead' ? 'chars-status-dead' : 'chars-status-unknown'
  const statusLabel = c.status === 'alive' ? 'Vivant' : c.status === 'dead' ? 'Mort' : 'Inconnu'
  const img = c.image_url
    ? `<img src="${c.image_url}" alt="${c.name}" class="chars-card-img">`
    : `<div class="chars-card-img-placeholder"><i class="fas fa-user"></i></div>`
  return `<div class="chars-card">
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
  const idInput = document.getElementById('char-edit-id')

  if (charId) {
    const c = charsAll.find(x => x.id === charId)
    if (!c) return
    document.getElementById('chars-form-title').innerHTML = '<i class="fas fa-pencil-alt"></i> Modifier le personnage'
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
    updatePreview(document.getElementById('char-img-preview'), c.image_url || '')

    const sub = charsSubcategories.find(s => s.id === c.subcategory_id)
    const catId = sub?.category_id || ''
    document.getElementById('char-top-category').value = catId
    populateSubcategorySelect(catId)
    document.getElementById('char-subcategory').value = c.subcategory_id || ''

    charBlocks = Array.isArray(c.content_blocks) ? JSON.parse(JSON.stringify(c.content_blocks)) : []
  } else {
    document.getElementById('chars-form-title').innerHTML = '<i class="fas fa-plus"></i> Ajouter un personnage'
    idInput.value = ''
    ;['char-name','char-role','char-bounty','char-devil-fruit','char-image-url','char-description'].forEach(id => { document.getElementById(id).value = '' })
    document.getElementById('char-faction').value = ''
    document.getElementById('char-status').value = 'alive'
    document.getElementById('char-sort').value = '0'
    document.getElementById('char-top-category').value = ''
    document.getElementById('char-img-preview').innerHTML = ''
    populateSubcategorySelect('')
    charBlocks = []
  }

  renderBlockList()
}

async function saveCharacter() {
  const id = document.getElementById('char-edit-id').value
  const name = document.getElementById('char-name').value.trim()
  const subcategory_id = document.getElementById('char-subcategory').value
  if (!name) { showAlert('Le nom est requis.', 'error'); return }
  if (!subcategory_id) { showAlert('Choisissez une sous-catégorie.', 'error'); return }

  collectBlockData()

  const payload = {
    name, subcategory_id,
    role: document.getElementById('char-role').value.trim() || null,
    faction: document.getElementById('char-faction').value || null,
    status: document.getElementById('char-status').value,
    bounty: document.getElementById('char-bounty').value.trim() || null,
    devil_fruit: document.getElementById('char-devil-fruit').value.trim() || null,
    sort_order: parseInt(document.getElementById('char-sort').value) || 0,
    image_url: document.getElementById('char-image-url').value.trim() || null,
    description: document.getElementById('char-description').value.trim() || null,
    content_blocks: charBlocks,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) { ;({ error } = await supabase.from('characters').update(payload).eq('id', id)) }
  else     { ;({ error } = await supabase.from('characters').insert(payload)) }
  if (error) { showAlert(error.message, 'error'); return }

  showAlert(id ? 'Personnage mis à jour.' : 'Personnage ajouté.')
  charsPage = 0; await loadCharacters(); loadStats(); showCharList()
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
  charsPage = 0; await loadCharacters(); loadStats()
}

// ══════════════════════════════════════════════════════════════
// BLOCK EDITOR
// ══════════════════════════════════════════════════════════════
const BLOCK_LABELS = {
  heading: 'Titre', text: 'Texte', image: 'Image', gallery: 'Galerie',
  stats: 'Statistiques', quote: 'Citation', list: 'Liste', separator: 'Séparateur',
}
const BLOCK_ICONS = {
  heading: 'heading', text: 'align-left', image: 'image', gallery: 'images',
  stats: 'chart-bar', quote: 'quote-left', list: 'list-ul', separator: 'minus',
}

function setupBlockEditor() {
  const addBtn = document.getElementById('btn-block-add')
  const menu = document.getElementById('block-type-menu')

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
  })

  document.addEventListener('click', () => { menu.style.display = 'none' })

  menu.querySelectorAll('[data-block-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      addBlock(btn.dataset.blockType)
      menu.style.display = 'none'
    })
  })
}

function blockDefaultData(type) {
  switch (type) {
    case 'heading':   return { text: '', level: 2 }
    case 'text':      return { content: '' }
    case 'image':     return { url: '', caption: '', alt: '' }
    case 'gallery':   return { images: [{ url: '', caption: '' }] }
    case 'stats':     return { items: [{ label: '', value: '' }] }
    case 'quote':     return { text: '', author: '' }
    case 'list':      return { items: [''], ordered: false }
    case 'separator': return {}
    default:          return {}
  }
}

function addBlock(type) {
  charBlocks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, data: blockDefaultData(type) })
  renderBlockList()
}

function removeBlock(blockId) {
  charBlocks = charBlocks.filter(b => b.id !== blockId)
  renderBlockList()
}

function moveBlock(blockId, dir) {
  collectBlockData()
  const idx = charBlocks.findIndex(b => b.id === blockId)
  if (idx < 0) return
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= charBlocks.length) return
  ;[charBlocks[idx], charBlocks[newIdx]] = [charBlocks[newIdx], charBlocks[idx]]
  renderBlockList()
}

function collectBlockData() {
  const listEl = document.getElementById('block-list')
  listEl.querySelectorAll('.block-card').forEach(card => {
    const id = card.dataset.blockId
    const block = charBlocks.find(b => b.id === id)
    if (!block) return

    switch (block.type) {
      case 'heading':
        block.data.text = card.querySelector('.block-field-text')?.value || ''
        block.data.level = parseInt(card.querySelector('.block-field-level')?.value) || 2
        break
      case 'text':
        block.data.content = card.querySelector('.block-field-content')?.value || ''
        break
      case 'image':
        block.data.url = card.querySelector('.block-field-url')?.value || ''
        block.data.caption = card.querySelector('.block-field-caption')?.value || ''
        block.data.alt = card.querySelector('.block-field-alt')?.value || ''
        break
      case 'gallery':
        block.data.images = Array.from(card.querySelectorAll('.gallery-item')).map(item => ({
          url: item.querySelector('.block-field-url')?.value || '',
          caption: item.querySelector('.block-field-caption')?.value || '',
        })).filter(img => img.url)
        break
      case 'stats':
        block.data.items = Array.from(card.querySelectorAll('.stats-item')).map(item => ({
          label: item.querySelector('.block-field-label')?.value || '',
          value: item.querySelector('.block-field-value')?.value || '',
        })).filter(i => i.label || i.value)
        break
      case 'quote':
        block.data.text = card.querySelector('.block-field-text')?.value || ''
        block.data.author = card.querySelector('.block-field-author')?.value || ''
        break
      case 'list':
        block.data.items = Array.from(card.querySelectorAll('.list-item-input')).map(i => i.value).filter(Boolean)
        block.data.ordered = card.querySelector('.block-field-ordered')?.checked || false
        break
    }
  })
}

function renderBlockList() {
  const listEl = document.getElementById('block-list')
  if (!charBlocks.length) {
    listEl.innerHTML = '<div class="block-list-empty">Aucun bloc. Cliquez sur "Ajouter un bloc" pour enrichir la page du personnage.</div>'
    return
  }

  listEl.innerHTML = charBlocks.map((block, idx) => {
    const label = BLOCK_LABELS[block.type] || block.type
    const icon = BLOCK_ICONS[block.type] || 'cube'
    return `
      <div class="block-card" data-block-id="${block.id}">
        <div class="block-card-header">
          <span class="block-type-tag"><i class="fas fa-${icon}"></i> ${label}</span>
          <div class="block-card-actions">
            ${idx > 0 ? `<button type="button" class="btn-block-move" data-dir="-1" data-id="${block.id}" title="Monter"><i class="fas fa-chevron-up"></i></button>` : ''}
            ${idx < charBlocks.length-1 ? `<button type="button" class="btn-block-move" data-dir="1" data-id="${block.id}" title="Descendre"><i class="fas fa-chevron-down"></i></button>` : ''}
            <button type="button" class="btn-block-remove" data-id="${block.id}" title="Supprimer"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div class="block-card-body">${renderBlockEditor(block)}</div>
      </div>`
  }).join('')

  listEl.querySelectorAll('.btn-block-move').forEach(btn => {
    btn.addEventListener('click', () => { collectBlockData(); moveBlock(btn.dataset.id, parseInt(btn.dataset.dir)) })
  })
  listEl.querySelectorAll('.btn-block-remove').forEach(btn => {
    btn.addEventListener('click', () => { collectBlockData(); removeBlock(btn.dataset.id) })
  })
  listEl.querySelectorAll('.btn-gallery-add').forEach(btn => {
    btn.addEventListener('click', () => {
      collectBlockData()
      const block = charBlocks.find(b => b.id === btn.dataset.blockId)
      if (block) { block.data.images.push({ url: '', caption: '' }); renderBlockList() }
    })
  })
  listEl.querySelectorAll('.btn-stats-add').forEach(btn => {
    btn.addEventListener('click', () => {
      collectBlockData()
      const block = charBlocks.find(b => b.id === btn.dataset.blockId)
      if (block) { block.data.items.push({ label: '', value: '' }); renderBlockList() }
    })
  })
  listEl.querySelectorAll('.btn-list-add').forEach(btn => {
    btn.addEventListener('click', () => {
      collectBlockData()
      const block = charBlocks.find(b => b.id === btn.dataset.blockId)
      if (block) { block.data.items.push(''); renderBlockList() }
    })
  })
}

function renderBlockEditor(block) {
  switch (block.type) {
    case 'heading':
      return `<div class="block-fields">
        <div class="block-field-row">
          <input type="text" class="event-field-input block-field-text" value="${esc(block.data.text)}" placeholder="Texte du titre">
          <select class="event-field-input block-field-level" style="width:100px;flex-shrink:0;">
            <option value="2" ${block.data.level === 2 ? 'selected' : ''}>H2</option>
            <option value="3" ${block.data.level === 3 ? 'selected' : ''}>H3</option>
            <option value="4" ${block.data.level === 4 ? 'selected' : ''}>H4</option>
          </select>
        </div>
      </div>`

    case 'text':
      return `<div class="block-fields">
        <textarea class="event-field-input block-field-content" rows="4" placeholder="Contenu du paragraphe…">${esc(block.data.content)}</textarea>
      </div>`

    case 'image':
      return `<div class="block-fields">
        <input type="url" class="event-field-input block-field-url" value="${esc(block.data.url)}" placeholder="URL de l'image">
        <input type="text" class="event-field-input block-field-caption" value="${esc(block.data.caption)}" placeholder="Légende (optionnel)">
        <input type="text" class="event-field-input block-field-alt" value="${esc(block.data.alt)}" placeholder="Texte alternatif">
      </div>`

    case 'gallery':
      return `<div class="block-fields">
        ${(block.data.images || []).map(img => `
          <div class="gallery-item block-field-row">
            <input type="url" class="event-field-input block-field-url" value="${esc(img.url)}" placeholder="URL de l'image">
            <input type="text" class="event-field-input block-field-caption" value="${esc(img.caption)}" placeholder="Légende">
          </div>`).join('')}
        <button type="button" class="btn-block-add-item btn-gallery-add" data-block-id="${block.id}"><i class="fas fa-plus"></i> Ajouter une image</button>
      </div>`

    case 'stats':
      return `<div class="block-fields">
        ${(block.data.items || []).map(item => `
          <div class="stats-item block-field-row">
            <input type="text" class="event-field-input block-field-label" value="${esc(item.label)}" placeholder="Étiquette">
            <input type="text" class="event-field-input block-field-value" value="${esc(item.value)}" placeholder="Valeur">
          </div>`).join('')}
        <button type="button" class="btn-block-add-item btn-stats-add" data-block-id="${block.id}"><i class="fas fa-plus"></i> Ajouter une stat</button>
      </div>`

    case 'quote':
      return `<div class="block-fields">
        <textarea class="event-field-input block-field-text" rows="3" placeholder="Texte de la citation…">${esc(block.data.text)}</textarea>
        <input type="text" class="event-field-input block-field-author" value="${esc(block.data.author)}" placeholder="Auteur (optionnel)">
      </div>`

    case 'list':
      return `<div class="block-fields">
        <label class="block-checkbox-label">
          <input type="checkbox" class="block-field-ordered" ${block.data.ordered ? 'checked' : ''}> Liste numérotée
        </label>
        ${(block.data.items || []).map(item => `
          <input type="text" class="event-field-input list-item-input" value="${esc(item)}" placeholder="Élément de la liste">`).join('')}
        <button type="button" class="btn-block-add-item btn-list-add" data-block-id="${block.id}"><i class="fas fa-plus"></i> Ajouter un élément</button>
      </div>`

    case 'separator':
      return `<div class="block-fields"><div class="block-separator-preview"><hr></div></div>`

    default:
      return '<div class="block-fields"><em style="color:#64748b">Type de bloc non reconnu</em></div>'
  }
}

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// ── Utilities ─────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ══════════════════════════════════════════════════════════════
// PRESET AVATARS MANAGEMENT
// ══════════════════════════════════════════════════════════════
let avatarsAll = []
let avatarsDeleteTarget = null

function setupAvatars() {
  document.getElementById('btn-add-avatar').addEventListener('click', () => openAvatarForm())
  document.getElementById('btn-avatars-back').addEventListener('click', showAvatarList)
  document.getElementById('btn-avatar-cancel').addEventListener('click', showAvatarList)
  document.getElementById('btn-avatar-save').addEventListener('click', saveAvatar)
  document.getElementById('btn-avatar-delete-confirm').addEventListener('click', confirmDeleteAvatar)
  document.getElementById('btn-avatar-delete-cancel').addEventListener('click', () => {
    document.getElementById('avatars-delete-modal').style.display = 'none'
  })
  document.getElementById('avatar-image-url').addEventListener('input', () => {
    updatePreview(document.getElementById('avatar-img-preview'), document.getElementById('avatar-image-url').value.trim())
  })
  document.querySelector('.admin-nav-item[data-panel="avatars"]').addEventListener('click', loadAvatars)
}

function setupAvatarAdminUpload() {
  const urlInput = document.getElementById('avatar-image-url')
  const fileInput = document.getElementById('avatar-file-input-admin')
  const uploadBtn = document.getElementById('btn-avatar-upload')
  const preview = document.getElementById('avatar-img-preview')

  uploadBtn.addEventListener('click', () => fileInput.click())

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0]
    if (!file) return
    fileInput.value = ''

    let blob
    try {
      blob = await openCropModal(file)
    } catch {
      return
    }

    uploadBtn.disabled = true
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload…'

    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error } = await supabase.storage.from('preset-avatars').upload(path, blob, { upsert: false, contentType: 'image/jpeg' })
    uploadBtn.disabled = false
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Importer'

    if (error) { showAlert('Erreur upload : ' + error.message, 'error'); return }

    const { data: { publicUrl } } = supabase.storage.from('preset-avatars').getPublicUrl(path)
    urlInput.value = publicUrl
    updatePreview(preview, publicUrl)
  })
}

async function loadAvatars() {
  const { data, error } = await supabase
    .from('preset_avatars')
    .select('*')
    .order('sort_order')
  if (error) { showAlert(error.message, 'error'); return }
  avatarsAll = data || []
  renderAvatarList()
}

function renderAvatarList() {
  const container = document.getElementById('avatars-list-content')
  if (!avatarsAll.length) {
    container.innerHTML = '<div class="chars-empty">Aucun avatar prédéfini. Cliquez sur <strong>Ajouter</strong> pour créer le premier.</div>'
    return
  }

  container.innerHTML = `<div class="avatars-preset-grid">${avatarsAll.map(a => `
    <div class="avatar-preset-card${a.active ? '' : ' avatar-inactive'}">
      <div class="avatar-preset-img-wrap">
        <img src="${a.image_url}" alt="${a.name || ''}" onerror="this.src=''">
        ${!a.active ? '<span class="avatar-hidden-badge">Masqué</span>' : ''}
      </div>
      <div class="avatar-preset-body">
        <div class="avatar-preset-name">${a.name || '—'}</div>
        <div class="avatar-preset-actions">
          <button class="btn-table-save" data-edit-avatar="${a.id}"><i class="fas fa-pencil-alt"></i></button>
          <button class="btn-table-delete" data-delete-avatar="${a.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('')}</div>`

  container.querySelectorAll('[data-edit-avatar]').forEach(btn => btn.addEventListener('click', () => openAvatarForm(btn.dataset.editAvatar)))
  container.querySelectorAll('[data-delete-avatar]').forEach(btn => {
    btn.addEventListener('click', () => {
      avatarsDeleteTarget = btn.dataset.deleteAvatar
      document.getElementById('avatars-delete-modal').style.display = 'flex'
    })
  })
}

function showAvatarList() {
  document.getElementById('avatars-view-form').style.display = 'none'
  document.getElementById('avatars-view-list').style.display = 'block'
  document.getElementById('avatars-delete-modal').style.display = 'none'
}

function openAvatarForm(avatarId = null) {
  document.getElementById('avatars-view-list').style.display = 'none'
  document.getElementById('avatars-view-form').style.display = 'block'

  if (avatarId) {
    const a = avatarsAll.find(x => x.id === avatarId)
    if (!a) return
    document.getElementById('avatars-form-title').innerHTML = '<i class="fas fa-pencil-alt"></i> Modifier l\'avatar'
    document.getElementById('avatar-edit-id').value = a.id
    document.getElementById('avatar-name').value = a.name || ''
    document.getElementById('avatar-sort').value = a.sort_order ?? 0
    document.getElementById('avatar-active').value = a.active ? 'true' : 'false'
    document.getElementById('avatar-image-url').value = a.image_url || ''
    updatePreview(document.getElementById('avatar-img-preview'), a.image_url || '')
  } else {
    document.getElementById('avatars-form-title').innerHTML = '<i class="fas fa-plus"></i> Ajouter un avatar'
    document.getElementById('avatar-edit-id').value = ''
    document.getElementById('avatar-name').value = ''
    document.getElementById('avatar-sort').value = '0'
    document.getElementById('avatar-active').value = 'true'
    document.getElementById('avatar-image-url').value = ''
    document.getElementById('avatar-img-preview').innerHTML = ''
  }
}

async function saveAvatar() {
  const id = document.getElementById('avatar-edit-id').value
  const image_url = document.getElementById('avatar-image-url').value.trim()
  if (!image_url) { showAlert('L\'image est requise.', 'error'); return }

  const payload = {
    name: document.getElementById('avatar-name').value.trim() || '',
    image_url,
    sort_order: parseInt(document.getElementById('avatar-sort').value) || 0,
    active: document.getElementById('avatar-active').value === 'true',
  }

  let error
  if (id) { ;({ error } = await supabase.from('preset_avatars').update(payload).eq('id', id)) }
  else     { ;({ error } = await supabase.from('preset_avatars').insert(payload)) }
  if (error) { showAlert(error.message, 'error'); return }

  showAlert(id ? 'Avatar mis à jour.' : 'Avatar ajouté.')
  await loadAvatars(); showAvatarList()
}

async function confirmDeleteAvatar() {
  if (!avatarsDeleteTarget) return
  const { error } = await supabase.from('preset_avatars').delete().eq('id', avatarsDeleteTarget)
  if (error) { showAlert(error.message, 'error'); return }
  showAlert('Avatar supprimé.')
  avatarsDeleteTarget = null
  document.getElementById('avatars-delete-modal').style.display = 'none'
  await loadAvatars()
}
