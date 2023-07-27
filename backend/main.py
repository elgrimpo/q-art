from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from diffusers import (StableDiffusionControlNetImg2ImgPipeline, ControlNetModel)
import torch
from io import BytesIO
import base64
import qrcode
import numpy as np
from PIL import Image, ImageOps


app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# load models
device = torch.device("mps")
model_id = "runwayml/stable-diffusion-v1-5"
control_net = ControlNetModel.from_pretrained('DionTimmer/controlnet_qrcode-control_v1p_sd15').to(device)
pipe = StableDiffusionControlNetImg2ImgPipeline.from_pretrained(
    model_id, 
    controlnet=control_net,
    # torch_dtype=torch.float16
    ).to(device)

#Resize image to meet condition
def resize_for_condition_image(input_image: Image.Image, resolution: int = 512):
    input_image = input_image.convert("RGB")
    W, H = input_image.size
    k = float(resolution) / min(H, W)
    H *= k
    W *= k
    H = int(round(H / 32.0)) * 32
    W = int(round(W / 32.0)) * 32
    img = input_image.resize((W, H), resample=Image.LANCZOS)
    return img


@app.get('/generate')
async def generate(prompt: str, website: str):
    
    #Prepare QR Image
    qr_image = qrcode.make(website)
    qr_image.save("qrcode.png")
    image = Image.open("qrcode.png")
    qr_array = np.array(image)

    #Resize image
    qr_image = resize_for_condition_image(qr_image, 512)

    image = pipe(
        prompt,
        image= qr_image,
        control_image=qr_image,
        width=512,  # type: ignore
        height=512,  # type: ignore
        # guidance_scale=float(guidance_scale),
        # controlnet_conditioning_scale=float(controlnet_conditioning_scale),  # type: ignore
        generator=torch.Generator(),
        strength=float(0.8),
        num_inference_steps=25,
        ).images[0]  
    image.save("astronaut_rides_horse.png")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    imgstr = base64.b64encode(buffer.getvalue())
    return Response(content=imgstr, media_type='image/png')