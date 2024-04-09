payloadConfig = {
    "prompt": "",
    "negative_prompt": "",
    "batch_size": 1,
    "steps": 30,
    "cfg_scale": 9, 
    "sampler_name": "DPM++ 2M Karras",
    "seed": -1,
    "alwayson_scripts": {
        "ControlNet": {
            "args": [
                {
                    "image": {
                        "image": ""
                    },
                    "batch_images": "",
                    "control_mode": "Balanced",
                    "enabled": True,
                    "guidance_end": 1,
                    "guidance_start": 0,
                    "input_mode": "simple",
                    "is_ui": True,
                    "loopback": False,
                    "low_vram": False,
                    "model": "control_v1p_sd15_brightness [5f6aa6ed]",
                    "module": "inpaint_global_harmonious",
                    "output_dir": "",
                    "pixel_perfect": False,
                    "processor_res": -1,
                    "resize_mode": "Crop and Resize",
                    "threshold_a": 1,
                    "threshold_b": -1,
                    "weight": 0.35,
                },
                {
                    "image": {
                        "image": ""
                    },
                    "batch_images": "",
                    "control_mode": "Balanced",
                    "enabled": True,
                    "guidance_end": 0.85,
                    "guidance_start": 0.2,
                    "input_mode": "simple",
                    "is_ui": True,
                    "loopback": False,
                    "low_vram": False,
                    "model": "control_v1p_sd15_qrcode_monster [a6e58995]",
                    "module": "inpaint_global_harmonious",
                    "output_dir": "",
                    "pixel_perfect": False,
                    "processor_res": -1,
                    "resize_mode": "Crop and Resize",
                    "threshold_a": -1,
                    "threshold_b": -1,
                    "weight": 1.0,
                }
            ]
        }
    }
}