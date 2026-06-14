from datetime import datetime

from pydantic import BaseModel, field_validator


class Location(BaseModel):
    latitude: float
    longitude: float


class RouteGenerateRequest(BaseModel):
    startLocation: Location
    destinations: list[Location]
    specifiedDateTime: datetime
    timeType: str  # "departure" | "arrival"

    @field_validator("destinations")
    @classmethod
    def max_destinations(cls, v: list) -> list:
        if len(v) > 5:
            raise ValueError("一度に指定できる目的地は5箇所までです")
        return v


class TimelineEntry(BaseModel):
    sequence: int
    locationName: str
    actionLabel: str
    estimatedHour: int
    estimatedMinute: int
    crowd: float | None
    latitude: float
    longitude: float


class RouteGenerateResponse(BaseModel):
    routeId: str
    totalDuration: int    # 分
    totalDistance: float  # km
    timeline: list[TimelineEntry]
    path: list[list[float]]  # [[lat, lon], ...] ルートのジオメトリ


class DaySummaryEntry(BaseModel):
    day: int
    label: str
    spots: list[str]


class SavedRoute(BaseModel):
    routeId: str
    title: str
    totalDays: int
    createdAt: str
    daysSummary: list[DaySummaryEntry]


class SavedRoutesResponse(BaseModel):
    savedRoutes: list[SavedRoute]
