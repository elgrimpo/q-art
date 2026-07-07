export const RANDOM_STYLE_ID = "random";

export const styles = [
  {
    id: RANDOM_STYLE_ID,
    title: "Random",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6575fc6828c914471b835383.png",
  },
  {
    id: "6a4cfaec4021f21026e477ed",
    title: "Ukiyo-e",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
  },
  {
    id: "6a4cfaed4021f21026e477ee",
    title: "Expressionism",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a498f50dbeee01fccc37bc6.png",
  },
  {
    id: "6a4cfaed4021f21026e477ef",
    title: "Low Poly Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
  },
  {
    id: "6a4cfaee4021f21026e477f0",
    title: "Photography",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4abe9e2164b64ac00f0758.png",
  },
  {
    id: "6a4cfaee4021f21026e477f1",
    title: "Vector Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65cc123c7b729925fcced038.png",
  },
  {
    id: "6a4cfaee4021f21026e477f2",
    title: "Doodle Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a19822d076ab86bf56acab.png",
  },
  {
    id: "6a4cfaee4021f21026e477f3",
    title: "Ink",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6595dd1fd3f4c7d50f757b65.png",
  },
  {
    id: "6a4cfaee4021f21026e477f4",
    title: "Oil Painting",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/659801fb55848e0542b40cd0.png",
  },
  {
    id: "6a4cfaee4021f21026e477f5",
    title: "Chinese art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65e243349c04d23c99e86494.png",
  },
  {
    id: "6a4cfaee4021f21026e477f6",
    title: "Watercolor",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a49894ce43200a51524b869.png",
  },
  {
    id: "6a4cfaee4021f21026e477f7",
    title: "Ghibli",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bbb07890b1939b5192cd8.png",
  },
  {
    id: "6a4cfaee4021f21026e477f8",
    title: "Cyberpunk",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4508cc3b23a83b1fa7b4c3.png",
  },
  {
    id: "6a4cfaee4021f21026e477f9",
    title: "Illustration",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bb59e2cfa329e8d58854c.png",
  },
];

/**
 * Pick a random non-Random style. Used by GenerateForm and IteratePanel
 * when the user has selected style_id === RANDOM_STYLE_ID ("Random").
 */
export function selectRandomStyle() {
  const available = styles.filter((s) => s.id !== RANDOM_STYLE_ID);
  return available[Math.floor(Math.random() * available.length)];
}
