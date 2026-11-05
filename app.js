(() => {
  "use strict";

  document.documentElement.classList.remove("no-js");

  const root = document.documentElement;
  const body = document.body;
  const canvas = document.querySelector("#flow");
  const context = canvas.getContext("2d");
  const cards = [...document.querySelectorAll(".cloud-card")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = { x: 0.7, y: 0.3 };
  const targetPointer = { x: 0.7, y: 0.3 };

  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;
  let lastFrame = performance.now();
  let motes = [];
  let ripples = [];

  const palette = [
    [35, 145, 121],
    [75, 119, 199],
    [124, 91, 181],
    [186, 102, 77]
  ];

  const rgba = (color, alpha) =>
    `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = width < 700 ? 22 : 42;
    motes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.55 + Math.random() * 1.5,
      alpha: 0.08 + Math.random() * 0.17,
      speedX: -0.05 + Math.random() * 0.1,
      speedY: -0.045 - Math.random() * 0.075,
      phase: Math.random() * Math.PI * 2,
      pace: 0.0025 + Math.random() * 0.006,
      depth: 0.35 + Math.random() * 0.8
    }));
  };

  const drawMotes = () => {
    const px = pointer.x * width;
    const py = pointer.y * height;

    for (const mote of motes) {
      mote.phase += mote.pace;
      mote.x += mote.speedX + Math.sin(mote.phase) * 0.018;
      mote.y += mote.speedY + Math.cos(mote.phase * 0.7) * 0.012;

      const dx = mote.x - px;
      const dy = mote.y - py;
      const distance = Math.hypot(dx, dy);
      const pull = Math.max(0, 1 - distance / 260) * mote.depth;
      mote.x += dx * pull * 0.0012;
      mote.y += dy * pull * 0.0012;

      if (mote.y < -20) {
        mote.y = height + 20;
        mote.x = Math.random() * width;
      }
      if (mote.x < -20) mote.x = width + 20;
      if (mote.x > width + 20) mote.x = -20;

      context.beginPath();
      context.fillStyle = `rgba(46, 116, 103, ${mote.alpha * 0.76})`;
      context.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
      context.fill();
    }
  };

  const drawRipples = (delta) => {
    for (let index = ripples.length - 1; index >= 0; index -= 1) {
      const ripple = ripples[index];
      ripple.radius += delta * 2.1;
      ripple.life -= delta * 0.018;
      if (ripple.life <= 0) {
        ripples.splice(index, 1);
        continue;
      }
      context.beginPath();
      context.strokeStyle = rgba(ripple.color, ripple.life * 0.17);
      context.lineWidth = 0.9;
      context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      context.stroke();
    }
  };

  const animate = (now) => {
    if (document.hidden) {
      frame = 0;
      return;
    }

    const delta = Math.min(2.2, (now - lastFrame) / 16.67);
    lastFrame = now;
    context.clearRect(0, 0, width, height);
    drawMotes();
    drawRipples(delta);
    frame = requestAnimationFrame(animate);
  };

  let pointerFrame = 0;
  const animatePointer = () => {
    pointer.x += (targetPointer.x - pointer.x) * 0.11;
    pointer.y += (targetPointer.y - pointer.y) * 0.11;
    root.style.setProperty("--pointer-x", pointer.x.toFixed(4));
    root.style.setProperty("--pointer-y", pointer.y.toFixed(4));
    if (
      Math.abs(targetPointer.x - pointer.x) > 0.0005 ||
      Math.abs(targetPointer.y - pointer.y) > 0.0005
    ) {
      pointerFrame = requestAnimationFrame(animatePointer);
    } else {
      pointerFrame = 0;
    }
  };

  const movePointer = (event) => {
    targetPointer.x = event.clientX / Math.max(width, 1);
    targetPointer.y = event.clientY / Math.max(height, 1);
    body.classList.add("has-pointer");
    if (!pointerFrame) pointerFrame = requestAnimationFrame(animatePointer);

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) continue;
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      if (event.pointerType !== "touch" && !reducedMotion.matches) {
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--rx", `${(-y * 2.8).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${(x * 3.2).toFixed(2)}deg`);
      }
    }
  };

  const leavePointer = () => {
    body.classList.remove("has-pointer");
    for (const card of cards) {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    }
  };

  const addRipple = (event) => {
    if (reducedMotion.matches) return;
    ripples.push({
      x: event.clientX,
      y: event.clientY,
      radius: 4,
      life: 1,
      color: palette[Math.floor(Math.random() * palette.length)]
    });
  };

  if (context) {
    resize();
    frame = requestAnimationFrame(animate);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("pointerdown", addRipple, { passive: true });
    document.documentElement.addEventListener("mouseleave", leavePointer);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !frame) {
        lastFrame = performance.now();
        frame = requestAnimationFrame(animate);
      }
    });
  }

  for (const card of cards) {
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
      observer.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
})();
