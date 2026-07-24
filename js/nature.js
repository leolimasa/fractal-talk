/* Nature slide — a grid of fractal photographs from the pictures/ folder. */
const Nature = {
  built: false,

  images: [
    "the-fractal-forest.jpg",
    "ayeyarwady-river-delta.jpeg",
    "romanesco-fractal-broccoli.jpeg",
    "nautilus-shell-fractal.jpg",
    "plant-growth-spiral.jpg",
    "snowflakes-fractal.jpg",
    "nasa-mountains-of-british-columbia-aerial.jpg",
    "lightning-fractal.jpg",
  ],

  build(grid) {
    if (this.built) return;
    this.built = true;
    this.images.forEach((file) => {
      const div = document.createElement("div");
      div.className = "nature-card";
      const img = document.createElement("img");
      img.src = "pictures/" + file;
      img.alt = file.replace(/\.[^.]+$/, "").replace(/-/g, " ");
      img.loading = "lazy";
      div.appendChild(img);
      grid.appendChild(div);
    });
  },

  reveal(grid) {
    const cards = grid.querySelectorAll(".nature-card");
    cards.forEach((c, i) => setTimeout(() => c.classList.add("visible"), 110 * i));
  },
};
