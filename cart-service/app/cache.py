import json
import os

from redis import Redis
from redis.exceptions import RedisError


class CartStorageUnavailable(Exception):
    pass


class CartStore:
    def __init__(self, client: Redis):
        self.client = client

    @staticmethod
    def key(user_id: int) -> str:
        return f"cart:{user_id}"

    def get_cart(self, user_id: int) -> list[dict]:
        try:
            value = self.client.get(self.key(user_id))
            if value is None:
                return []

            items = json.loads(value)
            if not isinstance(items, list):
                raise ValueError("Cart value must be a list")
            return items
        except (RedisError, json.JSONDecodeError, TypeError, ValueError) as error:
            raise CartStorageUnavailable("Cart storage is unavailable") from error

    def set_item(self, user_id: int, product_id: int, quantity: int) -> list[dict]:
        items = self.get_cart(user_id)
        updated = False

        for item in items:
            if item.get("product_id") == product_id:
                item["quantity"] = quantity
                updated = True
                break

        if not updated:
            items.append({"product_id": product_id, "quantity": quantity})

        items.sort(key=lambda item: item["product_id"])
        self._save(user_id, items)
        return items

    def remove_item(self, user_id: int, product_id: int) -> None:
        items = [
            item
            for item in self.get_cart(user_id)
            if item.get("product_id") != product_id
        ]

        try:
            if items:
                self.client.set(self.key(user_id), json.dumps(items))
            else:
                self.client.delete(self.key(user_id))
        except RedisError as error:
            raise CartStorageUnavailable("Cart storage is unavailable") from error

    def _save(self, user_id: int, items: list[dict]) -> None:
        try:
            self.client.set(self.key(user_id), json.dumps(items))
        except RedisError as error:
            raise CartStorageUnavailable("Cart storage is unavailable") from error

    def close(self) -> None:
        self.client.close()


_store: CartStore | None = None


def get_cart_store() -> CartStore:
    global _store

    if _store is None:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            raise CartStorageUnavailable("REDIS_URL is required")

        client = Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        _store = CartStore(client)

    return _store


def close_cart_store() -> None:
    global _store

    if _store is not None:
        _store.close()
        _store = None

