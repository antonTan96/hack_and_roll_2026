from pydantic import BaseModel

class UserBidData(BaseModel):
    user_bid: int