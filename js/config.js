// All content and image paths that are expected to change live here.
export const siteConfig = {
  imagePaths: {
    image1: "img1.jpg",
    image2: "img2.jpg",
    image3: "img3.jpg",
    image4: "img4.jpg",
    image5: "img5.jpg",
  },
  home: {
    label: "@NNEKAEGARA",
    dates: "2022-2025",
    caption: "A Kenyan filmmaker and copywriter telling stories that move people.",
    year: "2025",
    rotatingPairs: [
      ["NNEKA EGARA", "PORTFOLIO"],
      ["KENYAN FILMMAKER", "& COPYWRITER"],
      ["VISUAL", "STORYTELLER"],
      ["DIRECTOR", "& PHOTOGRAPHER"],
    ],
  },
  navigation: {
    brand: "NNEKA EGARA",
    bottomLine: "FILMS, WORDS & STILL IMAGES FROM NAIROBI.",
    location: "NAIROBI, KE",
    previewDomain: "nneka.com",
    links: [
      { label: "HOME", href: "#/", path: "/", image: "image1" },
      { label: "About Me", href: "#/about", path: "/about", image: "image2" },
      { label: "MY GALLERY", href: "#/gallery", path: "/gallery", image: "image3" },
      { label: "MY FILMS", href: "#/films", path: "/films", image: "image5" },
      { label: "PHOTOGRAPHY", href: "#/photography", path: "/photography", image: "image1" },
      { label: "Contact Me", href: "#/contact", path: "/contact", image: "image4" },

    ],
  },
  contact: {
    eyebrow: "SAY HI",
    headline: ["NO NEED", "TO BE", "SHY."],
    email: "hello@nnekaegara.com",
    phone: "+254 700 000 000",
    mailSubject: "Let's talk about your project",
    mailLabel: "Let's talk about your project",
    opener: "I'M ALL EARS. TELL ME ABOUT YOUR NEXT STORY.",
    location: "NAIROBI, KENYA",
    social: [
      { label: "IG", url: "https://instagram.com/" },
      { label: "TW", url: "https://x.com/" },
      { label: "LI", url: "https://linkedin.com/" },
      { label: "VIMEO", url: "https://vimeo.com/" },
    ],
  },
  photography: {
    backLabel: "ALL PROJECTS",
    nextProjectProgress: true,
    projects: [
      { slug: "ndege", title: "Ndege", cover: "assets/photography/ndege.jpg", year: "2024", location: "NAIROBI, KENYA", category: "PORTRAITURE", about: "A study of presence, movement and the quiet language of a portrait.", models: [{ name: "Nia Wanjiku", handle: "@NIAWANJIKU", url: "https://instagram.com/" }], gear: ["Sony A7 IV", "35mm prime", "Natural light"], services: ["Photography", "Art direction", "Creative direction"], images: ["assets/photography/ndege.jpg", "assets/photography/daisy.jpg", "assets/photography/blind_bird.jpg", "img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"] },
      { slug: "daisy", title: "Daisy", cover: "assets/photography/daisy.jpg", year: "2023", location: "NAIROBI, KENYA", category: "EDITORIAL", about: "An editorial portrait shaped by softness, colour and natural light.", models: [{ name: "Daisy Achieng", handle: "@DAISYACHIEN", url: "https://instagram.com/" }], gear: ["Canon R5", "50mm prime", "Daylight"], services: ["Photography", "Styling", "Art direction"], images: ["assets/photography/daisy.jpg", "assets/photography/ndege.jpg", "assets/photography/blind_bird.jpg", "img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"] },
      { slug: "blind-bird", title: "Blind Bird", cover: "assets/photography/blind_bird.jpg", year: "2022", location: "NAIROBI, KENYA", category: "PERSONAL WORK", about: "A collection about instinct, memory and learning to see differently.", models: [{ name: "Amani K.", handle: "@AMANIK", url: "https://instagram.com/" }], gear: ["Fujifilm X-T5", "23mm prime", "Available light"], services: ["Photography", "Concept", "Post production"], images: ["assets/photography/blind_bird.jpg", "assets/photography/ndege.jpg", "assets/photography/daisy.jpg", "img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"] },
    ],
  },
};
