/**
 * Circle crop modal — drag to reposition, scroll/pinch to zoom.
 * Returns a Promise<Blob> of the cropped circular image (JPEG).
 */
export function openCropModal(file) {
  return new Promise((resolve, reject) => {
    const CANVAS_SIZE = 320
    const RADIUS = 136
    const OUTPUT_SIZE = 300

    const overlay = document.createElement('div')
    overlay.className = 'crop-modal-overlay'
    overlay.innerHTML = `
      <div class="crop-modal">
        <div class="crop-modal-title"><i class="fas fa-crop-alt"></i> Recadrer l'avatar</div>
        <div class="crop-canvas-wrap">
          <canvas class="crop-canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
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
    `
    document.body.appendChild(overlay)

    const canvas = overlay.querySelector('.crop-canvas')
    const ctx = canvas.getContext('2d')
    const slider = overlay.querySelector('.crop-zoom-slider')

    const img = new Image()
    let scale = 1
    let minScale = 0.1
    let offsetX = 0
    let offsetY = 0
    let isDragging = false
    let dragStart = { x: 0, y: 0 }

    function draw() {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      ctx.fillStyle = '#080d18'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      ctx.drawImage(img,
        CANVAS_SIZE / 2 + offsetX - w / 2,
        CANVAS_SIZE / 2 + offsetY - h / 2,
        w, h
      )

      // Darken outside circle
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, RADIUS, 0, Math.PI * 2, true)
      ctx.fillStyle = 'rgba(5,9,17,0.68)'
      ctx.fill('evenodd')
      ctx.restore()

      // Circle border
      ctx.save()
      ctx.beginPath()
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, RADIUS, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(245,158,11,0.85)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }

    function fitScale() {
      const fill = Math.max(
        (RADIUS * 2) / img.naturalWidth,
        (RADIUS * 2) / img.naturalHeight
      )
      minScale = Math.min(
        CANVAS_SIZE / img.naturalWidth,
        CANVAS_SIZE / img.naturalHeight,
        fill * 0.5
      )
      scale = fill
      slider.min = String(minScale)
      slider.value = String(scale)
    }

    img.onload = () => { fitScale(); draw() }
    const reader = new FileReader()
    reader.onload = (e) => { img.src = e.target.result }
    reader.readAsDataURL(file)

    // ── Drag (mouse) ──────────────────────────────────────────
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true
      dragStart = { x: e.clientX - offsetX, y: e.clientY - offsetY }
      canvas.style.cursor = 'grabbing'
    })
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      offsetX = e.clientX - dragStart.x
      offsetY = e.clientY - dragStart.y
      draw()
    })
    window.addEventListener('mouseup', () => {
      isDragging = false
      canvas.style.cursor = 'grab'
    })

    // ── Drag (touch) ──────────────────────────────────────────
    let lastPinchDist = null
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (e.touches.length === 1) {
        isDragging = true
        lastPinchDist = null
        dragStart = { x: e.touches[0].clientX - offsetX, y: e.touches[0].clientY - offsetY }
      } else if (e.touches.length === 2) {
        isDragging = false
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
      }
    }, { passive: false })
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (e.touches.length === 1 && isDragging) {
        offsetX = e.touches[0].clientX - dragStart.x
        offsetY = e.touches[0].clientY - dragStart.y
        draw()
      } else if (e.touches.length === 2 && lastPinchDist) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        scale = Math.max(minScale, Math.min(5, scale * dist / lastPinchDist))
        lastPinchDist = dist
        slider.value = String(scale)
        draw()
      }
    }, { passive: false })
    canvas.addEventListener('touchend', () => { isDragging = false; lastPinchDist = null })

    // ── Wheel zoom ────────────────────────────────────────────
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      scale = Math.max(minScale, Math.min(5, scale * (1 - e.deltaY * 0.001)))
      slider.value = String(scale)
      draw()
    }, { passive: false })

    // ── Slider ────────────────────────────────────────────────
    slider.addEventListener('input', () => {
      scale = parseFloat(slider.value)
      draw()
    })

    // ── Confirm ───────────────────────────────────────────────
    overlay.querySelector('.crop-confirm-btn').addEventListener('click', () => {
      const out = document.createElement('canvas')
      out.width = OUTPUT_SIZE
      out.height = OUTPUT_SIZE
      const oc = out.getContext('2d')

      const srcX = img.naturalWidth / 2 - offsetX / scale - RADIUS / scale
      const srcY = img.naturalHeight / 2 - offsetY / scale - RADIUS / scale
      const srcW = (RADIUS * 2) / scale
      const srcH = (RADIUS * 2) / scale

      oc.save()
      oc.beginPath()
      oc.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2)
      oc.clip()
      oc.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      oc.restore()

      out.toBlob((blob) => {
        overlay.remove()
        resolve(blob)
      }, 'image/jpeg', 0.92)
    })

    // ── Cancel ────────────────────────────────────────────────
    overlay.querySelector('.crop-cancel-btn').addEventListener('click', () => {
      overlay.remove()
      reject(new Error('cancelled'))
    })
  })
}
