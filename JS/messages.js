import { supabase } from './supabase-client.js'
import { initHeader } from './header.js'
import { requireAuth } from './auth.js'

initHeader()

let currentUser = null
let currentProfile = null
let activePartnerId = null
let realtimeChannel = null
let conversations = []

;(async () => {
  currentUser = await requireAuth()
  if (!currentUser) return

  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle()
  currentProfile = data

  await loadConversations()
  setupSearch()
  setupRealtime()

  // Open conversation from URL param ?with=userId
  const params = new URLSearchParams(window.location.search)
  const withId = params.get('with')
  if (withId) openConversation(withId)
})()

// ── Load conversation list ────────────────────────────────────
async function loadConversations() {
  const { data: msgs } = await supabase
    .from('messages')
    .select(`
      id, content, created_at, read, sender_id, receiver_id,
      sender:sender_id(id, username, avatar_url),
      receiver:receiver_id(id, username, avatar_url)
    `)
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
    .order('created_at', { ascending: false })

  if (!msgs) return

  // Group by partner
  const convMap = new Map()
  for (const msg of msgs) {
    const partner = msg.sender_id === currentUser.id ? msg.receiver : msg.sender
    if (!partner) continue
    if (!convMap.has(partner.id)) {
      convMap.set(partner.id, { partner, lastMsg: msg, unread: 0 })
    }
    if (!msg.read && msg.receiver_id === currentUser.id) {
      convMap.get(partner.id).unread++
    }
  }

  conversations = Array.from(convMap.values())
  renderConvList()
}

function renderConvList() {
  const list = document.getElementById('conv-list')
  if (!conversations.length) {
    list.innerHTML = `<div style="padding:20px; color:#475569; font-family:'Inter',sans-serif; font-size:13px; text-align:center;">Aucune conversation.<br>Recherchez un utilisateur pour commencer.</div>`
    return
  }

  list.innerHTML = conversations.map(({ partner, lastMsg, unread }) => {
    const avatarHtml = partner.avatar_url
      ? `<img src="${partner.avatar_url}" alt="${partner.username}">`
      : partner.username[0].toUpperCase()

    const isActive = partner.id === activePartnerId ? 'active' : ''
    const preview = lastMsg.content.length > 32 ? lastMsg.content.slice(0, 32) + '…' : lastMsg.content
    const unreadBadge = unread > 0 ? `<span class="conv-unread">${unread}</span>` : ''

    return `<div class="conv-item ${isActive}" data-partner-id="${partner.id}">
      <div class="conv-avatar">${avatarHtml}</div>
      <div class="conv-info">
        <div class="conv-name">${partner.username}</div>
        <div class="conv-last">${lastMsg.sender_id === currentUser.id ? 'Vous : ' : ''}${preview}</div>
      </div>
      ${unreadBadge}
    </div>`
  }).join('')

  list.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => openConversation(item.dataset.partnerId))
  })
}

// ── Open a conversation ───────────────────────────────────────
async function openConversation(partnerId) {
  activePartnerId = partnerId

  // Mark as read
  await supabase.from('messages')
    .update({ read: true })
    .eq('receiver_id', currentUser.id)
    .eq('sender_id', partnerId)

  const { data: partner } = await supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle()
  if (!partner) return

  const { data: msgs } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true })

  const avatarHtml = partner.avatar_url
    ? `<img src="${partner.avatar_url}" alt="${partner.username}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.15);border:2px solid rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center;font-family:'Pirata One',cursive;font-size:16px;color:#F59E0B;">${partner.username[0].toUpperCase()}</div>`

  document.getElementById('messages-main').innerHTML = `
    <div class="messages-main-header">
      ${avatarHtml}
      <span class="messages-main-name">${partner.username}</span>
    </div>
    <div class="messages-thread" id="messages-thread"></div>
    <div class="messages-input-area">
      <textarea class="messages-textarea" id="msg-input" placeholder="Écrivez votre message…" rows="1"></textarea>
      <button class="messages-send-btn" id="send-btn"><i class="fas fa-paper-plane"></i></button>
    </div>
  `

  renderMessages(msgs || [])

  document.getElementById('send-btn').addEventListener('click', sendMessage)
  document.getElementById('msg-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  })

  // Refresh conv list to clear unread badge
  await loadConversations()
}

function renderMessages(msgs) {
  const thread = document.getElementById('messages-thread')
  if (!thread) return
  thread.innerHTML = msgs.map(msg => {
    const mine = msg.sender_id === currentUser.id
    const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `<div class="msg-bubble-wrap ${mine ? 'mine' : 'theirs'}">
      <div class="msg-bubble">${escapeHtml(msg.content)}</div>
      <div class="msg-time">${time}</div>
    </div>`
  }).join('')
  thread.scrollTop = thread.scrollHeight
}

async function sendMessage() {
  const input = document.getElementById('msg-input')
  const content = input?.value.trim()
  if (!content || !activePartnerId) return

  input.value = ''

  const { error } = await supabase.from('messages').insert({
    sender_id: currentUser.id,
    receiver_id: activePartnerId,
    content
  })

  if (!error) {
    await loadConversations()
    await openConversation(activePartnerId)
  }
}

// ── User search ───────────────────────────────────────────────
function setupSearch() {
  const searchInput = document.getElementById('user-search')
  const resultsEl = document.getElementById('search-results')
  let searchTimeout = null

  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim()
    clearTimeout(searchTimeout)
    if (val.length < 2) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; return }

    searchTimeout = setTimeout(async () => {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${val}%`)
        .neq('id', currentUser.id)
        .limit(6)

      if (!users || !users.length) { resultsEl.style.display = 'none'; return }

      resultsEl.innerHTML = users.map(u =>
        `<div class="messages-search-result-item" data-id="${u.id}">${u.username}</div>`
      ).join('')
      resultsEl.style.display = 'block'

      resultsEl.querySelectorAll('.messages-search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          searchInput.value = ''
          resultsEl.style.display = 'none'
          openConversation(item.dataset.id)
        })
      })
    }, 300)
  })

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#user-search') && !e.target.closest('#search-results')) {
      resultsEl.style.display = 'none'
    }
  })
}

// ── Realtime subscription ─────────────────────────────────────
function setupRealtime() {
  realtimeChannel = supabase
    .channel('messages-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, async (payload) => {
      const msg = payload.new
      if (msg.receiver_id !== currentUser.id && msg.sender_id !== currentUser.id) return

      await loadConversations()

      if (activePartnerId && (msg.sender_id === activePartnerId || msg.receiver_id === activePartnerId)) {
        await openConversation(activePartnerId)
      }
    })
    .subscribe()
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
