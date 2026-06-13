from pydantic import BaseModel


class SpotResponse(BaseModel):
    spotId: str
    name: str
    category: str
    latitude: float
    longitude: float
    congestionStatus: str
    reviewRating: float


class SpotSearchResponse(BaseModel):
    spots: list[SpotResponse]
