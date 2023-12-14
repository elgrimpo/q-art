// Create Who list
const listWho = [
  "A pepe godzilla is",
  "An pirate alien is",
  "A raccoon in cooking gear is",
  "An orang-utan is",
  "A colorful owl is",
  "A nuclear scientist is",
  "An management consultant is",
  "A Villain is",
  "A warrior with his face painted for battle is",
  "A unicorn is",
  "A Viking demon god with a wolf fur hat is",
  "An angry mob is",
  "An officer in rainbow uniform is",
  "A tiger slug is",
  "A chameleon is",
  "A dragon is",
  "A ninja is",
  "A dinosaur is",
  "A killer robot is",
  "A space monkey is",
  "A hippie is",
  "A Samurai Warrior is",
  "A Bard is",
  "A Clownpunk is",
  "A Goblin is",
  "A Halfling is",
  "A grand Wizard is",
  "A Mermaid is",
  "A Humanoid is",
  "A personification of the four seasons",
  "A Corgi is",
  "A Parrot is",
  "A Sandworm is",
  "A luminous Jellyfish is",
  "A giant Turtle is",
  "A wolf-like priestess is",
];

// Create What list
const listWhat = [
  "sleeping",
  "running",
  "standing",
  "jumping off a cliff",
  "creating art",
  "observing",
  "eating a burger",
  "floating",
  "chilling",
  "kissing a frog prince",
  "flying a dragon",
  "meditating",
  "waving",
  "swinging",
  "smashing pumpkins",
  "smashing boulders",
  "watching a Solar Eclipse",
  "reading",
  "climbing an elephant",
  "climbing a limestone rock",
  "dancing",
  "running from a clown",
  "playing the ukulele",
  "playing the alphorn",
  "watching Northern Lights",
  "chasing dragons",
  "gardening",
  "hosting a dinner party",
  "having a bath",
  "having a picnic",
  "barbequing",
  "hosting a tea ceremony",
  "stargazing",
  "contemplating",
  "playing the piano",

];

// Create Where list
const listWhere = [
  "at a steampunk factory",
  "Japanese city alleyway",
  "Pirate cove",
  "in front of a christmas gingerbread house",
  "on an Alien Moon",
  "in an idyllic dojo of peace",
  "at the the park",
  "in the forest",
  "in the Rainforest",
  "in the Jungle",
  "at a rangeland",
  "on a pasture where cows are feeding",
  "in a Valley filled with flowers",
  "on the Foothills",
  "on the Bayou",
  "on a Glacier",
  "in the Arctic",
  "at the Savanna",
  "at Mesa Bryce",
  "at the Beach",
  "at a french cafe on a street corner",
  "on a steep hill covered with rice paddies",
  "in a middle-eastern city built inside a great cavern",
  "inside the Ruins of an ancient temple",
  "at a Mediterranean town",
  "under the Sea",
  "in a Deep Sea city",
  "by a Coral Reef",
  "on a scenic Lake",
  "in a overdimensional Cave",
  "on top of the biggest Mountains",
  "at a volcanic crater",
  "in front of a Wasteland trailer",
  "in a forest of glowing Mushrooms",
  "on an Asteroid",
  "in an alchemists lab",
  "within unique Planetary constellation",
  "on Planet Mercury",
  "on Mars",
  "on Jupiter",
  "around the sun",
  "near a Neutron Star",
  "in Outer Space",
  "in middle earth",
  "in a galaxy far far away",
  "at Joshua Tree National Park",
  "at Bryce Canyon National Park",
  "at Winterfell",
  "inside the the colosseum",
  "in front of the mirror"
];

// Create When list
const listWhen = [
  "in a postapocalyptic future",
  "in a cyberpunk future",
  "at a scenic full moon night",
  "at early sunrise",
  "at sunset",
  "at dusk",
  "at Midnight",
  "in the middle of winter",
  "in the height of summer",
  "in colorful spring",
  "in the middle of autumn",
  "at the end of the world",
  "in a future where everything is digital",
  "during the Golden Hour",
  "during the Blue Hour",
];

