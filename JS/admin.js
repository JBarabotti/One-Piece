import { supabase } from './supabase-client.js'
import { initHeader } from './header.js'
import { requireAdmin, getProfileByUsername } from './auth.js'

initHeader()

let adminUser = null
let adminProfile = null
let eventIds = { anime: null, manga: null }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function showGlobal(msg, type = 'success') {
  const el = document.getElementById('alert-global')
  el.innerHTML = `<div class="alert alert-${type}" style="margin-bottom:18px;">${msg}</div>`
  setTimeout(() => { el.innerHTML = '' }, 4000)
}

;(async () => {
  const result = await requireAdmin()
  if (!result) return
  adminUser = result.user
  adminProfile = result.profile

  await loadUsers()
  await loadEvents()
  setupTabs()
  setupEventEditors()
  setupAdminMessage()
})()

// ── Tabs ──────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active')
    })
  })
}

// ── Users ─────────────────────────────────────────────────────
async function loadUsers() {
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const tbody = document.getElementById('users-tbody')
  if (!users || !users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#475569;text-align:center;padding:20px;">Aucun utilisateur.</td></tr>'
    return
  }

  tbody.innerHTML = users.map(u => {
    const isMe = u.id === adminUser.id
    const date = new Date(u.created_at).toLocaleDateString('fr-FR')
    const factionLabel = u.faction
      ? u.faction.charAt(0).toUpperCase() + u.faction.slice(1)
      : '—'

    return `<tr>
      <td><strong style="color:#F8FAFC;">${u.username}</strong></td>
      <td style="color:#94A3B8;">${u.email || '—'}</td>
      <td style="color:#94A3B8;">${factionLabel}</td>
      <td><span class="role-badge ${u.role}">${u.role}</span></td>
      <td style="color:#64748B;">${date}</td>
      <td>
        <div class="admin-table-actions">
          ${!isMe ? `
            <select class="event-field-input" data-user-id="${u.id}" style="padding:6px 10px;font-size:12px;width:auto;">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>Utilisateur</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <button class="btn-edit" style="font-size:12px;" data-save-role="${u.id}">Sauver</button>
            <button class="btn-danger" data-delete-user="${u.id}" data-username="${u.username}">Supprimer</button>
          ` : `<span style="color:#475569;font-size:12px;">C'est vous</span>`}
        </div>
      </td>
    </tr>`
  }).join('')

  // Role change
  tbody.querySelectorAll('[data-save-role]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.saveRole
      const select = tbody.querySelector(`select[data-user-id="${userId}"]`)
      const newRole = select.value
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) { showGlobal(error.message, 'error') } else { showGlobal('Rôle mis à jour.'); loadUsers() }
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
        if (!res.ok) throw new Error(json.error || 'Erreur de suppression')
        showGlobal(`Compte de ${username} supprimé.`)
        loadUsers()
      } catch (err) {
        showGlobal(err.message, 'error')
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
  document.querySelectorAll('.btn-save-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type
      if (!type) return

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
        const { data, error: insertErr } = await supabase.from('events').insert({ ...fields, type }).select().maybeSingle()
        error = insertErr
        if (data) eventIds[type] = data.id
      }

      if (error) { showGlobal(error.message, 'error') } else { showGlobal(`Évènement ${type} mis à jour.`) }
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
    if (!targetUserId) { showGlobal('Sélectionnez un destinataire valide.', 'error'); return }
    if (!content) { showGlobal('Le message est vide.', 'error'); return }

    const { error } = await supabase.from('messages').insert({
      sender_id: adminUser.id,
      receiver_id: targetUserId,
      content
    })

    if (error) { showGlobal(error.message, 'error') } else {
      document.getElementById('msg-content').value = ''
      showGlobal('Message envoyé.')
    }
  })
}
