import { supabase } from './supabase-client.js'
import { initHeader } from './header.js'
import { requireGuest } from './auth.js'

initHeader()
requireGuest()

const form = document.getElementById('login-form')
const alertBox = document.getElementById('alert-box')
const submitBtn = document.getElementById('submit-btn')

function showAlert(msg, type = 'error') {
  alertBox.innerHTML = `<div class="alert alert-${type}">${msg}</div>`
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const identifier = document.getElementById('identifier').value.trim()
  const password = document.getElementById('password').value

  submitBtn.disabled = true
  submitBtn.textContent = 'Connexion...'
  alertBox.innerHTML = ''

  try {
    let email = identifier

    if (!identifier.includes('@')) {
      const { data: resolvedEmail, error: rpcError } = await supabase
        .rpc('get_user_email_by_username', { p_username: identifier })

      if (rpcError || !resolvedEmail) {
        showAlert('Nom d\'utilisateur introuvable.')
        return
      }
      email = resolvedEmail
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    window.location.href = '/profile.html'
  } catch (err) {
    const msg = err.message
    if (msg === 'Invalid login credentials') {
      showAlert('Identifiant ou mot de passe incorrect.')
    } else {
      showAlert(msg)
    }
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Se connecter'
  }
})
