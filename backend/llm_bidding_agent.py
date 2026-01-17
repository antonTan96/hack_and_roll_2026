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

    def bid(self, user_bid: int, user_owned_hostnames: list) -> int:
        # Implement a more sophisticated bidding strategy using the LLM
        # For example, generate a prompt based on the current state and get a bid suggestion from the LLM
        prompt = f'''
        You are an intelligent bidding agent against a user trying to use the internet.
        Your goal is to acquire as many hostnames as possible within your budget.
        The current situation is as follows:
        User bid: {user_bid}, 
        User owned hostnames: {user_owned_hostnames}, 
        Your budget: {self.budget}, 
        Your owned hostnames: {self.owned_hostnames}. 
        Suggest a bid. Only respond with an integer bid amount or -1 to fold.
        '''
        
        # Placeholder for LLM response
        # llm_response = self.llm_model.generate_bid(prompt)  # This method should be defined in the LLM model
        
        llm_response = self.llm_model.invoke(prompt)
        proposed_bid = int(llm_response)
        
        if proposed_bid <= self.limit:
            return proposed_bid
        else:
            return -1  # Fold