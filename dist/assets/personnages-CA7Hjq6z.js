import{a as i}from"./auth-B7GK6hiI.js";import{i as g}from"./header-BHsTiLCG.js";g();const o=new URLSearchParams(location.search);async function m(){return o.has("char")?_(o.get("char")):o.has("sub")?v(o.get("sub")):o.has("cat")?f(o.get("cat")):$()}function d(){return document.getElementById("pers-container")}function p(s){const e=document.getElementById("pers-breadcrumb");e.innerHTML=[{label:"Accueil",href:"/index.html"},{label:"Personnages",href:"/personnages.html"},...s].map((t,r,a)=>r===a.length-1?`<span class="pers-bc-current">${t.label}</span>`:`<a href="${t.href}" class="pers-bc-link">${t.label}</a><span class="pers-bc-sep"><i class="fas fa-chevron-right"></i></span>`).join("")}async function $(){document.title="Personnages — One Piece",p([]);const{data:s,error:e}=await i.from("character_categories").select("*, character_subcategories(id, name, slug, sort_order)").order("sort_order");if(e||!s){u();return}const{data:t}=await i.from("characters").select("subcategory_id, character_subcategories!inner(category_id)"),r={};t==null||t.forEach(a=>{var n;const c=(n=a.character_subcategories)==null?void 0:n.category_id;c&&(r[c]=(r[c]||0)+1)}),d().innerHTML=`
    <div class="pers-overview-hero">
      <h1 class="pers-page-title">Personnages</h1>
      <p class="pers-page-subtitle">Explorez l'univers complet de One Piece à travers ses personnages légendaires</p>
    </div>
    <div class="pers-cat-grid">
      ${s.map(a=>{const c=r[a.id]||0,n=(a.character_subcategories||[]).sort((l,h)=>l.sort_order-h.sort_order);return`
          <a href="/personnages.html?cat=${a.slug}" class="pers-cat-card" style="--cat-color:${a.color}">
            <div class="pers-cat-card-icon"><i class="fas fa-${a.icon}"></i></div>
            <div class="pers-cat-card-body">
              <h2 class="pers-cat-card-name">${a.name}</h2>
              <p class="pers-cat-card-desc">${a.description||""}</p>
              <div class="pers-cat-card-meta">
                <span>${n.length} catégorie${n.length>1?"s":""}</span>
                ${c?`<span>${c} personnage${c>1?"s":""}</span>`:""}
              </div>
              <ul class="pers-cat-card-subs">
                ${n.slice(0,5).map(l=>`<li>${l.name}</li>`).join("")}
                ${n.length>5?`<li class="more">+${n.length-5} autres…</li>`:""}
              </ul>
            </div>
            <div class="pers-cat-card-arrow"><i class="fas fa-chevron-right"></i></div>
          </a>`}).join("")}
    </div>`}async function f(s){const{data:e,error:t}=await i.from("character_categories").select("*").eq("slug",s).maybeSingle();if(t||!e){u("Catégorie introuvable.");return}document.title=`${e.name} — Personnages One Piece`,p([{label:e.name,href:`/personnages.html?cat=${s}`}]);const{data:r}=await i.from("character_subcategories").select("*, characters(id)").eq("category_id",e.id).order("sort_order");d().innerHTML=`
    <div class="pers-cat-hero" style="--cat-color:${e.color}">
      <div class="pers-cat-hero-icon"><i class="fas fa-${e.icon}"></i></div>
      <div>
        <h1 class="pers-cat-hero-name">${e.name}</h1>
        <p class="pers-cat-hero-desc">${e.description||""}</p>
      </div>
    </div>
    <div class="pers-sub-grid">
      ${(r||[]).map(a=>{var n;const c=((n=a.characters)==null?void 0:n.length)||0;return`
          <a href="/personnages.html?sub=${a.slug}" class="pers-sub-card" style="--cat-color:${e.color}">
            ${a.image_url?`<img src="${a.image_url}" alt="${a.name}" class="pers-sub-card-img">`:'<div class="pers-sub-card-img-placeholder"><i class="fas fa-users"></i></div>'}
            <div class="pers-sub-card-body">
              <h3 class="pers-sub-card-name">${a.name}</h3>
              ${a.description?`<p class="pers-sub-card-desc">${a.description}</p>`:""}
              <span class="pers-sub-card-count">${c} personnage${c>1?"s":""}</span>
            </div>
          </a>`}).join("")||'<div class="pers-empty">Aucune sous-catégorie pour le moment.</div>'}
    </div>`}async function v(s){const{data:e,error:t}=await i.from("character_subcategories").select("*, character_categories(name, slug, icon, color)").eq("slug",s).maybeSingle();if(t||!e){u("Sous-catégorie introuvable.");return}const r=e.character_categories;document.title=`${e.name} — Personnages One Piece`,p([{label:r.name,href:`/personnages.html?cat=${r.slug}`},{label:e.name,href:`/personnages.html?sub=${s}`}]);const{data:a}=await i.from("characters").select("*").eq("subcategory_id",e.id).order("sort_order");d().innerHTML=`
    <div class="pers-sub-hero" style="--cat-color:${r.color}">
      <a href="/personnages.html?cat=${r.slug}" class="pers-sub-hero-back">
        <i class="fas fa-arrow-left"></i> ${r.name}
      </a>
      <h1 class="pers-sub-hero-title">${e.name}</h1>
      ${e.description?`<p class="pers-sub-hero-desc">${e.description}</p>`:""}
    </div>
    <div class="pers-char-grid">
      ${(a||[]).map(c=>b(c,r.color)).join("")||'<div class="pers-empty">Aucun personnage dans cette catégorie pour le moment.</div>'}
    </div>`}function b(s,e="#F59E0B"){const t=s.status==="alive"?"Vivant":s.status==="dead"?"Mort":"Inconnu",r=s.status==="alive"?"alive":s.status==="dead"?"dead":"unknown";return`
    <a href="/personnages.html?char=${s.id}" class="pers-char-card" style="--cat-color:${e}">
      ${s.image_url?`<img src="${s.image_url}" alt="${s.name}" class="pers-char-card-img">`:'<div class="pers-char-card-img-placeholder"><i class="fas fa-user"></i></div>'}
      <div class="pers-char-card-body">
        <h4 class="pers-char-card-name">${s.name}</h4>
        ${s.role?`<span class="pers-char-card-role">${s.role}</span>`:""}
        <div class="pers-char-card-tags">
          ${s.faction?`<span class="pers-tag faction-${s.faction}">${s.faction.charAt(0).toUpperCase()+s.faction.slice(1)}</span>`:""}
          <span class="pers-tag status-${r}">${t}</span>
        </div>
      </div>
    </a>`}async function _(s){const{data:e,error:t}=await i.from("characters").select("*, character_subcategories(name, slug, category_id, character_categories(name, slug, icon, color))").eq("id",s).maybeSingle();if(t||!e){u("Personnage introuvable.");return}const r=e.character_subcategories,a=r==null?void 0:r.character_categories,c=(a==null?void 0:a.color)||"#F59E0B";document.title=`${e.name} — One Piece`,p([...a?[{label:a.name,href:`/personnages.html?cat=${a.slug}`}]:[],...r?[{label:r.name,href:`/personnages.html?sub=${r.slug}`}]:[],{label:e.name,href:`/personnages.html?char=${s}`}]);const n=e.status==="alive"?"Vivant":e.status==="dead"?"Mort":"Inconnu",l=e.status==="alive"?"alive":e.status==="dead"?"dead":"unknown",h={pirate:"Pirate",marine:"Marine",revolutionnaire:"Révolutionnaire",other:"Autre"};d().innerHTML=`
    <div class="pers-detail" style="--cat-color:${c}">
      <div class="pers-detail-header">
        ${e.image_url?`<img src="${e.image_url}" alt="${e.name}" class="pers-detail-img">`:'<div class="pers-detail-img-placeholder"><i class="fas fa-user"></i></div>'}
        <div class="pers-detail-info">
          ${a?`<span class="pers-detail-cat"><i class="fas fa-${a.icon}"></i> ${a.name}${r?` › ${r.name}`:""}</span>`:""}
          <h1 class="pers-detail-name">${e.name}</h1>
          ${e.role?`<p class="pers-detail-role">${e.role}</p>`:""}
          <div class="pers-detail-tags">
            ${e.faction?`<span class="pers-tag faction-${e.faction}">${h[e.faction]||e.faction}</span>`:""}
            <span class="pers-tag status-${l}">${n}</span>
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
      <a href="${r?`/personnages.html?sub=${r.slug}`:"/personnages.html"}" class="pers-back-btn">
        <i class="fas fa-arrow-left"></i> Retour
      </a>
    </div>`}function u(s="Une erreur est survenue."){d().innerHTML=`<div class="pers-error"><i class="fas fa-exclamation-circle"></i> ${s}</div>`}m();
