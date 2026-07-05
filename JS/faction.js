import { supabase } from './supabase-client.js'
import { initHeader } from './header.js'
import { requireAuth } from './auth.js'

initHeader()

let currentUser = null
let selectedFaction = null

const fromProfile = new URLSearchParams(location.search).get('from') === 'profile'

;(async () => {
  currentUser = await requireAuth()
  if (!currentUser) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('faction')
    .eq('id', currentUser.id)
    .maybeSingle()

  // When coming from profile, pre-select current faction instead of redirecting away
  if (profile?.faction && !fromProfile) {
    window.location.href = '/profile.html'
    return
  }

  if (profile?.faction && fromProfile) {
    const card = document.querySelector(`.faction-card[data-faction="${profile.faction}"]`)
    if (card) {
      card.classList.add('selected')
      selectedFaction = profile.faction
      document.getElementById('confirm-btn').disabled = false
    }
  }
})()

const cards = document.querySelectorAll('.faction-card')
const confirmBtn = document.getElementById('confirm-btn')

cards.forEach(card => {
  card.addEventListener('click', () => {
    cards.forEach(c => c.classList.remove('selected'))
    card.classList.add('selected')
    selectedFaction = card.dataset.faction
    confirmBtn.disabled = false
  })
})

confirmBtn.addEventListener('click', async () => {
  if (!selectedFaction || !currentUser) return

  confirmBtn.disabled = true
  confirmBtn.textContent = 'Enregistrement...'

  const { error } = await supabase
    .from('profiles')
    .update({ faction: selectedFaction })
    .eq('id', currentUser.id)

  if (error) {
    document.getElementById('alert-box').innerHTML = `<div class="alert alert-error" style="max-width:600px;margin:0 auto 20px;">${error.message}</div>`
    confirmBtn.disabled = false
    confirmBtn.textContent = 'Je confirme'
  } else {
    window.location.href = '/profile.html'
  }
})
