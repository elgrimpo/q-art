payloadConfig = {
    "prompt": "",
    "negative_prompt": "",
    "batch_size": 1,
    "steps": 20,
    "cfg_scale": 7, 
    "sampler_name": "DPM++ 2M Karras",
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
                    "guidance_end": 0.75,
                    "guidance_start": 0.3,
                    "input_mode": "simple",
                    "is_ui": True,
                    "loopback": False,
                    "low_vram": False,
                    "model": "control_v11f1e_sd15_tile [a371b31b]",
                    "module": "tile_resample",
                    "output_dir": "",
                    "pixel_perfect": False,
                    "processor_res": -1,
                    "resize_mode": "Crop and Resize",
                    "threshold_a": 1,
                    "threshold_b": -1,
                    "weight": 0.70,
                },
                {
                    "image": {
                        "image": ""
                    },
                    "batch_images": "",
                    "control_mode": "Balanced",
                    "enabled": True,
                    "guidance_end": 0.9,
                    "guidance_start": 0.4,
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
                    "threshold_a": -1,
                    "threshold_b": -1,
                    "weight": 0.45,
                }
            ]
        }
    }
}