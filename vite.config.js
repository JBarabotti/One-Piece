import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        signup: 'signup.html',
        'reset-password': 'reset-password.html',
        faction: 'faction.html',
        profile: 'profile.html',
        messages: 'messages.html',
        admin: 'admin.html',
      }
    }
  }
})
