from fastapi import FastAPI

app = FastAPI(title="PCBuilder AI Recommendation Engine")

@app.get("/")
def read_root():
    return {"message": "PCBuilder AI Recommendation Engine is running."}

@app.get("/health")
def health_check():
    return {"status": "Healthy"}
