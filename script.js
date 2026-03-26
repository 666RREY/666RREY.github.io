(() => {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // "Кровь" на движении курсора (без аудио, чистая визуализация).
  if (!prefersReducedMotion) {
    const bloodLayer = document.createElement("div");
    bloodLayer.id = "blood-layer";
    document.body.appendChild(bloodLayer);

    let lastSpawn = 0;
    let lastX = -1;
    let lastY = -1;

    const spawnBlood = (x, y, count) => {
      for (let i = 0; i < count; i++) {
        const el = document.createElement("div");
        el.className = "blood-drop";

        const size = 3 + Math.random() * 6; // px
        const w = size;
        const h = size * (1.3 + Math.random() * 0.9);

        const dx = (Math.random() - 0.5) * 28; // px
        const dy = 110 + Math.random() * 90; // px
        const rot = -18 + Math.random() * 36;
        const dur = 0.55 + Math.random() * 0.75;

        el.style.setProperty("--w", `${w.toFixed(1)}px`);
        el.style.setProperty("--h", `${h.toFixed(1)}px`);
        el.style.setProperty("--dx", `${dx.toFixed(1)}px`);
        el.style.setProperty("--dy", `${dy.toFixed(1)}px`);
        el.style.setProperty("--rot", `${rot.toFixed(1)}deg`);
        el.style.setProperty("--dur", `${dur.toFixed(2)}s`);

        // Слегка разбросаем вокруг курсора.
        const ox = (Math.random() - 0.5) * 22;
        const oy = (Math.random() - 0.5) * 18;
        el.style.left = `${x + ox}px`;
        el.style.top = `${y + oy}px`;

        bloodLayer.appendChild(el);
        el.addEventListener("animationend", () => el.remove(), { once: true });
      }
    };

    document.addEventListener(
      "mousemove",
      (e) => {
        const now = performance.now();
        if (now - lastSpawn < 65) return;

        const x = e.clientX;
        const y = e.clientY;

        let count = 1;
        if (lastX >= 0) {
          const dist = Math.hypot(x - lastX, y - lastY);
          // Чем быстрее движение, тем больше капель.
          count = dist > 45 ? 3 : dist > 20 ? 2 : 1;
        }

        lastSpawn = now;
        lastX = x;
        lastY = y;

        spawnBlood(x, y, count);
      },
      { passive: true }
    );
  }

  const canvas = document.getElementById("viz");
  const ctx = canvas ? canvas.getContext("2d", { alpha: true }) : null;

  const DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));

  let w = 0;
  let h = 0;

  const state = {
    bars: 70,
    current: [],
    t0: performance.now(),
  };

  const resize = () => {
    if (!ctx) return;
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Init bars (idempotent-ish).
    if (state.current.length !== state.bars) {
      state.current = new Array(state.bars).fill(0);
    }
  };

  if (ctx) {
    window.addEventListener("resize", resize, { passive: true });
    resize();
  }

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const draw = () => {
    if (!ctx) return;
    const now = performance.now();
    const t = (now - state.t0) / 1000;

    // Trails: draw a transparent black rectangle, not full clear.
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(0, 0, w, h);

    // Subtle vignette.
    const grd = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.5, Math.max(w, h));
    grd.addColorStop(0, "rgba(255,255,255,0.06)");
    grd.addColorStop(0.5, "rgba(255,255,255,0.02)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Bars (рисуем только в самом низу, чтобы не спорило с текстом),
    // при этом стараемся использовать почти всю ширину экрана.
    const padX = Math.round(w * 0.01);
    const barAreaW = Math.max(200, w - padX * 2);
    const clipTop = Math.round(h * 0.84);
    const centerY = Math.round(h * 0.99);
    const maxBarH = Math.round(h * 0.13);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipTop, w, h - clipTop);
    ctx.clip();

    for (let i = 0; i < state.bars; i++) {
      const p = i / (state.bars - 1); // 0..1

      // "Faux spectrum": layered sines + noise, no audio required.
      const wave1 = Math.sin(t * 2.2 + p * 9.5);
      const wave2 = Math.sin(t * 5.1 + p * 18.2 + Math.sin(t * 0.8) * 0.8);
      const wave3 = Math.sin(t * 1.3 + p * 4.0 + Math.cos(t * 0.6) * 0.9);

      const noise = (Math.sin((t + p) * 37.0) + Math.sin((t + p) * 83.0)) * 0.02;

      const raw = (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2) * 0.5 + 0.5 + noise;
      const target = clamp01(raw) * (0.45 + 0.55 * Math.sin(t * 1.2) * 0.5 + 0.5);

      // Smooth spring-ish.
      state.current[i] = state.current[i] * 0.86 + target * 0.14;

      const barH = state.current[i] * maxBarH;
      const x = padX + (p * barAreaW);
      const barW = Math.max(2, Math.round(barAreaW / state.bars));

      // Grayscale alpha based on height.
      const alpha = 0.05 + state.current[i] * 0.22;
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;

      // Draw upward from the baseline.
      const y = centerY - barH;
      ctx.fillRect(Math.round(x - barW / 2), y, barW, barH);
    }

    // Waveform line (fake).
    const lineY = Math.round(h * 0.93);
    const lineAmp = Math.round(h * 0.02);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    for (let x = 0; x <= w; x += Math.max(2, Math.round(w / 180))) {
      const p = x / w;
      const v =
        Math.sin(t * 3.0 + p * 6.2) * 0.55 +
        Math.sin(t * 7.2 + p * 12.4) * 0.28 +
        Math.sin(t * 1.2 + p * 2.4) * 0.17;
      const y = lineY + v * lineAmp * (0.55 + 0.45 * Math.sin(t * 0.9 + p * 2.0));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(draw);
  };

  if (ctx) {
    // Start with a black frame to avoid white flash.
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, w, h);
    requestAnimationFrame(draw);
  }

  // Click avatar -> skull appears, laughs, then disappears.
  const avatar = document.querySelector(".avatar-cross");
  if (avatar) {
    let skullBusy = false;
    const skullSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 32 32'>
<path fill='#ffffff' d='M16 1.5c-6 0-10.5 4.8-10.5 11 0 4.2 2.2 7.5 5.4 9.4V26c0 1.1.9 2 2 2h1.1c.9 0 1.7-.6 1.9-1.5l.5-2.2h2l.5 2.2c.2.9 1 1.5 1.9 1.5H19c1.1 0 2-.9 2-2v-4.1c3.2-1.9 5.4-5.2 5.4-9.4 0-6.2-4.5-11-10.5-11z'/>
<circle cx='11.1' cy='13.2' r='2.2' fill='#000000'/>
<circle cx='20.9' cy='13.2' r='2.2' fill='#000000'/>
<path d='M16 16.1c-1.1 0-2 .9-2 2 0 1.4 1.1 2.6 2.5 2.6s2-1.2 2-2.6c0-1.1-.9-2-2-2z' fill='#000000'/>
<rect x='13' y='21' width='2' height='4' rx='1' fill='#000000'/>
<rect x='17' y='21' width='2' height='4' rx='1' fill='#000000'/>
</svg>`;
    const skullUrl = `data:image/svg+xml,${encodeURIComponent(skullSvg)}`;

    const triggerSkull = () => {
      if (skullBusy) return;
      const existing = document.getElementById("skull-pop");
      if (existing) existing.remove();

      skullBusy = true;

      const rect = avatar.getBoundingClientRect();
      const pop = document.createElement("div");
      pop.id = "skull-pop";
      pop.innerHTML = `<img class="skull-pop__img" src="${skullUrl}" alt="" /><div class="skull-pop__text">ха-ха</div>`;
      pop.style.left = `${rect.left + rect.width / 2}px`;
      pop.style.top = `${rect.top + rect.height / 2}px`;
      document.body.appendChild(pop);

      const removeAfterMs = prefersReducedMotion ? 900 : 1600;
      window.setTimeout(() => {
        const el = document.getElementById("skull-pop");
        if (el) el.remove();
        skullBusy = false;
      }, removeAfterMs);

      if (!prefersReducedMotion && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance("ха-ха");
          u.lang = "ru-RU";
          u.rate = 1.05;
          u.pitch = 1.5;
          u.volume = 0.9;
          window.speechSynthesis.speak(u);
        } catch {
          // Ignore speech failures (permissions / unsupported browsers).
        }
      }
    };

    avatar.addEventListener("click", triggerSkull);
    avatar.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        triggerSkull();
      }
    });
  }
})();

