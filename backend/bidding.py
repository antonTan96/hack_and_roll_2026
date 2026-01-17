"""
Bidding class for storing current bid details
"""

class Bidding:
    def __init__(self, hostname: str, starting_bid: int = 100, increment: int = 10):
        self.hostname = hostname
        self.starting_bid = starting_bid
        self.increment = increment
        self.current_bidder = ""
        self.current_bid = 0

    def update_bid(self, bidder: str, bid: int) -> bool:
        """
        Updates the bidding if the amount is valid 

        :param bidder: Description
        :type bidder: str
        :param bid: Description
        :type bid: int
        :return: True if bid has changed, otherwise False
        :rtype: bool
        """
        if bid <= max(self.starting_bid, self.current_bid) + self.increment:
            return False
        
        self.current_bid = bid
        self.current_bidder = bidder

        return True
    
    def retrieve_bid(self) -> tuple[str, int]:
        """
        Returns the highest bid
        
        :return: The highest bidder and amount
        :rtype: tuple[str, int]
        """
        return (self.current_bidder, self.current_bid)

