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

# response = interfaze.invoke(
#     "Get the company description of JigsawStack from their linkedin page"
# )

# print(response.content)
class LLM_Bidding_Agent(Agent):
    def __init__(self, budget: int, owned_hostnames: set, llm_model=interfaze):
        super().__init__(budget, owned_hostnames)
        self.llm_model = llm_model  # Placeholder for LLM model instance
        self.website_descriptions = {}
    
    def add_website_descriptions(self, hostname:str):
        prompt = f"Give a short description of this website that has the hostname:{hostname}"
        response = self.llm_model.invoke(prompt)
        self.website_descriptions[hostname] = response.text
        print(f"Added description for {hostname}: {response.text}")

    def bid(self, user_bid: int, user_owned_hostnames: list) -> int:
        # Implement a more sophisticated bidding strategy using the LLM
        # For example, generate a prompt based on the current state and get a bid suggestion from the LLM
        prompt = f'''
        You are an intelligent bidding agent against a user trying to use the internet.
        Your goal is to acquire as many hostnames as possible within your budget.
        You have to at least bid 10 points more than the user bid.
        The current situation is as follows:
        User bid: {user_bid}, 
        User owned hostnames: {user_owned_hostnames}, 
        Your budget: {self.budget}, 
        Your owned hostnames: {self.owned_hostnames}. 
        The descriptions of some hostnames that have been previously bid are as follows: {self.website_descriptions}.
        You may use this information to inform your bidding strategy, which may involve deciphering user intent.
        Based on this information,
        Suggest a bid and your reasoning behind it. 
        Your bid should be at the end of the response, with the following format:
        #### "your bid"
        Set "your bid" to -1 if you want to fold.
        '''
        
        # Placeholder for LLM response
        # llm_response = self.llm_model.generate_bid(prompt)  # This method should be defined in the LLM model
        
        llm_response = self.llm_model.invoke(prompt)
        reasoning = llm_response.text
        print("LLM Reasoning:", reasoning)
        try:
            proposed_bid = int(llm_response.text.split("####")[-1].strip())
        
        except Exception as e:
            print(e)
            return -1 
        
        return proposed_bid