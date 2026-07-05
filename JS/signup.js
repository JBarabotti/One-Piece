import { supabase } from './supabase-client.js'
import { initHeader } from './header.js'
import { requireGuest, getProfileByUsername } from './auth.js'

initHeader()
requireGuest()

const form = document.getElementById('signup-form')
const alertBox = document.getElementById('alert-box')
const submitBtn = document.getElementById('submit-btn')
const usernameInput = document.getElementById('username')
const usernameStatus = document.getElementById('username-status')

let usernameAvailable = false
let usernameCheckTimeout = null

function showAlert(msg, type = 'error') {
  alertBox.innerHTML = `<div class="alert alert-${type}">${msg}</div>`
}

usernameInput.addEventListener('input', () => {
  const val = usernameInput.value.trim()
  clearTimeout(usernameCheckTimeout)
  usernameStatus.textContent = ''
  usernameAvailable = false

  if (val.length < 3) return

  usernameStatus.style.color = '#64748B'
  usernameStatus.textContent = 'Vérification...'

  usernameCheckTimeout = setTimeout(async () => {
    const profile = await getProfileByUsername(val)
    if (profile) {
      usernameStatus.style.color = '#FCA5A5'
      usernameStatus.textContent = '✗ Nom d\'utilisateur déjà pris.'
      usernameAvailable = false
    } else {
      usernameStatus.style.color = '#6EE7B7'
      usernameStatus.textContent = '✓ Nom d\'utilisateur disponible.'
      usernameAvailable = true
    }
  }, 500)
})

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  alertBox.innerHTML = ''

  const username = usernameInput.value.trim()
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  const confirm = document.getElementById('confirm-password').value

  if (username.length < 3) {
    showAlert('Le nom d\'utilisateur doit faire au moins 3 caractères.')
    return
  }

  if (!usernameAvailable) {
    showAlert('Ce nom d\'utilisateur n\'est pas disponible.')
    return
  }

  if (password !== confirm) {
    showAlert('Les mots de passe ne correspondent pas.')
    return
  }

  submitBtn.disabled = true
  submitBtn.textContent = 'Création du compte...'

  try {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const user = data.user
    if (!user) throw new Error('Erreur lors de la création du compte.')

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      username,
      email,
    })
    if (profileError) throw profileError

    window.location.href = '/faction.html'
  } catch (err) {
    const msg = err.message
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      showAlert('Cette adresse e-mail est déjà utilisée.')
    } else {
      showAlert(msg)
    }
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Créer mon compte'
  }
})
