from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to the API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/query_data")
async def query_data():
    '''
    Check database if user or AI owns hostname. if neither, start bidding process
    '''
    
    pass
    
@app.get("/submit_bid") 
async def start_bidding():
    '''
    bidding loop until someone wins, then save result to db
    '''
    pass

async def query_agent_bid():
    return {"bid": 100}
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
