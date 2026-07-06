export const styles = [
  {
    id: 1,
    title: "Random",
    prompt: "",
    loras: [],
    style_modifier: 0,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6575fc6828c914471b835383.png",
    keywords: [],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 2,
    title: "Ukiyo-e",
    prompt:
      "ukiyo-e, woodblock print, flat colors, flowing lines, Japanese, traditional, Establishing Shot, Proportion",
    loras: [],
    style_modifier: -1,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
    keywords: ["Flat Design", "Ukiyo-e"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 3,
    title: "Expressionism",
    prompt:
      "Expressionism art style, distorted perspective, vivid non-naturalistic colors, thick coarse brushwork, intense raw emotion, anxiety atmosphere, inspired by Edvard Munch",
    loras: [{ model_name: "Painting_131556", strength: 0.6 }],
    style_modifier: -1.5,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a498f50dbeee01fccc37bc6.png",
    keywords: ["Expressionism", "Bold colors"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 5,
    title: "Low Poly Art",
    prompt:
      "Low-Poly Art, Origami, Painting By Salvador Dali, Scene, Dramatic, Cinematic, Establishing Shot, 4k, UHD",
    loras: [{ model_name: "ral-polygon-sd15_205894", strength: 0.8 }],
    style_modifier: 0,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
    keywords: ["Origami", "Low-Poly"],
    sd_model: "epicrealism_pureEvolutionV5_97793.safetensors",
  },
  {
    id: 6,
    title: "Photography",
    prompt:
      "photography, photorealistic, cinematic lighting, shallow depth of field, ultra detailed, DSLR",
    loras: [{ model_name: "epiCRealLife_117118", strength: 0.8 }],
    style_modifier: 0,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4abe9e2164b64ac00f0758.png",
    keywords: ["Photography", "Cinematic"],
    sd_model: "cyberrealistic_v40_151857.safetensors",
  },
  {
    id: 12,
    title: "Vector Art",
    prompt: "vector art, clean lines, flat colors, geometric shapes, crisp edges, minimal shading",
    loras: [{ model_name: "0mib3(gut auf 1)_47645", strength: 0.9 }],
    style_modifier: -0.5,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65cc123c7b729925fcced038.png",
    keywords: ["Flat Design", "Illustrator"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 10,
    title: "Doodle Art",
    prompt: "surrealistic, tuyawang, abstract, doodle art",
    loras: [{ model_name: "TUYA5_129115", strength: 0.8 }],
    style_modifier: -1,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a19822d076ab86bf56acab.png",
    keywords: ["Doodle Art"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 7,
    title: "Ink",
    prompt: "ink wash, sumi-e, expressive brushstrokes, flowing ink, monochrome, splatter",
    loras: [{ model_name: "zyd232_InkStyle_v1_0_53697", strength: 1 }],
    style_modifier: -1,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6595dd1fd3f4c7d50f757b65.png",
    keywords: ["Ink sketch", "monochrome"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 9,
    title: "Oil Painting",
    prompt: "oil painting, impasto, saturated colors, vibrant palette, bold brushstrokes, painterly, bichu, Impressionism",
    loras: [{ model_name: "bichu-v0612_65240", strength: 0.8 }],
    style_modifier: -1.5,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/659801fb55848e0542b40cd0.png",
    keywords: ["80s style", "CMYK Colors"],
    sd_model: "colorful_v31_62333.safetensors",
  },

  {
    id: 11,
    title: "Chinese art",
    prompt: "Chinese ink painting, shan shui, ink wash, brushwork, rice paper, traditional, shuimobysim, wuxia",
    loras: [
      { model_name: "wuxia2_62008", strength: 0.8 },
      { model_name: "MoXinV1_12781", strength: 0.7 },
    ],
    style_modifier: 0.5,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65e243349c04d23c99e86494.png",
    keywords: ["Japonism", "Kitsch"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 11,
    title: "Watercolor",
    prompt: "watercolor, soft washes, delicate pigments, fluid edges, paper texture, translucent",
    loras: [{ model_name: "Colorwater_v4", strength: 0.5 }],
    style_modifier: -2,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a49894ce43200a51524b869.png",
    keywords: ["Water color"],
    sd_model: "colorful_v31_62333.safetensors",
  },
   {
    id: 17,
    title: "Ghibli",
    prompt: "Studio Ghibli-inspired, whimsical, lush nature, soft watercolor, warm lighting, hand-painted",
    loras: [{model_name: "ghibli_style_offset_10272", strength: 0.5}, {model_name: "Pyramid lora_Ghibli_n3_72103", strength: 0.5}],
    style_modifier: -0.5,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bbb07890b1939b5192cd8.png",
    keywords: ["Rainbow Core", "Color Blend"],
    sd_model: "colorful_v31_62333.safetensors",
  },
     {
    id: 18,
    title: "Cyberpunk",
    prompt: "cyberpunk, neon-lit, futuristic megacity, rainy streets, holographic glow, cinematic lighting",
    loras: [{model_name: "CyberPunkAI_56082", strength: 0.7}],
    style_modifier: -0.5,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4508cc3b23a83b1fa7b4c3.png",
    keywords: ["Rainbow Core", "Color Blend"],
    sd_model: "colorful_v31_62333.safetensors",
  },
    {
    id: 4,
    title: "Illustration",
    prompt:
      "illustration, stylized, painterly, soft colors, clean linework, detailed, Zylagidam art style",
    loras: [{ model_name: "Comic_book_7_E10", strength: 0.6 },{ model_name: "Drawing_85106", strength: 0.5 }],
    style_modifier: 0.5,
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bb59e2cfa329e8d58854c.png",
    keywords: ["Dreamy glow", "Light particles"],
    sd_model: "colorful_v31_62333.safetensors",
  },
];

/**
 * Pick a random non-Random style. Used by GenerateForm and IteratePanel
 * when the user has selected style_id === 1 ("Random").
 */
export function selectRandomStyle() {
  const available = styles.filter((s) => s.id !== 1);
  return available[Math.floor(Math.random() * available.length)];
}
