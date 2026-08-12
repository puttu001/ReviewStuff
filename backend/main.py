from fastapi import FastAPI

from api.routers import router

app = FastAPI()
app.include_router(router)

@app.get('/health')
def health_status():
    return {"status": "ok"}
