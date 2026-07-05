function w(A){return new Promise((m,I)=>{const c=document.createElement("div");c.className="crop-modal-overlay",c.innerHTML=`
      <div class="crop-modal">
        <div class="crop-modal-title"><i class="fas fa-crop-alt"></i> Recadrer l'avatar</div>
        <div class="crop-canvas-wrap">
          <canvas class="crop-canvas" width="320" height="320"></canvas>
        </div>
        <div class="crop-zoom-row">
          <i class="fas fa-search-minus"></i>
          <input type="range" class="crop-zoom-slider" min="0.01" max="5" step="0.01" value="1">
          <i class="fas fa-search-plus"></i>
        </div>
        <p class="crop-hint">Glissez pour repositionner &middot; Molette / pincement pour zoomer</p>
        <div class="crop-actions">
          <button class="btn-save-primary crop-confirm-btn"><i class="fas fa-check"></i> Confirmer</button>
          <button class="btn-chars-back crop-cancel-btn">Annuler</button>
        </div>
      </div>
    `,document.body.appendChild(c);const o=c.querySelector(".crop-canvas"),e=o.getContext("2d"),l=c.querySelector(".crop-zoom-slider"),n=new Image;let a=1,v=.1,i=0,d=0,r=!1,u={x:0,y:0};function S(){e.clearRect(0,0,320,320),e.fillStyle="#080d18",e.fillRect(0,0,320,320);const t=n.naturalWidth*a,s=n.naturalHeight*a;e.drawImage(n,320/2+i-t/2,320/2+d-s/2,t,s),e.save(),e.beginPath(),e.rect(0,0,320,320),e.arc(320/2,320/2,136,0,Math.PI*2,!0),e.fillStyle="rgba(5,9,17,0.68)",e.fill("evenodd"),e.restore(),e.save(),e.beginPath(),e.arc(320/2,320/2,136,0,Math.PI*2),e.strokeStyle="rgba(245,158,11,0.85)",e.lineWidth=2,e.stroke(),e.restore()}function f(){const t=Math.max(272/n.naturalWidth,272/n.naturalHeight);v=Math.min(320/n.naturalWidth,320/n.naturalHeight,t*.5),a=t,l.min=String(v),l.value=String(a)}n.onload=()=>{f(),S()};const p=new FileReader;p.onload=t=>{n.src=t.target.result},p.readAsDataURL(A),o.addEventListener("mousedown",t=>{r=!0,u={x:t.clientX-i,y:t.clientY-d},o.style.cursor="grabbing"}),window.addEventListener("mousemove",t=>{r&&(i=t.clientX-u.x,d=t.clientY-u.y,S())}),window.addEventListener("mouseup",()=>{r=!1,o.style.cursor="grab"});let h=null;o.addEventListener("touchstart",t=>{t.preventDefault(),t.touches.length===1?(r=!0,h=null,u={x:t.touches[0].clientX-i,y:t.touches[0].clientY-d}):t.touches.length===2&&(r=!1,h=Math.hypot(t.touches[0].clientX-t.touches[1].clientX,t.touches[0].clientY-t.touches[1].clientY))},{passive:!1}),o.addEventListener("touchmove",t=>{if(t.preventDefault(),t.touches.length===1&&r)i=t.touches[0].clientX-u.x,d=t.touches[0].clientY-u.y,S();else if(t.touches.length===2&&h){const s=Math.hypot(t.touches[0].clientX-t.touches[1].clientX,t.touches[0].clientY-t.touches[1].clientY);a=Math.max(v,Math.min(5,a*s/h)),h=s,l.value=String(a),S()}},{passive:!1}),o.addEventListener("touchend",()=>{r=!1,h=null}),o.addEventListener("wheel",t=>{t.preventDefault(),a=Math.max(v,Math.min(5,a*(1-t.deltaY*.001))),l.value=String(a),S()},{passive:!1}),l.addEventListener("input",()=>{a=parseFloat(l.value),S()}),c.querySelector(".crop-confirm-btn").addEventListener("click",()=>{const t=document.createElement("canvas");t.width=300,t.height=300;const s=t.getContext("2d"),E=n.naturalWidth/2-i/a-136/a,g=n.naturalHeight/2-d/a-136/a,U=136*2/a,Z=136*2/a;s.save(),s.beginPath(),s.arc(300/2,300/2,300/2,0,Math.PI*2),s.clip(),s.drawImage(n,E,g,U,Z,0,0,300,300),s.restore(),t.toBlob(_=>{c.remove(),m(_)},"image/jpeg",.92)}),c.querySelector(".crop-cancel-btn").addEventListener("click",()=>{c.remove(),I(new Error("cancelled"))})})}export{w as o};
