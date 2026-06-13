from pydantic import BaseModel


class ReviewSpot(BaseModel):
    spotId: str
    name: str
    imageUrl: str | None
    reviewRating: float
    totalReviews: int
    totalPhotos: int


class ReviewSpotsResponse(BaseModel):
    reviewSpots: list[ReviewSpot]
