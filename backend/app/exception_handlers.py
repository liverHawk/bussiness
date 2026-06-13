from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.schemas.errors import ErrorBody, ErrorDetail, ErrorResponse

_FIELD_MESSAGES: dict[str, str] = {
    "loginId": "メールアドレスは必須です",
    "email": "メールアドレスの形式が正しくありません",
    "pwd_hash": "パスワードは必須です",
    "name": "名前は必須です",
}


def _field_name(loc: tuple[str | int, ...]) -> str:
    for part in reversed(loc):
        if isinstance(part, str) and part not in ("body", "query", "path"):
            return part
    return "body"


def _message_for_field(field: str, default: str) -> str:
    if field in _FIELD_MESSAGES:
        return _FIELD_MESSAGES[field]
    if "メール" in default or "email" in default.lower():
        return _FIELD_MESSAGES["email"]
    return default


def _build_validation_error(exc: RequestValidationError | ValidationError) -> ErrorResponse:
    details: list[ErrorDetail] = []
    for err in exc.errors():
        field = _field_name(tuple(err.get("loc", ())))
        raw_msg = err.get("msg", "入力内容に誤りがあります")
        if raw_msg.startswith("Value error, "):
            raw_msg = raw_msg.removeprefix("Value error, ")
        details.append(
            ErrorDetail(field=field, message=_message_for_field(field, raw_msg))
        )
    return ErrorResponse(
        error=ErrorBody(
            code="VALIDATION_ERROR",
            message="入力内容に誤りがあります",
            details=details,
        )
    )


async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    payload = _build_validation_error(exc)
    return JSONResponse(status_code=400, content=payload.model_dump())


async def http_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    from fastapi import HTTPException

    if not isinstance(exc, HTTPException):
        raise exc

    # detail が既に仕様形式の dict の場合はそのまま返す
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorBody(
                code="ERROR",
                message=str(exc.detail),
            )
        ).model_dump(),
    )
