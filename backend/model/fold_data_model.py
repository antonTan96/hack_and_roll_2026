from pydantic import BaseModel

class FoldData(BaseModel):
    user: bool #user wins the bid
    hostname: str
    winning_bid: int