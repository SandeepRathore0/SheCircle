from fastapi import APIRouter
from pydantic import BaseModel
import os
import google.generativeai as genai
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatRequest(BaseModel):
    message: str

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@router.post("/support")
async def emotional_support_chat(request: ChatRequest):
    msg = request.message.strip()
    
    if not GEMINI_API_KEY:
        return {"reply": "I'm currently taking a moment to recharge. Please check my API key configuration. 🌸"}

    try:
        model = genai.GenerativeModel(
            model_name="gemini-flash-latest",
            system_instruction="You are 'SheCircle AI', a highly empathetic and supportive companion for women. Your goal is to provide emotional support, validate feelings, and suggest constructive ways to handle stress, mental load, and life transitions. Keep your tone gentle, warm, and non-judgmental. If the user seems in acute distress, gently suggest professional support circles in the app."
        )
        response = await model.generate_content_async(msg)
        return {"reply": response.text}
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"reply": "I'm having a little trouble connecting right now. Please try talking to me again in a moment. 🌸"}

@router.get("/recommendations/{user_id}")
def circle_recommendations(user_id: int):
    return [
        {
            "id": 1,
            "name": "Wellness Walkers",
            "members": 6,
            "distance": "1.2 km",
            "match_reason": "Based on your interest in Walking and Proximity"
        },
        {
            "id": 2,
            "name": "Mindful Mothers",
            "members": 8,
            "distance": "3.0 km",
            "match_reason": "Matches your availability on Weekends"
        }
    ]
