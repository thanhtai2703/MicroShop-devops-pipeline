import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Path, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.cache import (
    CartStorageUnavailable,
    CartStore,
    close_cart_store,
    get_cart_store,
)
from app.deps import require_user_id
from app.product_client import (
    ProductClient,
    ProductNotFound,
    ProductServiceUnavailable,
    get_product_client,
)
from app.schemas import CartItem, CartResponse, build_cart_response

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        yield
    finally:
        close_cart_store()


def create_app() -> FastAPI:
    service = FastAPI(
        title="MicroShop cart-service",
        version="1.0.0",
        lifespan=lifespan,
    )

    @service.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, error: HTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"error": str(error.detail)},
        )

    @service.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"error": "Invalid request"})

    @service.exception_handler(ProductNotFound)
    async def product_not_found_handler(
        request: Request, error: ProductNotFound
    ) -> JSONResponse:
        return JSONResponse(status_code=404, content={"error": str(error)})

    @service.exception_handler(ProductServiceUnavailable)
    @service.exception_handler(CartStorageUnavailable)
    async def dependency_unavailable_handler(request: Request, error) -> JSONResponse:
        return JSONResponse(status_code=503, content={"error": str(error)})

    @service.exception_handler(Exception)
    async def unexpected_exception_handler(
        request: Request, error: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled cart-service error", exc_info=error)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )

    @service.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @service.get("/cart", response_model=CartResponse)
    def get_cart(
        user_id: Annotated[int, Depends(require_user_id)],
        store: Annotated[CartStore, Depends(get_cart_store)],
    ) -> CartResponse:
        return build_cart_response(store.get_cart(user_id))

    @service.post("/cart/items", response_model=CartResponse)
    def set_cart_item(
        item: CartItem,
        user_id: Annotated[int, Depends(require_user_id)],
        store: Annotated[CartStore, Depends(get_cart_store)],
        product_client: Annotated[ProductClient, Depends(get_product_client)],
    ) -> CartResponse:
        product_client.get_product(item.product_id)
        items = store.set_item(user_id, item.product_id, item.quantity)
        return build_cart_response(items)

    @service.delete("/cart/items/{product_id}", status_code=204)
    def remove_cart_item(
        product_id: Annotated[int, Path(gt=0)],
        user_id: Annotated[int, Depends(require_user_id)],
        store: Annotated[CartStore, Depends(get_cart_store)],
    ) -> Response:
        store.remove_item(user_id, product_id)
        return Response(status_code=204)

    return service


app = create_app()
