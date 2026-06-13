from pydantic import BaseModel


class UserMeResponse(BaseModel):
    userId: str
    username: str
    currentTotalCoins: int
