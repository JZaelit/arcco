from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from recommender import get_recommendations

app = FastAPI()

# R2 fix: Add CORS so frontend can always connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendationRequest(BaseModel):
    days: list[str]
    start_hour: int
    end_hour: int

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/recommendations")
def recommendations(request: RecommendationRequest):
    # R1 fix: proper error handling if API breaks or returns wrong data
    try:
        if not request.days:
            raise ValueError("No days provided")
        if request.start_hour >= request.end_hour:
            raise ValueError("Start hour must be before end hour")
        
        results = get_recommendations(
            request.days,
            request.start_hour,
            request.end_hour
        )
        
        if results is None:
            raise ValueError("No data returned from recommender")
            
        return {"recommendations": results}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")