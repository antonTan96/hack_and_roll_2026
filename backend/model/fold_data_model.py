from pydantic import BaseModel

class FoldData(BaseModel):
    user: bool
    hostname: str
    winning_bid: int