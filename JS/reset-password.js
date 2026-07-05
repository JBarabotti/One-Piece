import { supabase } from './supabase-client.js'
import { initHeader } from './header.js'

initHeader()

const step1 = document.getElementById('step-1')
const step2 = document.getElementById('step-2')

let emailForReset = ''

// ── Step 1: send OTP ─────────────────────────────────────────
document.getElementById('otp-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const alertBox = document.getElementById('alert-box-1')
  const btn = document.getElementById('send-btn')
  emailForReset = document.getElementById('email-input').value.trim()

  btn.disabled = true
  btn.textContent = 'Envoi en cours...'
  alertBox.innerHTML = ''

  const { error } = await supabase.auth.signInWithOtp({
    email: emailForReset,
    options: { shouldCreateUser: false }
  })

  if (error) {
    alertBox.innerHTML = `<div class="alert alert-error">${error.message}</div>`
    btn.disabled = false
    btn.textContent = 'Envoyer le code'
  } else {
    step1.style.display = 'none'
    step2.style.display = 'block'
  }
})

// ── Step 2: verify OTP + set new password ────────────────────
document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const alertBox = document.getElementById('alert-box-2')
  const btn = document.getElementById('confirm-btn')

  const token = document.getElementById('otp-input').value.trim()
  const newPassword = document.getElementById('new-password').value
  const confirmPassword = document.getElementById('confirm-password').value

  if (newPassword !== confirmPassword) {
    alertBox.innerHTML = `<div class="alert alert-error">Les mots de passe ne correspondent pas.</div>`
    return
  }

  btn.disabled = true
  btn.textContent = 'Vérification...'
  alertBox.innerHTML = ''

  try {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: emailForReset,
      token,
      type: 'email'
    })
    if (verifyError) throw verifyError

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) throw updateError

    await supabase.auth.signOut()
    alertBox.innerHTML = `<div class="alert alert-success">Mot de passe modifié avec succès ! Redirection...</div>`
    setTimeout(() => { window.location.href = '/login.html' }, 2000)
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  } finally {
    btn.disabled = false
    btn.textContent = 'Confirmer'
  }
})
