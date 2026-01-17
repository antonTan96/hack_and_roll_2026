class Agent:
    def __init__(self, budget: int, owned_hostnames: list):
        self.budget = budget
        self.limit = min(100, budget)  # Example limit calculation
    
    def bid(self, user_bid: int, user_owned_hostnames: list) -> int:
        # if user owns less than 5 hostnames, bid on lower limit
        # Simple strategy: bid 10% higher than user bid if budget allows, else fold
        proposed_bid = int(user_bid * 1.1)
        if len(user_owned_hostnames) < 5:
            proposed_bid = min(proposed_bid, 50)  # Cap bid if user owns less than 5 hostnames
        if proposed_bid <= self.limit:
            return proposed_bid
        else:
            return -1  # Fold
    
    def update_budget(self, amount: int):
        self.budget -= amount
