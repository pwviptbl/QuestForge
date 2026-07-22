import hashlib
import os
from pathlib import Path

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI(title="QuestForge TTS", docs_url=None, redoc_url=None)
CACHE_DIR = Path(os.getenv("TTS_CACHE_DIR", "/app/cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=12000)
    voice: str = Field(default="pt-BR-FranciscaNeural", pattern=r"^pt-BR-[A-Za-z]+Neural$")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/synthesize")
async def synthesize(request: SynthesisRequest) -> FileResponse:
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="O texto não pode ser vazio.")

    cache_key = hashlib.sha256(f"{request.voice}:{text}".encode()).hexdigest()
    audio_path = CACHE_DIR / f"{cache_key}.mp3"

    if not audio_path.exists():
        temporary_path = audio_path.with_suffix(".tmp")
        try:
            communicate = edge_tts.Communicate(text, request.voice)
            await communicate.save(str(temporary_path))
            temporary_path.replace(audio_path)
        except Exception as exception:
            temporary_path.unlink(missing_ok=True)
            raise HTTPException(status_code=502, detail="Falha ao sintetizar o áudio.") from exception

    return FileResponse(audio_path, media_type="audio/mpeg", filename="questforge.mp3")
