import{b,a as c}from"./auth-Bx0_tURC.js";import{i as y}from"./header-AYJnNoA1.js";y();let n=null,l=null,r=null,v=[];(async()=>{if(n=await b(),!n)return;const{data:a}=await c.from("profiles").select("*").eq("id",n.id).maybeSingle();l=a,l!=null&&l.faction&&(document.body.dataset.faction=l.faction),await u(),q(),E();const t=new URLSearchParams(window.location.search).get("with");t&&o(t)})();async function u(){const{data:a}=await c.from("messages").select(`
      id, content, created_at, read, sender_id, receiver_id,
      sender:sender_id(id, username, avatar_url),
      receiver:receiver_id(id, username, avatar_url)
    `).or(`sender_id.eq.${n.id},receiver_id.eq.${n.id}`).order("created_at",{ascending:!1});if(!a)return;const e=new Map;for(const t of a){const s=t.sender_id===n.id?t.receiver:t.sender;s&&(e.has(s.id)||e.set(s.id,{partner:s,lastMsg:t,unread:0}),!t.read&&t.receiver_id===n.id&&e.get(s.id).unread++)}v=Array.from(e.values()),h()}function h(){const a=document.getElementById("conv-list");if(!v.length){a.innerHTML=`<div style="padding:20px; color:#475569; font-family:'Inter',sans-serif; font-size:13px; text-align:center;">Aucune conversation.<br>Recherchez un utilisateur pour commencer.</div>`;return}a.innerHTML=v.map(({partner:e,lastMsg:t,unread:s})=>{const i=e.avatar_url?`<img src="${e.avatar_url}" alt="${e.username}">`:e.username[0].toUpperCase(),d=e.id===r?"active":"",m=t.content.length>32?t.content.slice(0,32)+"…":t.content,p=s>0?`<span class="conv-unread">${s}</span>`:"";return`<div class="conv-item ${d}" data-partner-id="${e.id}">
      <div class="conv-avatar">${i}</div>
      <div class="conv-info">
        <div class="conv-name">${e.username}</div>
        <div class="conv-last">${t.sender_id===n.id?"Vous : ":""}${m}</div>
      </div>
      ${p}
    </div>`}).join(""),a.querySelectorAll(".conv-item").forEach(e=>{e.addEventListener("click",()=>o(e.dataset.partnerId))})}async function o(a){r=a,await c.from("messages").update({read:!0}).eq("receiver_id",n.id).eq("sender_id",a);const{data:e}=await c.from("profiles").select("*").eq("id",a).maybeSingle();if(!e)return;const{data:t}=await c.from("messages").select("*").or(`and(sender_id.eq.${n.id},receiver_id.eq.${a}),and(sender_id.eq.${a},receiver_id.eq.${n.id})`).order("created_at",{ascending:!0}),s=e.avatar_url?`<img src="${e.avatar_url}" alt="${e.username}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`:`<div style="width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.15);border:2px solid rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center;font-family:'Pirata One',cursive;font-size:16px;color:#F59E0B;">${e.username[0].toUpperCase()}</div>`;document.getElementById("messages-main").innerHTML=`
    <div class="messages-main-header">
      ${s}
      <span class="messages-main-name">${e.username}</span>
    </div>
    <div class="messages-thread" id="messages-thread"></div>
    <div class="messages-input-area">
      <textarea class="messages-textarea" id="msg-input" placeholder="Écrivez votre message…" rows="1"></textarea>
      <button class="messages-send-btn" id="send-btn"><i class="fas fa-paper-plane"></i></button>
    </div>
  `,w(t||[]),document.getElementById("send-btn").addEventListener("click",g),document.getElementById("msg-input").addEventListener("keydown",i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),g())}),await u()}function w(a){const e=document.getElementById("messages-thread");e&&(e.innerHTML=a.map(t=>{const s=t.sender_id===n.id,i=new Date(t.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),d=t.updated_at&&t.updated_at!==t.created_at;return`<div class="msg-bubble-wrap ${s?"mine":"theirs"}" data-msg-id="${t.id}">
      <div class="msg-bubble">${f(t.content)}</div>
      <div class="msg-time">${i}${d?" · modifié":""}</div>
      ${s?`<div class="msg-user-actions">
        <button class="btn-msg-ua btn-msg-ua-edit" data-id="${t.id}" title="Modifier"><i class="fas fa-pencil-alt"></i></button>
        <button class="btn-msg-ua btn-msg-ua-delete" data-id="${t.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
      </div>`:""}
    </div>`}).join(""),e.querySelectorAll(".btn-msg-ua-edit").forEach(t=>{t.addEventListener("click",()=>_(t.dataset.id))}),e.querySelectorAll(".btn-msg-ua-delete").forEach(t=>{t.addEventListener("click",()=>$(t.dataset.id))}),e.scrollTop=e.scrollHeight)}function _(a){const e=document.querySelector(`.msg-bubble-wrap[data-msg-id="${a}"]`);if(!e)return;const t=e.querySelector(".msg-bubble"),s=t.textContent;t.innerHTML=`
    <div class="msg-inline-edit">
      <textarea class="msg-edit-textarea">${f(s)}</textarea>
      <div class="msg-inline-edit-actions">
        <button class="btn-msg-edit-save" data-id="${a}">Enregistrer</button>
        <button class="btn-msg-edit-cancel">Annuler</button>
      </div>
    </div>
  `;const i=t.querySelector(".msg-edit-textarea");i.focus(),i.setSelectionRange(i.value.length,i.value.length),t.querySelector(".btn-msg-edit-save").addEventListener("click",async()=>{const d=i.value.trim();if(!d)return;const{error:m}=await c.from("messages").update({content:d,updated_at:new Date().toISOString()}).eq("id",a).eq("sender_id",n.id);!m&&r?await o(r):m&&(t.textContent=s)}),t.querySelector(".btn-msg-edit-cancel").addEventListener("click",()=>{r&&o(r)})}function $(a){const e=document.querySelector(`.msg-bubble-wrap[data-msg-id="${a}"]`);if(!e)return;const t=e.querySelector(".msg-user-actions");t.innerHTML=`
    <span class="msg-delete-confirm">Supprimer ?</span>
    <button class="btn-msg-ua btn-msg-delete-yes" data-id="${a}">Oui</button>
    <button class="btn-msg-ua btn-msg-delete-no">Non</button>
  `,t.querySelector(".btn-msg-delete-yes").addEventListener("click",async()=>{await c.from("messages").delete().eq("id",a).eq("sender_id",n.id),await u(),r&&await o(r)}),t.querySelector(".btn-msg-delete-no").addEventListener("click",()=>{r&&o(r)})}async function g(){const a=document.getElementById("msg-input"),e=a==null?void 0:a.value.trim();if(!e||!r)return;a.value="";const{error:t}=await c.from("messages").insert({sender_id:n.id,receiver_id:r,content:e});t||(await u(),await o(r))}function q(){const a=document.getElementById("user-search"),e=document.getElementById("search-results");let t=null;a.addEventListener("input",()=>{const s=a.value.trim();if(clearTimeout(t),s.length<2){e.style.display="none",e.innerHTML="";return}t=setTimeout(async()=>{const{data:i}=await c.from("profiles").select("id, username, avatar_url").ilike("username",`%${s}%`).neq("id",n.id).limit(6);if(!i||!i.length){e.style.display="none";return}e.innerHTML=i.map(d=>`<div class="messages-search-result-item" data-id="${d.id}">${d.username}</div>`).join(""),e.style.display="block",e.querySelectorAll(".messages-search-result-item").forEach(d=>{d.addEventListener("click",()=>{a.value="",e.style.display="none",o(d.dataset.id)})})},300)}),document.addEventListener("click",s=>{!s.target.closest("#user-search")&&!s.target.closest("#search-results")&&(e.style.display="none")})}function E(){c.channel("messages-realtime").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},async a=>{const e=a.new;e.receiver_id!==n.id&&e.sender_id!==n.id||(await u(),r&&(e.sender_id===r||e.receiver_id===r)&&await o(r))}).subscribe()}function f(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
