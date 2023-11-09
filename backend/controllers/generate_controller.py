# Libraries Import
import qrcode
from dotenv import load_dotenv
import os
import requests as requests
from novita_client import *

# App imports
from controllers.images_controller import insert_image
from utils.utils import readImage, prepare_doc


load_dotenv()


def predict(prompt, website, negative_prompt, seed, image_quality, qr_weight,sd_model, user_id):
    
    client = NovitaClient(os.environ["NOVITA_KEY"])

    # TODO: Check SDK if fixed
    # # Load ControlNet models
    # controlnet_model_0 = client.models().filter_by_type(ModelType.CONTROLNET).get_by_name("control_v1p_sd15_brightness.safetensors")
    # if controlnet_model_0 is None:
    #     raise Exception("controlnet_0 model not found")

    # controlnet_model_1 = client.models().filter_by_type(ModelType.CONTROLNET).get_by_name("control_v1p_sd15_qrcode_monster_v2")
    # if controlnet_model_1 is None:
    #     raise Exception("controlnet_1 model not found")
    # print("Model:")
    # print(controlnet_model_1)

    # Create QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4
    )
    qr.add_data(website)  

    qr_image = qr.make_image()
    qr_image.save("qrcode.png")
    image_base64_str = readImage("qrcode.png")
    
    # Image Quality -> Steps
    if image_quality == "low":
        steps = 10
    elif image_quality == "medium":
        steps = 20  
    elif image_quality == "high":
        steps = 30

    req = Txt2ImgRequest(
        prompt=prompt,
        negative_prompt = negative_prompt,
        sampler_name=Samplers.DPMPP_M_KARRAS,
        model_name=sd_model,
        width=512,
        height=512,
        steps=steps,
        batch_size=1,
        cfg_scale=9,
        seed= int(seed),
        controlnet_units=[
            ControlnetUnit(
                input_image=image_base64_str,
                control_mode=ControlNetMode.BALANCED,
                model="controlV1pSd15_v10_92404",
                module=ControlNetPreprocessor.INPAINT,
                resize_mode=ControlNetResizeMode.RESIZE_OR_CORP,
                weight=0.35,
                guidance_start = 0.0,
                guidance_end = 1.0
            )
            ,
            ControlnetUnit(
                input_image=image_base64_str,
                control_mode=ControlNetMode.BALANCED,
                model="control_v1p_sd15_qrcode_monster_v2",
                module=ControlNetPreprocessor.INPAINT,
                resize_mode=ControlNetResizeMode.RESIZE_OR_CORP,
                weight=1.0 + float(qr_weight) * 0.1,
                guidance_start = 0.2 - float(qr_weight) * 0.05,
                guidance_end = 0.85 + float(qr_weight) * 0.05
            )
        ]
    )

    res = client.sync_txt2img(req)
    if res.data.status != ProgressResponseStatusCode.SUCCESSFUL:
        raise Exception('Failed to generate image with error: ' +
                        res.data.failed_reason)
    save_image(res.data.imgs_bytes[0], "qrcode-art.png")
    image = readImage("qrcode-art.png")
    # TODO: read info from response
    info = {
        "seed": -1
    }
    doc = prepare_doc(image, req, info, website, image_quality, qr_weight, user_id)
    #print(doc)
    inserted_image = insert_image(doc, user_id, image_quality)
    return inserted_image