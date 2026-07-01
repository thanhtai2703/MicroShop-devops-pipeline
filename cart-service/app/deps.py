from typing import Annotated

from fastapi import Header, HTTPException


def require_user_id(
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> int:
    try:
        user_id = int(x_user_id) if x_user_id is not None else 0
    except ValueError:
        user_id = 0

    if user_id <= 0:
        raise HTTPException(status_code=401, detail="Authentication required")

    return user_id

