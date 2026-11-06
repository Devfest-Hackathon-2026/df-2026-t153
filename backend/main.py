from fastapi import FastAPI

app = FastAPI(title="SanpoLab API")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