export const promptKeywords = [
  {
    title: "Art Styles",
    keywords: [
      "Cubism",
      "Ukiyo-e Flat Design",
      "Expressionism",
      "Psychedelic",
      "Synesthesia",
      "Pop-Art",
      "Modernism",
      "Constructivism",
      "Positivism",
      "Gothic Horror",
      "Impressionism",
      "Temporary Art",
      "Art Nouveau",
      "Folk Art",
      "Dadaism",
      "Memphis Style",
      "Kitsch",
      "Brocade",
      "Oshibana",
      "Cyberspace",
      "Trillwave",
      "Digitalpunk",
      "3-bit",
      "16-bit",
      "Analog",
      "Pixar",
      "MSPaint",
      "Graphic",
      "Vector Art",
      "3D Render",
      "Low-Poly Art",
      "Pixel Art",
      "Dithering",
      "Flaticon",
      "Glitch Art",
      "Split Toning",
      "Flat Design",
      "Isotype",
      "Isometric",
      "Orthographic",
      "Axonometric",
      "Pictogram",
      "Claymation",
    ],
  },

  {
    title: "Artists",
    keywords: [
      "Painting By Claude Lorrain",
      "Painting By Pablo Picasso",
      "Painted By Lawrence Pelton",
      "Painting By Van Gogh",
      "Painting By Grant Wood",
      "Painting By Dan Mumford",
      "Painting By Ushio Shinohara",
      "Graffiti By Banksy",
      "Graffiti By Anthony Lister",
      "Painting By Salvador Dali",
      "Painting By Max Ernst",
      "Painting By Wes Anderson",
      "Painted By Andy Warhol",
      "Painted By Leonardo Da Vinci",
      "Painting By Rembrandt",
      "Painting By Edvard Munch",
      "Painting By Frida Kahlo",
      "Painting By Georgia OKeeffe",
    ],
  },
  {
    title: "Cultural Styles",
    keywords: [
      "Indian-Style",
      "Soviet-Style",
      "American-Style",
      "Europunk",
      "Incan",
      "Brazilian-Style",
      "Mexican-Style",
      "African-Style",
      "Australian-Style",
      "Spanish-Style",
      "French-Style",
      "Italian-Style",
      "Turkish-Style",
      "German-Style",
      "Greek Mythology",
      "Swiss-Style",
      "Swedish-Style",
      "Roman-Style",
      "Chinese-Style",
      "Japonism",
      "Balinese-Style",
      "Tibetan-Style",
      "Indonesian-Style",
      "Khmer-Style",
      "Russian-Style",
      "Soviet Propagand",
      "Arabic-Style",
      "Mayan-Style",
      "Caribbean-Style",
      "Egyptian Art",
      "Nordic Mythology",
      "Victorian-Style",
      "Byzantine Icon",
    ],
  },
  {
    title: "Medium",
    keywords: [
      "Photography",
      "Sketch",
      "Line Art",
      "Graphic Novel",
      "Ink",
      "Flexographic Ink",
      "Viscosity Print",
      "Crayon",
      "Canvas",
      "Watercolor Painting",
      "Encaustic Painting",
      "Gond Painting",
      "Coffee Paint",
      "Graffiti",
      "Sticker",
      "Bagh Print",
      "Tarot Card",
      "Stamp",
      "Origami",
      "Kirigami",
      "Chinese Paper Art",
      "Glass Mosaic",
      "Mural",
      "Mayan Sculpture",
      "Woodblock Print",
      "Collage",
      "Light Art",
      "Sticker Bomb",
      "Installation Art",
      "Negative Space",
      "Outlined",
    ],
  },
  {
    title: "Cinematography",
    keywords: [
      "Scene",
      "Dramatic",
      "Cinematic",
      "Establishing Shot",
      "Shot on 16mm",
      "Double-Exposure",
      "Depth of Field",
      "Tiltshift",
      "Simplicity",
      "Detailed",
      "Hyperdetailed",
      "Multiplex",
      "Cluttered",
      "Idyllic",
      "Epic Composition",
      "Proportion",
      "Top-View",
      "Parallel Projection",
      "Linear Perspective",
      "Schematic",
      "View From an Airplane",
      "Aerial View",
      "Closeup-View",
      "Epic Wide Shot",
      "Wide Shot",
      "Centered-Shot",
      "First-Person View",
      "Field of View",
      "Low Angle",
      "Macro View",
      "Panorama",
      "Telephoto",
      "Fisheye Lens",
      "Depth",
      "Vantage Point",
      "Vanishing Point",
      "High Angle",
      "Miniature Faking",
      "Forced Perspective",
    ],
  },
  {
    title: "Colors",
    keywords: [
      "Hue",
      "Gradient",
      "Vibrant Colors",
      "Light Colors",
      "Dark Colors",
      "Pigment",
      "Faded Colors",
      "Gloomy Colors",
      "Happy Colors",
      "Color Palette",
      "Spectral Color",
      "Neon",
      "Tonal Colors",
      "High Saturation",
      "Low Saturation",
      "Light Mode",
      "Dark Mode",
      "Monochromatic",
      "High Contrast",
      "Low Contrast",
      "RGB",
      "CMYK",
      "Unreal Engine",
      "4k",
      "UHD",
    ],
  },
  {
    title: "Special Effects",
    keywords: [
      "Lumen Reflections",
      "Reflection in a Puddle",
      "Blur",
      "Blur Effect",
      "Parallax",
      "Anaglyph",
      "Chromatic Aberration",
      "Posterization",
      "Quantization",
      "Textured",
      "Glowing Edges",
      "Repetition",
      "Haze",
      "Cinematic Haze",
      "Bokeh",
      "Polaroid",
    ],
  },
];

