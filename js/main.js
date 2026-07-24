/* Controller: wires Reveal.js navigation to the fractal render modules. */
(function () {
  const $ = (id) => document.getElementById(id);

  // Instantiate modules (each binds its own gated input listeners).
  const sier = new Sierpinski(
    $("c-sierpinski"),
    $("c-sierpinski-lines"),
    $("ov-sierpinski")
  );
  const mand = new Mandelbrot($("c-mandelbrot"), $("ov-mandelbrot"));
  const sq = new Square($("c-square"), [$("sq-perimeter"), $("sq-area")]);
  const barn = new Barnsley(
    $("c-barnsley"),
    $("barnsley-panel"),
    $("barnsley-sliders"),
    $("barnsley-reset"),
    $("ov-barnsley")
  );

  const MAP = {
    sierpinski: { mod: sier, canvas: $("c-sierpinski") },
    mandelbrot: { mod: mand, canvas: $("c-mandelbrot"), overlay: $("ov-mandelbrot") },
    square: { mod: sq, canvas: $("c-square") },
    barnsley: { mod: barn, canvas: $("c-barnsley") },
  };

  const allOverlays = ["ov-sierpinski", "ov-mandelbrot", "ov-barnsley"].map($);
  const squareLines = [$("sq-perimeter"), $("sq-area")];

  const FADE_MS = 600; // must match the canvas opacity transition in CSS

  let currentKind = "none";
  let zTop = 1; // ever-increasing stacking order so the incoming slide is on top

  // A slide's canvas layers (the Sierpiński slide has a second line overlay).
  function canvasesFor(kind) {
    if (kind === "sierpinski") return [$("c-sierpinski"), $("c-sierpinski-lines")];
    const e = MAP[kind];
    return e ? [e.canvas] : [];
  }

  // Fully retire a slide: stop its module and clear its canvas layers.
  function retire(kind) {
    const e = MAP[kind];
    if (e) e.mod.stop();
    canvasesFor(kind).forEach((c) => {
      c.classList.remove("active", "interactive");
      c.style.opacity = "";
      c.style.zIndex = "";
    });
  }

  function activate(section) {
    const kind = section.getAttribute("data-fractal") || "none";
    const prevKind = currentKind;
    currentKind = kind;

    // Overlays/hint from the previous slide fade out immediately.
    allOverlays.forEach(FT.hide);
    squareLines.forEach(FT.hide);
    FT.hide($("hint"));

    const hintText = section.getAttribute("data-hint");
    if (hintText) {
      $("hint").textContent = hintText;
      FT.show($("hint"));
    }

    if (kind === "none" && section.classList.contains("nature-slide")) {
      Nature.build($("nature-grid"));
      Nature.reveal($("nature-grid"));
    }

    // --- Fade the incoming fractal canvas in ON TOP of the outgoing one. ---
    if (kind !== "none") {
      const entry = MAP[kind];
      const layers = canvasesFor(kind);
      zTop += 1;
      layers.forEach((c) => (c.style.zIndex = String(zTop)));
      entry.canvas.classList.add("active", "interactive");
      entry.canvas.style.opacity = "0";
      // Two frames: render at opacity 0, then transition to 1 so the old
      // slide stays visible underneath until the new one is fully faded in.
      requestAnimationFrame(() => {
        entry.mod.start();
        requestAnimationFrame(() => {
          entry.canvas.style.opacity = "1";
        });
        if (entry.overlay) setTimeout(() => FT.show(entry.overlay), FADE_MS * 0.6);
      });
    }

    // --- Retire the previous slide once the cross-fade has completed. ---
    if (prevKind !== "none") {
      if (kind === "none") {
        // No incoming canvas to cover it — fade the old one out, then hide.
        canvasesFor(prevKind).forEach((c) => (c.style.opacity = "0"));
      }
      setTimeout(() => {
        // Skip if that slide became current again during a quick nav.
        if (prevKind !== currentKind) retire(prevKind);
      }, FADE_MS + 60);
    }
  }

  function onResize() {
    const entry = MAP[currentKind];
    if (!entry) return;
    switch (currentKind) {
      case "mandelbrot":
        entry.mod.render();
        break;
      case "square":
        entry.mod.render();
        break;
      case "sierpinski":
        entry.mod.resize();
        break;
      case "barnsley":
        entry.mod._fitCamera();
        entry.mod._restart();
        break;
    }
  }
  let rzTimer;
  window.addEventListener("resize", () => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(onResize, 150);
  });

  // Space toggles the Sierpiński auto-run (Reveal's space nav is disabled).
  document.addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.key === " ") && currentKind === "sierpinski") {
      e.preventDefault();
      sier.toggleAuto();
    }
  });

  Reveal.initialize({
    controls: false,
    progress: true,
    hash: false,
    transition: "fade",
    transitionSpeed: "slow",
    keyboard: {
      32: null, // space — handled by the Sierpiński slide
      13: "next", // enter -> next slide
    },
  });

  Reveal.on("ready", (e) => activate(e.currentSlide));
  Reveal.on("slidechanged", (e) => activate(e.currentSlide));
})();
