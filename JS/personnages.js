import { supabase } from './supabase-client.js'
import { initHeader } from './header.js'

initHeader()

// ── Route resolution ──────────────────────────────────────────
const params = new URLSearchParams(location.search)
const CAT_COLORS = { '#F59E0B': '#F59E0B', '#38BDF8': '#38BDF8', '#EF4444': '#EF4444' }

async function route() {
  if (params.has('char')) return renderCharacter(params.get('char'))
  if (params.has('sub'))  return renderSubcategory(params.get('sub'))
  if (params.has('cat'))  return renderCategory(params.get('cat'))
  return renderOverview()
}

function container() { return document.getElementById('pers-container') }

function navigate(url) {
  window.location.href = url
}

// ── Breadcrumb ────────────────────────────────────────────────
function setBreadcrumb(items) {
  const el = document.getElementById('pers-breadcrumb')
  el.innerHTML = [
    { label: 'Accueil', href: '/index.html' },
    { label: 'Personnages', href: '/personnages.html' },
    ...items
  ].map((item, i, arr) => {
    const isLast = i === arr.length - 1
    if (isLast) return `<span class="pers-bc-current">${item.label}</span>`
    return `<a href="${item.href}" class="pers-bc-link">${item.label}</a><span class="pers-bc-sep"><i class="fas fa-chevron-right"></i></span>`
  }).join('')
}

// ── Overview: all categories ──────────────────────────────────
async function renderOverview() {
  document.title = 'Personnages — One Piece'
  setBreadcrumb([])

  const { data: cats, error } = await supabase
    .from('character_categories')
    .select('*, character_subcategories(id, name, slug, sort_order)')
    .order('sort_order')

  if (error || !cats) { showError(); return }

  const { data: counts } = await supabase
    .from('characters')
    .select('subcategory_id, character_subcategories!inner(category_id)')

  const charCountByCat = {}
  counts?.forEach(c => {
    const cid = c.character_subcategories?.category_id
    if (cid) charCountByCat[cid] = (charCountByCat[cid] || 0) + 1
  })

  container().innerHTML = `
    <div class="pers-overview-hero">
      <h1 class="pers-page-title">Personnages</h1>
      <p class="pers-page-subtitle">Explorez l'univers complet de One Piece à travers ses personnages légendaires</p>
    </div>
    <div class="pers-cat-grid">
      ${cats.map(cat => {
        const count = charCountByCat[cat.id] || 0
        const subs = (cat.character_subcategories || []).sort((a, b) => a.sort_order - b.sort_order)
        return `
          <a href="/personnages.html?cat=${cat.slug}" class="pers-cat-card" style="--cat-color:${cat.color}">
            <div class="pers-cat-card-icon"><i class="fas fa-${cat.icon}"></i></div>
            <div class="pers-cat-card-body">
              <h2 class="pers-cat-card-name">${cat.name}</h2>
              <p class="pers-cat-card-desc">${cat.description || ''}</p>
              <div class="pers-cat-card-meta">
                <span>${subs.length} catégorie${subs.length > 1 ? 's' : ''}</span>
                ${count ? `<span>${count} personnage${count > 1 ? 's' : ''}</span>` : ''}
              </div>
              <ul class="pers-cat-card-subs">
                ${subs.slice(0, 5).map(s => `<li>${s.name}</li>`).join('')}
                ${subs.length > 5 ? `<li class="more">+${subs.length - 5} autres…</li>` : ''}
              </ul>
            </div>
            <div class="pers-cat-card-arrow"><i class="fas fa-chevron-right"></i></div>
          </a>`
      }).join('')}
    </div>`
}

// ── Category view: list subcategories ────────────────────────
async function renderCategory(catSlug) {
  const { data: cat, error } = await supabase
    .from('character_categories')
    .select('*')
    .eq('slug', catSlug)
    .maybeSingle()

  if (error || !cat) { showError('Catégorie introuvable.'); return }

  document.title = `${cat.name} — Personnages One Piece`
  setBreadcrumb([{ label: cat.name, href: `/personnages.html?cat=${catSlug}` }])

  const { data: subs } = await supabase
    .from('character_subcategories')
    .select('*, characters(id)')
    .eq('category_id', cat.id)
    .order('sort_order')

  container().innerHTML = `
    <div class="pers-cat-hero" style="--cat-color:${cat.color}">
      <div class="pers-cat-hero-icon"><i class="fas fa-${cat.icon}"></i></div>
      <div>
        <h1 class="pers-cat-hero-name">${cat.name}</h1>
        <p class="pers-cat-hero-desc">${cat.description || ''}</p>
      </div>
    </div>
    <div class="pers-sub-grid">
      ${(subs || []).map(sub => {
        const count = sub.characters?.length || 0
        return `
          <a href="/personnages.html?sub=${sub.slug}" class="pers-sub-card" style="--cat-color:${cat.color}">
            ${sub.image_url ? `<img src="${sub.image_url}" alt="${sub.name}" class="pers-sub-card-img">` : `<div class="pers-sub-card-img-placeholder"><i class="fas fa-users"></i></div>`}
            <div class="pers-sub-card-body">
              <h3 class="pers-sub-card-name">${sub.name}</h3>
              ${sub.description ? `<p class="pers-sub-card-desc">${sub.description}</p>` : ''}
              <span class="pers-sub-card-count">${count} personnage${count > 1 ? 's' : ''}</span>
            </div>
          </a>`
      }).join('') || '<div class="pers-empty">Aucune sous-catégorie pour le moment.</div>'}
    </div>`
}

