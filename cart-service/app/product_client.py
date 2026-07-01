import os

import httpx


class ProductNotFound(Exception):
    pass


class ProductServiceUnavailable(Exception):
    pass


def _timeout_seconds() -> float:
    try:
        return max(float(os.getenv("UPSTREAM_TIMEOUT_MS", "5000")) / 1000, 0.1)
    except ValueError:
        return 5.0


class ProductClient:
    def __init__(self, base_url: str, timeout: float):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def get_product(self, product_id: int) -> dict:
        try:
            response = httpx.get(
                f"{self.base_url}/products/{product_id}",
                timeout=self.timeout,
            )
        except httpx.RequestError as error:
            raise ProductServiceUnavailable(
                "Product service is unavailable"
            ) from error

        if response.status_code == 404:
            raise ProductNotFound("Product not found")
        if not response.is_success:
            raise ProductServiceUnavailable("Product service is unavailable")

        try:
            return response.json()
        except ValueError as error:
            raise ProductServiceUnavailable(
                "Product service returned an invalid response"
            ) from error


def get_product_client() -> ProductClient:
    base_url = os.getenv("PRODUCT_SERVICE_URL")
    if not base_url:
        raise ProductServiceUnavailable("PRODUCT_SERVICE_URL is required")

    return ProductClient(base_url, _timeout_seconds())

