(() => {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ========== КАПЛИ НА ДВИЖЕНИИ КУРСОРА ==========
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

        const size = 3 + Math.random() * 7;
        el.style.setProperty("--w", `${size}px`);
        el.style.setProperty("--h", `${size * (1.3 + Math.random() * 0.8)}px`);
        el.style.setProperty("--dx", `${(Math.random() - 0.5) * 30}px`);
        el.style.setProperty("--dy", `${80 + Math.random() * 100}px`);
        el.style.setProperty("--rot", `${-18 + Math.random() * 36}deg`);
        el.style.setProperty("--dur", `${0.55 + Math.random() * 0.7}s`);

        el.style.left = `${x + (Math.random() - 0.5) * 22}px`;
        el.style.top = `${y + (Math.random() - 0.5) * 18}px`;

        bloodLayer.appendChild(el);
        el.addEventListener("animationend", () => el.remove(), { once: true });
      }
    };

    document.addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (now - lastSpawn < 60) return;

      const x = e.clientX;
      const y = e.clientY;
      let count = 1;

      if (lastX >= 0) {
        const dist = Math.hypot(x - lastX, y - lastY);
        if (dist > 45) count = 3;
        else if (dist > 20) count = 2;
      }

      lastSpawn = now;
      lastX = x;
      lastY = y;
      spawnBlood(x, y, count);
    }, { passive: true });
  }

  // ========== CANVAS ВИЗУАЛИЗАТОР ==========
  const canvas = document.getElementById("viz");
  const ctx = canvas ? canvas.getContext("2d") : null;

  let w = 0, h = 0;
  const bars = 72;
  let current = [];
  let t0 = performance.now();

  const resize = () => {
    if (!ctx) return;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    if (current.length !== bars) current = new Array(bars).fill(0);
  };

  if (ctx) {
    window.addEventListener("resize", resize);
    resize();
  }

  const draw = () => {
    if (!ctx) return;
    const t = (performance.now() - t0) / 1000;

    ctx.fillStyle = "rgba(20, 20, 28, 0.2)";
    ctx.fillRect(0, 0, w, h);

    const padX = w * 0.02;
    const barWidth = (w - padX * 2) / bars;
    const baseY = h * 0.92;

    for (let i = 0; i < bars; i++) {
      const p = i / bars;
      const wave1 = Math.sin(t * 1.9 + p * 10) * 0.5;
      const wave2 = Math.sin(t * 4.1 + p * 19) * 0.3;
      const wave3 = Math.sin(t * 0.9 + p * 3.7) * 0.2;
      let val = (wave1 + wave2 + wave3 + 1) / 2;
      val = Math.pow(val, 1.2) * (0.5 + 0.4 * Math.sin(t * 1.2));

      current[i] = current[i] * 0.85 + val * 0.15;
      const barHeight = current[i] * (h * 0.11);
      const x = padX + i * barWidth;
      const alpha = 0.08 + current[i] * 0.18;

      ctx.fillStyle = `rgba(100, 100, 130, ${alpha})`;
      ctx.fillRect(x, baseY - barHeight, Math.max(2, barWidth - 1), barHeight);

      ctx.fillStyle = `rgba(200, 200, 230, ${alpha * 0.5})`;
      ctx.fillRect(x, baseY - barHeight, Math.max(2, barWidth - 1), barHeight * 0.3);
    }

    requestAnimationFrame(draw);
  };

  if (ctx) {
    ctx.fillStyle = "#14141c";
    ctx.fillRect(0, 0, w, h);
    draw();
  }

  // ========== ПОП-АП ЧЕРЕПА ==========
  const avatar = document.querySelector(".avatar-cross");
  if (avatar) {
    let skullBusy = false;

    const skullSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 36 36'>
      <g stroke='%237a7a8a' stroke-width='1.6'>
        <line x1='4' y1='30' x2='32' y2='6'/>
        <circle cx='3.5' cy='30.5' r='3' fill='%237a7a8a'/>
        <circle cx='32.5' cy='5.5' r='3' fill='%237a7a8a'/>
        <line x1='32' y1='30' x2='4' y2='6'/>
        <circle cx='32.5' cy='30.5' r='3' fill='%237a7a8a'/>
        <circle cx='3.5' cy='5.5' r='3' fill='%237a7a8a'/>
      </g>
      <ellipse cx='18' cy='14.5' rx='7' ry='7.8' fill='%237a7a8a'/>
      <rect x='13' y='19.5' width='10' height='5.5' rx='2' fill='%237a7a8a'/>
      <circle cx='15' cy='13.5' r='2.1' fill='%2314141c'/>
      <circle cx='21' cy='13.5' r='2.1' fill='%2314141c'/>
      <path d='M17 17h2v1.5h-2z' fill='%2314141c'/>
      <rect x='14.5' y='20' width='1.5' height='3.5' fill='%2314141c'/>
      <rect x='17.2' y='20' width='1.5' height='3.5' fill='%2314141c'/>
      <rect x='20' y='20' width='1.5' height='3.5' fill='%2314141c'/>
    </svg>`;

    const triggerSkull = () => {
      if (skullBusy) return;
      skullBusy = true;

      const pop = document.createElement("div");
      pop.id = "skull-pop";
      pop.innerHTML = `
        <img class="skull-pop__img" src="data:image/svg+xml,${encodeURIComponent(skullSvg)}" alt="" />
        <div class="skull-pop__text">ха-ха</div>
      `;

      const rect = avatar.getBoundingClientRect();
      pop.style.left = `${rect.left + rect.width / 2}px`;
      pop.style.top = `${rect.top + rect.height / 2}px`;
      document.body.appendChild(pop);

      const removeDelay = prefersReducedMotion ? 900 : 1500;
      setTimeout(() => {
        const el = document.getElementById("skull-pop");
        if (el) el.remove();
        skullBusy = false;
      }, removeDelay);

      if (!prefersReducedMotion && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance("ха-ха");
          utterance.lang = "ru-RU";
          utterance.rate = 1.1;
          utterance.pitch = 1.5;
          utterance.volume = 0.85;
          window.speechSynthesis.speak(utterance);
        } catch (e) {}
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