export const promptRandomizer = () => {
  const selectedIndices = [];
  const selectedItems = [];

  while (selectedIndices.length < 4) {
    const randomIndex = Math.floor(Math.random() * promptKeywords.length);
    if (!selectedIndices.includes(randomIndex)) {
      selectedIndices.push(randomIndex);
      const randomItemIndex = Math.floor(Math.random() * promptKeywords[randomIndex].keywords.length);
      selectedItems.push(promptKeywords[randomIndex].keywords[randomItemIndex]);
    }
  }

  //generate random index
  const WhoRandomNum = Math.floor(Math.random() * listWho.length);
  const WhatRandomNum = Math.floor(Math.random() * listWhat.length);
  const WhereRandomNum = Math.floor(Math.random() * listWhere.length);
  const WhenRandomNum = Math.floor(Math.random() * listWhen.length);
  //output
  return `${listWho[WhoRandomNum]} ${listWhat[WhatRandomNum]} ${listWhere[WhereRandomNum]} ${listWhen[WhenRandomNum]}, ${selectedItems.join(', ')}`
};


export const styles = [{
  id: 1,
  title: "Default",
  prompt: "",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6575fc6828c914471b835383.png",
  keywords: [],
  sd_model: "cyberrealistic_v40_151857.safetensors"

},
{
  id: 2,
  title: "Ukiyo-e",
  prompt: "Detailed, Graphic Novel, Cinematic, Ukiyo-e Flat Design, Dramatic, Scene, Establishing Shot, Proportion",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574d4189961d5a54e2ff50e.png",
  keywords: ["Flat Design", "Ukiyo-e"],
  sd_model: "colorful_v31_62333.safetensors"


}, {
  id: 3,
  title: "Expressionism",
  prompt: "abstract expressionist painting, award-winning photo, energetic brushwork, bold colors, abstract forms, expressive",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574d4b69961d5a54e2ff50f.png",
  keywords: ["Expressionism", "Bold colors"],
  sd_model: "colorful_v31_62333.safetensors"

}, {
  id: 4,
  title: "Dreamy",
  prompt: "digital painting, extremely smooth, fluid, 3d fractals, light particles, dreamy, shimmering, dreamy glow, HQ, 4K",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574d5f69961d5a54e2ff514.png",
  keywords: ["Dreamy glow", "Light particles"],
  sd_model: "colorful_v31_62333.safetensors"


},{
  id: 5,
  title: "Low Poly Art",
  prompt: "Low-Poly Art, Origami, Painting By Salvador Dali, Scene, Dramatic, Cinematic, Establishing Shot, 4k, UHD",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574d6939961d5a54e2ff517.png",
  keywords: ["Origami", "Low-Poly"],
  sd_model: "epicrealism_pureEvolutionV5_97793.safetensors"

}, {
  id: 6,
  title: "Photography",
  prompt: "Photography, Happy Colors, Epic Composition, Cinematic, Detailed, 4k",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574d75a9961d5a54e2ff519.png",
  keywords: ["Photography", "Cinematic"],
  sd_model: "cyberrealistic_v40_151857.safetensors"


},{
  id: 7,
  title: "Ink",
  prompt: "Chinese traditional, Flexographic Ink, Ink, canvas, monochromatic",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574d88f9961d5a54e2ff51a.png",
  keywords: ["Flexographic inc", "Low-poly art"],
  sd_model: "neverendingDreamNED_v122BakedVae.safetensors"

}, {
  id: 8,
  title: "Japonism",
  prompt: "Japonism, Outlined, Closeup-View",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574e2af9961d5a54e2ff51e.png",  
  keywords: ["Japonism", "Kitsch"],
  sd_model: "neverendingDreamNED_v122BakedVae.safetensors"


},{
  id: 9,
  title: "Vector Art",
  prompt: "Flat Design, Vector Art, illustrator",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6576499b56ae6bad355304cc.png",  
  keywords: ["Flat Design", "Illustrator"],
  sd_model: "neverendingDreamNED_v122BakedVae.safetensors"

}, {
  id: 10,
  title: "Sticker",
  prompt: "Art Nouveau, Sticker, Turkish-Style, Miniature Faking",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/6574e5ae9961d5a54e2ff525.png",  
  keywords: ["Miniature Faking", "Art Nouveau"],
  sd_model: "neverendingDreamNED_v122BakedVae.safetensors"


},{
  id: 11,
  title: "Rainbox",
  prompt: "Abstract, Rainbowcore, Color Blend",
  image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/657619f756ae6bad355304bf.png",  
  keywords: ["Rainbow Core", "Color Blend"],
  sd_model: "neverendingDreamNED_v122BakedVae.safetensors"

}, 
]

export default promptRandomizer;
