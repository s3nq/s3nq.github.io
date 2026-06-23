const cacheKey = "2026-06-23-3";
const ambientVideos = [...document.querySelectorAll(".ambient-video")];
const galleryColumns = [
  [
    { src: "media/IMG_8038 1.png", ratio: "gallery-wide", alt: "Фрагмент городского визуального шума" },
    { src: "media/IMG_1920 1.png", ratio: "gallery-tall", alt: "Городская поверхность с визуальным шумом" },
  ],
  [
    { src: "media/IMG_1922 2.png", ratio: "gallery-wide", alt: "Городской слой с наклейками и следами" },
    { src: "media/IMG_1918 1.png", ratio: "gallery-tall", alt: "Фрагмент плаката и городских следов" },
  ],
  [
    { src: "media/IMG_1927 1.png", ratio: "gallery-wide", alt: "Фактура объявления и повреждений" },
    { src: "media/IMG_1933 1.png", ratio: "gallery-tall", alt: "Слой визуального шума на городской поверхности" },
  ],
  [
    { src: "media/IMG_1939 1.png", ratio: "gallery-wide", alt: "Наложение линий, текста и фактур" },
    { src: "media/IMG_1912 2.png", ratio: "gallery-tall", alt: "Городская стена с текстовыми слоями" },
  ],
];

function mediaUrl(path) {
  return `${path}${path.includes("?") ? "&" : "?"}v=${cacheKey}`;
}

function loadAmbientVideo(video) {
  if (video.dataset.loaded === "true") return;
  const frame = video.closest(".media-block");
  video.dataset.loaded = "true";
  video.src = mediaUrl(video.dataset.src);
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.controls = false;
  video.load();

  const markLoaded = () => frame?.classList.add("is-loaded");
  video.addEventListener("loadeddata", markLoaded, { once: true });
  video.addEventListener("canplay", markLoaded, { once: true });
}

if ("IntersectionObserver" in window) {
  const ambientObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          loadAmbientVideo(video);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { rootMargin: "320px 0px", threshold: 0.08 },
  );

  ambientVideos.forEach((video) => ambientObserver.observe(video));
} else {
  ambientVideos.forEach((video) => {
    loadAmbientVideo(video);
    video.play().catch(() => {});
  });
}

function setupReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
  );

  items.forEach((item) => observer.observe(item));
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function setupGallery() {
  const shell = document.querySelector("#galleryShell");
  const viewport = document.querySelector("#galleryViewport");
  const track = document.querySelector("#galleryTrack");
  const left = document.querySelector("#galleryLeft");
  const right = document.querySelector("#galleryRight");
  const section = document.querySelector(".gallery-section");
  const dropzone = document.querySelector("#uploadDropzone");
  const input = document.querySelector("#photoInput");
  if (!shell || !viewport || !track || !left || !right || !section || !dropzone || !input) return;

  const uploadedPhotoKeys = new Set();
  const photoNames = new Set(
    galleryColumns.flat().map((photo) => normalizeName(photo.src.split("/").at(-1) || photo.src)),
  );

  const updateEdges = () => {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const hasOverflow = maxScroll > 4;
    const canLeft = viewport.scrollLeft > 4;
    const canRight = hasOverflow ? viewport.scrollLeft < maxScroll - 4 : true;
    shell.classList.toggle("can-scroll-left", canLeft);
    shell.classList.toggle("can-scroll-right", canRight);
    right.classList.toggle("is-static", !hasOverflow);
    left.disabled = !canLeft;
    right.disabled = !canRight || !hasOverflow;
  };

  const scrollGallery = (direction) => {
    viewport.scrollBy({ left: direction * viewport.clientWidth * 0.82, behavior: "smooth" });
  };

  left.addEventListener("click", () => scrollGallery(-1));
  right.addEventListener("click", () => scrollGallery(1));
  viewport.addEventListener("scroll", updateEdges, { passive: true });
  window.addEventListener("resize", updateEdges);

  const createCard = (src, slotClass, alt) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    button.type = "button";
    button.className = `gallery-card ${slotClass}`;
    button.setAttribute("aria-label", "Открыть фотографию");
    image.src = src;
    image.alt = alt;
    image.loading = "lazy";
    image.decoding = "async";
    button.append(image);
    return button;
  };

  galleryColumns.forEach((photos) => {
    const column = document.createElement("div");
    column.className = "gallery-column";
    photos.forEach((photo) => {
      column.append(createCard(mediaUrl(photo.src), photo.ratio, photo.alt));
    });
    track.append(column);
  });

  const addImage = (file) => {
    const nameKey = normalizeName(file.name);
    const fileKey = `${nameKey}:${file.size}`;
    if (uploadedPhotoKeys.has(fileKey) || photoNames.has(nameKey)) return;
    uploadedPhotoKeys.add(fileKey);
    photoNames.add(nameKey);

    const columns = [...track.querySelectorAll(".gallery-column")];
    let column = columns.at(-1);
    if (!column || column.children.length >= 2) {
      column = document.createElement("div");
      column.className = "gallery-column";
      track.append(column);
    }

    const slotClass = column.children.length === 0 ? "gallery-wide" : "gallery-tall";
    column.append(createCard(URL.createObjectURL(file), slotClass, file.name));
  };

  const addFiles = (files) => {
    [...files].filter((file) => file.type.startsWith("image/")).forEach(addImage);
    window.requestAnimationFrame(() => {
      updateEdges();
      viewport.scrollTo({ left: viewport.scrollWidth, behavior: "smooth" });
    });
  };

  input.addEventListener("change", () => {
    addFiles(input.files);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    section.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      section.classList.add("is-dragging");
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    section.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (eventName === "dragleave" && section.contains(event.relatedTarget)) return;
      section.classList.remove("is-dragging");
      dropzone.classList.remove("is-dragging");
    });
  });

  section.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

  updateEdges();
}

function setupLightbox() {
  const dialog = document.querySelector("#lightbox");
  const image = document.querySelector("#lightboxImage");
  const close = dialog?.querySelector(".lightbox-close");
  if (!dialog || !image || !close) return;

  let zoom = 1;
  const setZoom = (value) => {
    zoom = Math.min(3, Math.max(0.5, value));
    image.style.setProperty("--zoom", zoom);
  };

  document.addEventListener("click", (event) => {
    const card = event.target.closest(".gallery-card");
    if (!card) return;
    const source = card.querySelector("img");
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    setZoom(1);
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  });

  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.zoom === "in") setZoom(zoom + 0.25);
      if (button.dataset.zoom === "out") setZoom(zoom - 0.25);
      if (button.dataset.zoom === "reset") setZoom(1);
    });
  });
  image.addEventListener("dblclick", () => setZoom(zoom === 1 ? 2 : 1));
}

function setupTeaser() {
  const frame = document.querySelector(".teaser-frame");
  const video = document.querySelector(".teaser-video");
  const button = document.querySelector(".teaser-play");
  if (!frame || !video || !button) return;

  video.autoplay = false;
  video.loop = false;
  video.controls = false;
  video.removeAttribute("controls");
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.pause();

  let isStarting = false;
  const playTeaser = async () => {
    if (!video.paused || isStarting) return;
    isStarting = true;
    video.muted = false;
    await video.play().catch(async () => {
      video.muted = true;
      await video.play().catch(() => {});
    });
    isStarting = false;
  };

  frame.addEventListener("click", playTeaser);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    playTeaser();
  });
  video.addEventListener("play", () => frame.classList.add("is-playing"));
  video.addEventListener("pause", () => frame.classList.remove("is-playing"));
  video.addEventListener("ended", () => frame.classList.remove("is-playing"));
}

setupReveal();
setupGallery();
setupLightbox();
setupTeaser();
