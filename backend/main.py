from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from bidding_agent import Agent

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#configure global state variables here 
app.state.agent = Agent(budget=1000, owned_hostnames=set())
app.state.user_owned_hostnames = set()
app.state.user_budget = 1000

@app.get("/")
async def root():
    return {"message": "Welcome to the API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/query_data/{hostname}")
async def query_data(hostname: str):
    '''
    Check database if user or AI owns hostname. if neither, ask frontend to start bidding process
    '''
    own_by_user: bool = hostname in app.state.user_owned_hostnames
    own_by_ai: bool = app.state.agent.owns_hostname(hostname)
    return {
        "owned_by_user": own_by_user,
        "owned_by_ai": own_by_ai
    }

@app.post("/fold")
async def fold(user: bool, hostname: str, winning_bid: int):
    '''
    rewards hostname to winner
    '''
    if user:
        app.state.user_budget -= winning_bid
        app.state.user_owned_hostnames.add(hostname)
    else:
        # AI wins
        app.state.agent.update_budget(winning_bid)
        app.state.agent.add_hostname(hostname)
    return {"message": "Fold processed"}

@app.post("/bid")
async def process_user_bid(user_bid: int):
    '''
    Simulates one round of the bidding process. 
    Calls query_agent_bid to get the agent's bid.
    '''
    pass


async def query_agent_bid( user_bid: int,user_owned_hostnames: list):
    '''
    returns agent bid or -1 if agent decides to fold.
    '''

    return app.state.agent.bid(user_bid, app.state.user_owned_hostnames)
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