// ── Subcategory view: list characters ────────────────────────
async function renderSubcategory(subSlug) {
  const { data: sub, error } = await supabase
    .from('character_subcategories')
    .select('*, character_categories(name, slug, icon, color)')
    .eq('slug', subSlug)
    .maybeSingle()

  if (error || !sub) { showError('Sous-catégorie introuvable.'); return }

  const cat = sub.character_categories
  document.title = `${sub.name} — Personnages One Piece`
  setBreadcrumb([
    { label: cat.name, href: `/personnages.html?cat=${cat.slug}` },
    { label: sub.name, href: `/personnages.html?sub=${subSlug}` },
  ])

  const { data: chars } = await supabase
    .from('characters')
    .select('*')
    .eq('subcategory_id', sub.id)
    .order('sort_order')

  container().innerHTML = `
    <div class="pers-sub-hero" style="--cat-color:${cat.color}">
      <a href="/personnages.html?cat=${cat.slug}" class="pers-sub-hero-back">
        <i class="fas fa-arrow-left"></i> ${cat.name}
      </a>
      <h1 class="pers-sub-hero-title">${sub.name}</h1>
      ${sub.description ? `<p class="pers-sub-hero-desc">${sub.description}</p>` : ''}
    </div>
    <div class="pers-char-grid">
      ${(chars || []).map(c => renderCharCard(c, cat.color)).join('') || '<div class="pers-empty">Aucun personnage dans cette catégorie pour le moment.</div>'}
    </div>`
}

function renderCharCard(c, color = '#F59E0B') {
  const statusLabel = c.status === 'alive' ? 'Vivant' : c.status === 'dead' ? 'Mort' : 'Inconnu'
  const statusClass = c.status === 'alive' ? 'alive' : c.status === 'dead' ? 'dead' : 'unknown'
  return `
    <a href="/personnages.html?char=${c.id}" class="pers-char-card" style="--cat-color:${color}">
      ${c.image_url
        ? `<img src="${c.image_url}" alt="${c.name}" class="pers-char-card-img">`
        : `<div class="pers-char-card-img-placeholder"><i class="fas fa-user"></i></div>`}
      <div class="pers-char-card-body">
        <h4 class="pers-char-card-name">${c.name}</h4>
        ${c.role ? `<span class="pers-char-card-role">${c.role}</span>` : ''}
        <div class="pers-char-card-tags">
          ${c.faction ? `<span class="pers-tag faction-${c.faction}">${c.faction.charAt(0).toUpperCase()+c.faction.slice(1)}</span>` : ''}
          <span class="pers-tag status-${statusClass}">${statusLabel}</span>
        </div>
      </div>
    </a>`
}

// ── Character detail ──────────────────────────────────────────
async function renderCharacter(charId) {
  const { data: c, error } = await supabase
    .from('characters')
    .select('*, character_subcategories(name, slug, category_id, character_categories(name, slug, icon, color))')
    .eq('id', charId)
    .maybeSingle()

  if (error || !c) { showError('Personnage introuvable.'); return }

  const sub = c.character_subcategories
  const cat = sub?.character_categories
  const color = cat?.color || '#F59E0B'

  document.title = `${c.name} — One Piece`
  setBreadcrumb([
    ...(cat ? [{ label: cat.name, href: `/personnages.html?cat=${cat.slug}` }] : []),
    ...(sub ? [{ label: sub.name, href: `/personnages.html?sub=${sub.slug}` }] : []),
    { label: c.name, href: `/personnages.html?char=${charId}` },
  ])

  const statusLabel = c.status === 'alive' ? 'Vivant' : c.status === 'dead' ? 'Mort' : 'Inconnu'
  const statusClass = c.status === 'alive' ? 'alive' : c.status === 'dead' ? 'dead' : 'unknown'
  const factionLabels = { pirate: 'Pirate', marine: 'Marine', revolutionnaire: 'Révolutionnaire', other: 'Autre' }

  container().innerHTML = `
    <div class="pers-detail" style="--cat-color:${color}">
      <div class="pers-detail-header">
        ${c.image_url
          ? `<img src="${c.image_url}" alt="${c.name}" class="pers-detail-img">`
          : `<div class="pers-detail-img-placeholder"><i class="fas fa-user"></i></div>`}
        <div class="pers-detail-info">
          ${cat ? `<span class="pers-detail-cat"><i class="fas fa-${cat.icon}"></i> ${cat.name}${sub ? ` › ${sub.name}` : ''}</span>` : ''}
          <h1 class="pers-detail-name">${c.name}</h1>
          ${c.role ? `<p class="pers-detail-role">${c.role}</p>` : ''}
          <div class="pers-detail-tags">
            ${c.faction ? `<span class="pers-tag faction-${c.faction}">${factionLabels[c.faction] || c.faction}</span>` : ''}
            <span class="pers-tag status-${statusClass}">${statusLabel}</span>
          </div>
          <dl class="pers-detail-stats">
            ${c.bounty ? `<div class="pers-stat"><dt>Prime</dt><dd>${c.bounty}</dd></div>` : ''}
            ${c.devil_fruit ? `<div class="pers-stat"><dt>Fruit du Démon</dt><dd>${c.devil_fruit}</dd></div>` : ''}
          </dl>
        </div>
      </div>
      ${c.description ? `
        <div class="pers-detail-desc">
          <h2>Description</h2>
          <p>${c.description}</p>
        </div>` : ''}
      <a href="${sub ? `/personnages.html?sub=${sub.slug}` : '/personnages.html'}" class="pers-back-btn">
        <i class="fas fa-arrow-left"></i> Retour
      </a>
    </div>`
}

function showError(msg = 'Une erreur est survenue.') {
  container().innerHTML = `<div class="pers-error"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`
}

route()
