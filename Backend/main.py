from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama

app = FastAPI()

# Allow CORS for the Electron frontend (running on localhost during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        # We are using the aratan/VibeThinker-3B:Q4_K_M model as requested
        response = ollama.chat(model='aratan/VibeThinker-3B:Q4_K_M', messages=[
            {
                'role': 'user',
                'content': request.message,
            },
        ])
        return {"response": response['message']['content']}
    except Exception as e:
        print(f"Error communicating with Ollama: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
