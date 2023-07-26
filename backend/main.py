from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from diffusers import StableDiffusionPipeline
import torch
from io import BytesIO
import base64


app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get('/')
def read_root():
    return{'Test'}  


@app.get('/test') 
async def test():
    print('success')

@app.get('/generate')
async def generate(prompt: str):
    device = torch.device("mps")
    model_id = "runwayml/stable-diffusion-v1-5"
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
    pipe = pipe.to(device)
    image = pipe(prompt).images[0]  
    image.save("astronaut_rides_horse.png")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    imgstr = base64.b64encode(buffer.getvalue())
    return Response(content=imgstr, media_type='image/png')