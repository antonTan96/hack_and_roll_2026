from bidding_agent import Agent
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

load_dotenv()
interfaze = ChatOpenAI(
    base_url="https://api.interfaze.ai/v1",
    model="interfaze-beta",
    api_key=os.getenv("OPENAI_API_KEY"),
)

class LLM_Bidding_Agent_v2(Agent):
    def __init__(self, budget: int, owned_hostnames: set, llm_model=interfaze):
        super().__init__(budget, owned_hostnames)
        self.llm_model = llm_model  # Placeholder for LLM model instance
        self.website_descriptions = {}
        self.current_hostname = None
        self.bid_history = {}
    
    def add_website_descriptions(self, hostname:str):
        prompt = f"Give a short description of this website that has the hostname:{hostname}"
        self.current_hostname = hostname
        response = self.llm_model.invoke(prompt)
        self.website_descriptions[hostname] = response.text
        print(f"Added description for {hostname}: {response.text}")
        price_estimation_prompt = f'''
        Based on the description: {response.text}, 
        provide an estimated market value for the website with hostname: {hostname}.
        leave your answer as a single integer number only.
        '''
        price_response = self.llm_model.invoke(price_estimation_prompt)
        try:
            estimated_price = int(price_response.text.strip())
        except ValueError:
            estimated_price = 50  # default fallback price
        self.limit = min(self.budget, estimated_price)


    def bid(self, user_bid: int, user_owned_hostnames: list) -> int:
        self.bid_history[self.current_hostname] = user_bid
        proposed_bid = user_bid + 10  # Must bid at least 10 more than user
        if proposed_bid > self.limit:
            return -1  # fold if user bid exceeds our limit
        return proposed_bid