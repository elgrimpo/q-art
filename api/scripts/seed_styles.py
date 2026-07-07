"""
One-off migration: seed the `styles` collection in MongoDB from the style
data that used to live hardcoded in ImageStyles.js (styles-in-DB migration,
see docs/superpowers/specs/2026-07-07-styles-in-db-design.md).

WARNING: writes to the live Mongo Atlas database (QART.styles). Run only
with explicit confirmation — this is not part of the app's request path or
CI, and running it twice will insert duplicate style documents.

Run: python -m api.scripts.seed_styles
"""
import asyncio
import os
import re

import certifi
import motor.motor_asyncio as motor
from dotenv import load_dotenv

load_dotenv()

# title, prompt, loras, style_modifier, sd_model — copied from the current
# src/_utils/ImageStyles.js, minus `keywords`, `image_url`, and the
# frontend-only "Random" entry (id 1), which is never sent for generation.
STYLES = [
    {
        "title": "Ukiyo-e",
        "prompt": "ukiyo-e, woodblock print, flat colors, flowing lines, Japanese, traditional, Establishing Shot, Proportion",
        "loras": [],
        "style_modifier": -1,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Expressionism",
        "prompt": "Expressionism art style, distorted perspective, vivid non-naturalistic colors, thick coarse brushwork, intense raw emotion, anxiety atmosphere, inspired by Edvard Munch",
        "loras": [{"model_name": "Painting_131556", "strength": 0.6}],
        "style_modifier": -1.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Low Poly Art",
        "prompt": "Low-Poly Art, Origami, Painting By Salvador Dali, Scene, Dramatic, Cinematic, Establishing Shot, 4k, UHD",
        "loras": [{"model_name": "ral-polygon-sd15_205894", "strength": 0.8}],
        "style_modifier": 0,
        "sd_model": "epicrealism_pureEvolutionV5_97793.safetensors",
    },
    {
        "title": "Photography",
        "prompt": "photography, photorealistic, cinematic lighting, shallow depth of field, ultra detailed, DSLR",
        "loras": [{"model_name": "epiCRealLife_117118", "strength": 0.8}],
        "style_modifier": 0,
        "sd_model": "cyberrealistic_v40_151857.safetensors",
    },
    {
        "title": "Vector Art",
        "prompt": "vector art, clean lines, flat colors, geometric shapes, crisp edges, minimal shading",
        "loras": [{"model_name": "0mib3(gut auf 1)_47645", "strength": 0.9}],
        "style_modifier": -0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Doodle Art",
        "prompt": "surrealistic, tuyawang, abstract, doodle art",
        "loras": [{"model_name": "TUYA5_129115", "strength": 0.8}],
        "style_modifier": -1,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Ink",
        "prompt": "ink wash, sumi-e, expressive brushstrokes, flowing ink, monochrome, splatter",
        "loras": [{"model_name": "zyd232_InkStyle_v1_0_53697", "strength": 1}],
        "style_modifier": 0,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Oil Painting",
        "prompt": "oil painting, impasto, saturated colors, vibrant palette, bold brushstrokes, painterly, bichu, Impressionism",
        "loras": [{"model_name": "bichu-v0612_65240", "strength": 0.8}],
        "style_modifier": -1.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Chinese art",
        "prompt": "Chinese ink painting, shan shui, ink wash, brushwork, rice paper, traditional, shuimobysim, wuxia",
        "loras": [
            {"model_name": "wuxia2_62008", "strength": 0.8},
            {"model_name": "MoXinV1_12781", "strength": 0.7},
        ],
        "style_modifier": 0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Watercolor",
        "prompt": "watercolor, soft washes, delicate pigments, fluid edges, paper texture, translucent",
        "loras": [{"model_name": "Colorwater_v4", "strength": 0.5}],
        "style_modifier": -2,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Ghibli",
        "prompt": "Studio Ghibli-inspired, whimsical, lush nature, soft watercolor, warm lighting, hand-painted",
        "loras": [
            {"model_name": "ghibli_style_offset_10272", "strength": 0.5},
            {"model_name": "Pyramid lora_Ghibli_n3_72103", "strength": 0.5},
        ],
        "style_modifier": -0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Cyberpunk",
        "prompt": "cyberpunk, neon-lit, futuristic megacity, rainy streets, holographic glow, cinematic lighting",
        "loras": [{"model_name": "CyberPunkAI_56082", "strength": 0.5}],
        "style_modifier": -0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Illustration",
        "prompt": "illustration, stylized, painterly, soft colors, clean linework, detailed, Zylagidam art style",
        "loras": [
            {"model_name": "Comic_book_7_E10", "strength": 0.6},
            {"model_name": "Drawing_85106", "strength": 0.5},
        ],
        "style_modifier": 0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
]


def slugify(title: str) -> str:
    """"Ukiyo-e" -> "ukiyo-e", "Low Poly Art" -> "low-poly-art"."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


async def seed():
    mongo_url = os.environ["MONGO_URL"]
    tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
    client = motor.AsyncIOMotorClient(mongo_url, **tls)
    db = client.get_database("QART")
    styles = db.get_collection("styles")

    print(f"Seeding {len(STYLES)} styles into QART.styles ...")
    for style in STYLES:
        doc = {
            "style_key": slugify(style["title"]),
            "version": 1,
            "is_active": True,
            **style,
        }
        result = await styles.insert_one(doc)
        print(f"  {str(result.inserted_id)}  {style['title']!r}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
