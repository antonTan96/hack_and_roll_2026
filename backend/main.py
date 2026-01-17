from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from model.fold_data_model import FoldData
from model.user_bid_data_model import UserBidData
from bidding_agent import Agent
from bidding import Bidding

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
app.state.transaction_history = []
app.state.user_budget = 1000
app.state.current_bid_session = None


@app.get("/")
async def root():
    return {"message": "Welcome to the API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/query_data/{hostname}")
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
async def fold(data: FoldData):
    '''
    rewards hostname to winner
    '''
    user = data.user
    hostname = data.hostname
    winning_bid = data.winning_bid
    if user:
        app.state.user_budget -= winning_bid
        app.state.user_owned_hostnames.add(hostname)
    else:
        # AI wins
        app.state.agent.update_budget(winning_bid)
        app.state.agent.add_hostname(hostname)
    app.state.transaction_history.append({
        "hostname": hostname,
        "winner": "user" if user else "ai",
        "winning_bid": winning_bid
    })
    return {"message": "Fold processed"}


@app.post("/start_bid/{hostname}")
async def start_bid(hostname: str):
    """
    Starts a bid
    
    :param hostname: hostname to bid
    :type hostname: str
    """
    app.state.current_bid_session = Bidding(hostname)


@app.post("/bid")
async def process_user_bid(data: UserBidData):
    '''
    Simulates one round of the bidding process. 
    Calls query_agent_bid to get the agent's bid.
    '''
    if app.state.current_bid_session is None:
        return {"message": "There are no bidding running now, please try again later"}
    
    app.state.current_bid_session.update_bid("user", data.user_bid)
    agent_bid = query_agent_bid(data)
    app.state.current_bid_session.update_bid("agent", agent_bid)

    response = {
        "message": "A bid has done",
        "current_highest_bidder": app.state.current_bid_session.current_bidder,
        "current_highest_bid": app.state.current_bid_session.current_bid
    }

    return response


@app.post("/restart")
async def restart():
    app.state.agent = Agent(budget=1000, owned_hostnames=set())
    app.state.user_owned_hostnames = set()
    app.state.user_budget = 1000
    return {"message": "Game restarted"}


async def query_agent_bid(data: UserBidData) -> int:
    '''
    returns agent bid or -1 if agent decides to fold.
    '''
    user_bid = data.user_bid   
    return app.state.agent.bid(user_bid, app.state.user_owned_hostnames)
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
