import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Path, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.cache import (
    CatalogCache,
    close_cache,
    get_cache,
    product_cache_key,
    product_list_cache_key,
)
from app.db import (
    close_database,
    get_db,
    get_session_factory,
    init_database,
)
from app.models import Product
from app.schemas import ProductListResponse, ProductResponse
from app.seed import seed_products

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    with get_session_factory()() as session:
        seed_products(session)

    try:
        yield
    finally:
        close_cache()
        close_database()


def create_app(initialize_on_startup: bool = True) -> FastAPI:
    service = FastAPI(
        title="MicroShop product-service",
        version="1.0.0",
        lifespan=lifespan if initialize_on_startup else None,
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
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid request"},
        )

    @service.exception_handler(Exception)
    async def unexpected_exception_handler(
        request: Request, error: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled product-service error", exc_info=error)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )

    @service.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @service.get("/products", response_model=ProductListResponse)
    def list_products(
        database: Annotated[Session, Depends(get_db)],
        cache: Annotated[CatalogCache, Depends(get_cache)],
        search: Annotated[str | None, Query(max_length=200)] = None,
        category: Annotated[str | None, Query(max_length=100)] = None,
    ) -> ProductListResponse | dict:
        search_value = search.strip() if search and search.strip() else None
        category_value = category.strip() if category and category.strip() else None
        cache_key = product_list_cache_key(search_value, category_value)

        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        statement = select(Product)
        if search_value:
            pattern = f"%{search_value}%"
            statement = statement.where(
                or_(
                    Product.name.ilike(pattern),
                    Product.description.ilike(pattern),
                )
            )
        if category_value:
            statement = statement.where(
                func.lower(Product.category) == category_value.lower()
            )

        products = list(database.scalars(statement.order_by(Product.id)).all())
        response = ProductListResponse(items=products, total=len(products))
        cache.set(cache_key, response.model_dump(mode="json"))
        return response

    @service.get("/products/{product_id}", response_model=ProductResponse)
    def get_product(
        product_id: Annotated[int, Path(gt=0)],
        database: Annotated[Session, Depends(get_db)],
        cache: Annotated[CatalogCache, Depends(get_cache)],
    ) -> ProductResponse | dict:
        cache_key = product_cache_key(product_id)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        product = database.get(Product, product_id)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")

        response = ProductResponse.model_validate(product)
        cache.set(cache_key, response.model_dump(mode="json"))
        return response

    return service


app = create_app()

