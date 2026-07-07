# Libraries Import
import requests as requests
import datetime
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
from typing_extensions import Annotated
from pydantic.functional_validators import BeforeValidator


PyObjectId = Annotated[str, BeforeValidator(str)]

# ---------------------------------------------------------------------------- #
#                                 USER CLASSES                                 #
# ---------------------------------------------------------------------------- #


class ImageCounts(BaseModel):
    medium: Optional[int] = None
    low: Optional[int] = None
    high: Optional[int] = None
    upscale: Optional[int] = None


# TODO(QRAI-53 Task 5): remove PaymentHistory — no longer used by User after credit system removal
class PaymentHistory(BaseModel):
    date_time: datetime
    transaction_amount: int
    product_id: str
    credit_amount: int
    payment_intent_id: str

class AuthProvider(BaseModel):
    provider: str
    providerId: str
    
class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    auth_providers: List[AuthProvider] = []   
    name: str
    picture: Optional[str] = None
    email: str
    image_counts: Optional[Dict[str, Dict[str, ImageCounts]]] = {}
    last_image_created_at: Optional[datetime] = None

class UserAuth(BaseModel):
    name: str
    email: str
    auth_providers: List[AuthProvider]
    guest_id: Optional[str] = None
    picture: Optional[str] = None

class LoginCodeRequest(BaseModel):
    email: str

class LoginCodeVerify(BaseModel):
    email: str
    code: str

# ---------------------------------------------------------------------------- #
#                                IMAGES CLASSES                                #
# ---------------------------------------------------------------------------- #

class ControlNet(BaseModel):
    # control_mode: int
    model: str
    # module: str
    weight: float
    guidance_start: float
    guidance_end: float
    # resize_mode: int

class StyleLora(BaseModel):
    model_name: str
    strength: float


class Style(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    style_key: str
    version: int = 1
    is_active: bool = True
    title: str
    prompt: str
    loras: List[StyleLora] = []
    style_modifier: float = 0
    sd_model: str

class Like(BaseModel):
    userId: str
    time: datetime

class ImageDoc(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    created_at: datetime
    prompt: str
    negative_prompt: Optional[str] = None
    style_title: Optional[str] = "Default"
    style_prompt: Optional[str] = None
    style_id: Optional[str] = None
    content: str
    sd_model: str
    seed: int
    qr_weight: float
    width: int
    height: int
    query_type: str
    steps: int
    # cfg_scale: int
    # sampler_name: str
    controlnet0: ControlNet
    # controlnet1: ControlNet
    image_url: Optional[str] = None
    watermarked_image_url: Optional[str] = None
    likes: Optional[List[Like]] = []
    unlocked: Optional[bool] = False
    unlock_pending: Optional[bool] = False
    featured: Optional[bool] = False
    scannability_score: Optional[float] = None
