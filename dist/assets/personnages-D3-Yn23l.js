import{a as p}from"./auth-Oj6svuaq.js";import{i as _}from"./header-Bn4yARWw.js";_();const g=new URLSearchParams(location.search);async function w(){return g.has("char")?j(g.get("char")):g.has("sub")?L(g.get("sub")):g.has("cat")?q(g.get("cat")):P()}function m(){return document.getElementById("pers-container")}function $(a){const e=document.getElementById("pers-breadcrumb");e.innerHTML=[{label:"Accueil",href:"/index.html"},{label:"Personnages",href:"/personnages.html"},...a].map((t,r,s)=>r===s.length-1?`<span class="pers-bc-current">${t.label}</span>`:`<a href="${t.href}" class="pers-bc-link">${t.label}</a><span class="pers-bc-sep"><i class="fas fa-chevron-right"></i></span>`).join("")}async function P(){document.title="Personnages — One Piece",$([]);const{data:a,error:e}=await p.from("character_categories").select("*, character_subcategories(id, name, slug, sort_order)").order("sort_order");if(e||!a){v();return}const{data:t}=await p.from("characters").select("subcategory_id, character_subcategories!inner(category_id)"),r={};t==null||t.forEach(s=>{var n;const c=(n=s.character_subcategories)==null?void 0:n.category_id;c&&(r[c]=(r[c]||0)+1)}),m().innerHTML=`
    <div class="pers-overview-hero">
      <h1 class="pers-page-title">Personnages</h1>
      <p class="pers-page-subtitle">Explorez l'univers complet de One Piece à travers ses personnages légendaires</p>
    </div>
    <div class="pers-cat-grid">
      ${a.map(s=>{const c=r[s.id]||0,n=(s.character_subcategories||[]).sort((d,u)=>d.sort_order-u.sort_order);return`
          <a href="/personnages.html?cat=${s.slug}" class="pers-cat-card" style="--cat-color:${s.color}">
            <div class="pers-cat-card-icon"><i class="fas fa-${s.icon}"></i></div>
            <div class="pers-cat-card-body">
              <h2 class="pers-cat-card-name">${s.name}</h2>
              <p class="pers-cat-card-desc">${s.description||""}</p>
              <div class="pers-cat-card-meta">
                <span>${n.length} catégorie${n.length>1?"s":""}</span>
                ${c?`<span>${c} personnage${c>1?"s":""}</span>`:""}
              </div>
              <ul class="pers-cat-card-subs">
                ${n.slice(0,5).map(d=>`<li>${d.name}</li>`).join("")}
                ${n.length>5?`<li class="more">+${n.length-5} autres…</li>`:""}
              </ul>
            </div>
            <div class="pers-cat-card-arrow"><i class="fas fa-chevron-right"></i></div>
          </a>`}).join("")}
    </div>`}async function q(a){const{data:e,error:t}=await p.from("character_categories").select("*").eq("slug",a).maybeSingle();if(t||!e){v("Catégorie introuvable.");return}document.title=`${e.name} — Personnages One Piece`,$([{label:e.name,href:`/personnages.html?cat=${a}`}]);const{data:r}=await p.from("character_subcategories").select("*, characters(id)").eq("category_id",e.id).order("sort_order");m().innerHTML=`
    <div class="pers-cat-hero" style="--cat-color:${e.color}">
      <div class="pers-cat-hero-icon"><i class="fas fa-${e.icon}"></i></div>
      <div>
        <h1 class="pers-cat-hero-name">${e.name}</h1>
        <p class="pers-cat-hero-desc">${e.description||""}</p>
      </div>
    </div>
    <div class="pers-sub-grid">
      ${(r||[]).map(s=>{var n;const c=((n=s.characters)==null?void 0:n.length)||0;return`
          <a href="/personnages.html?sub=${s.slug}" class="pers-sub-card" style="--cat-color:${e.color}">
            ${s.image_url?`<img src="${s.image_url}" alt="${s.name}" class="pers-sub-card-img">`:'<div class="pers-sub-card-img-placeholder"><i class="fas fa-users"></i></div>'}
            <div class="pers-sub-card-body">
              <h3 class="pers-sub-card-name">${s.name}</h3>
              ${s.description?`<p class="pers-sub-card-desc">${s.description}</p>`:""}
              <span class="pers-sub-card-count">${c} personnage${c>1?"s":""}</span>
            </div>
          </a>`}).join("")||'<div class="pers-empty">Aucune sous-catégorie pour le moment.</div>'}
    </div>`}async function L(a){const{data:e,error:t}=await p.from("character_subcategories").select("*, character_categories(name, slug, icon, color)").eq("slug",a).maybeSingle();if(t||!e){v("Sous-catégorie introuvable.");return}const r=e.character_categories;document.title=`${e.name} — Personnages One Piece`,$([{label:r.name,href:`/personnages.html?cat=${r.slug}`},{label:e.name,href:`/personnages.html?sub=${a}`}]);const{data:s}=await p.from("characters").select("*").eq("subcategory_id",e.id).order("sort_order");m().innerHTML=`
    <div class="pers-sub-hero" style="--cat-color:${r.color}">
      <a href="/personnages.html?cat=${r.slug}" class="pers-sub-hero-back">
        <i class="fas fa-arrow-left"></i> ${r.name}
      </a>
      <h1 class="pers-sub-hero-title">${e.name}</h1>
      ${e.description?`<p class="pers-sub-hero-desc">${e.description}</p>`:""}
    </div>
    <div class="pers-char-grid">
      ${(s||[]).map(c=>C(c,r.color)).join("")||'<div class="pers-empty">Aucun personnage dans cette catégorie pour le moment.</div>'}
    </div>`}function C(a,e="#F59E0B"){const t=a.status==="alive"?"Vivant":a.status==="dead"?"Mort":"Inconnu",r=a.status==="alive"?"alive":a.status==="dead"?"dead":"unknown";return`
    <a href="/personnages.html?char=${a.id}" class="pers-char-card" style="--cat-color:${e}">
      ${a.image_url?`<img src="${a.image_url}" alt="${a.name}" class="pers-char-card-img">`:'<div class="pers-char-card-img-placeholder"><i class="fas fa-user"></i></div>'}
      <div class="pers-char-card-body">
        <h4 class="pers-char-card-name">${a.name}</h4>
        ${a.role?`<span class="pers-char-card-role">${a.role}</span>`:""}
        <div class="pers-char-card-tags">
          ${a.faction?`<span class="pers-tag faction-${a.faction}">${a.faction.charAt(0).toUpperCase()+a.faction.slice(1)}</span>`:""}
          <span class="pers-tag status-${r}">${t}</span>
        </div>
      </div>
    </a>`}async function j(a){const{data:e,error:t}=await p.from("characters").select("*, character_subcategories(name, slug, category_id, character_categories(name, slug, icon, color))").eq("id",a).maybeSingle();if(t||!e){v("Personnage introuvable.");return}const r=e.character_subcategories,s=r==null?void 0:r.character_categories,c=(s==null?void 0:s.color)||"#F59E0B";document.title=`${e.name} — One Piece`,$([...s?[{label:s.name,href:`/personnages.html?cat=${s.slug}`}]:[],...r?[{label:r.name,href:`/personnages.html?sub=${r.slug}`}]:[],{label:e.name,href:`/personnages.html?char=${a}`}]);const n=e.status==="alive"?"Vivant":e.status==="dead"?"Mort":"Inconnu",d=e.status==="alive"?"alive":e.status==="dead"?"dead":"unknown",u={pirate:"Pirate",marine:"Marine",revolutionnaire:"Révolutionnaire",other:"Autre"},h=Array.isArray(e.content_blocks)?e.content_blocks:[];m().innerHTML=`
    <div class="pers-detail" style="--cat-color:${c}">
      <div class="pers-detail-header">
        ${e.image_url?`<img src="${e.image_url}" alt="${e.name}" class="pers-detail-img">`:'<div class="pers-detail-img-placeholder"><i class="fas fa-user"></i></div>'}
        <div class="pers-detail-info">
          ${s?`<span class="pers-detail-cat"><i class="fas fa-${s.icon}"></i> ${s.name}${r?` › ${r.name}`:""}</span>`:""}
          <h1 class="pers-detail-name">${e.name}</h1>
          ${e.role?`<p class="pers-detail-role">${e.role}</p>`:""}
          <div class="pers-detail-tags">
            ${e.faction?`<span class="pers-tag faction-${e.faction}">${u[e.faction]||e.faction}</span>`:""}
            <span class="pers-tag status-${d}">${n}</span>
          </div>
          <dl class="pers-detail-stats">
            ${e.bounty?`<div class="pers-stat"><dt>Prime</dt><dd>${e.bounty}</dd></div>`:""}
            ${e.devil_fruit?`<div class="pers-stat"><dt>Fruit du Démon</dt><dd>${e.devil_fruit}</dd></div>`:""}
          </dl>
        </div>
      </div>
      ${e.description?`
        <div class="pers-detail-desc">
          <h2>Description</h2>
          <p>${e.description}</p>
        </div>`:""}
      ${h.length?`<div class="pers-content-blocks">${h.map(k).join("")}</div>`:""}
      <a href="${r?`/personnages.html?sub=${r.slug}`:"/personnages.html"}" class="pers-back-btn">
        <i class="fas fa-arrow-left"></i> Retour
      </a>
    </div>`}function k(a){var e,t,r,s,c,n,d,u,h,f,b;if(!(a!=null&&a.type))return"";switch(a.type){case"heading":{const i=((e=a.data)==null?void 0:e.level)||2;return`<h${i} class="${i===2?"block-heading-2":i===3?"block-heading-3":"block-heading-4"}">${o(((t=a.data)==null?void 0:t.text)||"")}</h${i}>`}case"text":return`<p class="block-text-content">${o(((r=a.data)==null?void 0:r.content)||"")}</p>`;case"image":{const i=(s=a.data)==null?void 0:s.url;return i?`<figure class="block-image-wrap">
        <img src="${i}" alt="${o(((c=a.data)==null?void 0:c.alt)||"")}" loading="lazy">
        ${(n=a.data)!=null&&n.caption?`<figcaption class="block-image-caption">${o(a.data.caption)}</figcaption>`:""}
      </figure>`:""}case"gallery":{const i=(((d=a.data)==null?void 0:d.images)||[]).filter(l=>l.url);return i.length?`<div class="block-gallery-grid">
        ${i.map(l=>`<div class="block-gallery-item">
          <img src="${l.url}" alt="${o(l.caption||"")}" loading="lazy">
          ${l.caption?`<p>${o(l.caption)}</p>`:""}
        </div>`).join("")}
      </div>`:""}case"stats":{const i=(((u=a.data)==null?void 0:u.items)||[]).filter(l=>l.label||l.value);return i.length?`<div class="block-stats-grid">
        ${i.map(l=>`<div class="block-stat-item">
          <div class="block-stat-value">${o(l.value)}</div>
          <div class="block-stat-label">${o(l.label)}</div>
        </div>`).join("")}
      </div>`:""}case"quote":return(h=a.data)!=null&&h.text?`<blockquote class="block-quote">
        <p class="block-quote-text">${o(a.data.text)}</p>
        ${a.data.author?`<cite class="block-quote-author">${o(a.data.author)}</cite>`:""}
      </blockquote>`:"";case"list":{const i=(((f=a.data)==null?void 0:f.items)||[]).filter(Boolean);if(!i.length)return"";const l=(b=a.data)!=null&&b.ordered?"ol":"ul";return`<${l} class="block-list-content">
        ${i.map(y=>`<li>${o(y)}</li>`).join("")}
      </${l}>`}case"separator":return'<hr class="block-separator">';default:return""}}function o(a){return a?String(a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function v(a="Une erreur est survenue."){m().innerHTML=`<div class="pers-error"><i class="fas fa-exclamation-circle"></i> ${a}</div>`}w();
