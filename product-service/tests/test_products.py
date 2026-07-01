import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from redis.exceptions import ConnectionError

from app.cache import CatalogCache, get_cache
from app.db import get_db
from app.main import create_app
from app.models import Base
from app.seed import SEED_PRODUCTS, seed_products


class MemoryCache:
    def __init__(self):
        self.values = {}

    def get(self, key):
        value = self.values.get(key)
        return json.loads(json.dumps(value)) if value is not None else None

    def set(self, key, value):
        self.values[key] = json.loads(json.dumps(value))


class UnavailableRedis:
    def get(self, key):
        raise ConnectionError("Redis unavailable")

    def setex(self, key, ttl, value):
        raise ConnectionError("Redis unavailable")


@pytest.fixture()
def service():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
    )
    Base.metadata.create_all(engine)

    with session_factory() as session:
        seed_products(session)

    cache = MemoryCache()
    application = create_app(initialize_on_startup=False)

    def override_database():
        with session_factory() as session:
            yield session

    application.dependency_overrides[get_db] = override_database
    application.dependency_overrides[get_cache] = lambda: cache

    with TestClient(application) as client:
        yield {
            "cache": cache,
            "client": client,
            "engine": engine,
            "session_factory": session_factory,
        }

    engine.dispose()


def test_health(service):
    response = service["client"].get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_lists_seeded_products(service):
    response = service["client"].get("/products")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == len(SEED_PRODUCTS)
    assert len(body["items"]) == len(SEED_PRODUCTS)
    assert isinstance(body["items"][0]["price"], float)


def test_searches_name_and_description_case_insensitively(service):
    name_match = service["client"].get("/products", params={"search": "shirt"})
    description_match = service["client"].get(
        "/products", params={"search": "BUILD LOGS"}
    )

    assert name_match.status_code == 200
    assert [item["name"] for item in name_match.json()["items"]] == [
        "DevOps T-Shirt"
    ]
    assert description_match.status_code == 200
    assert [item["name"] for item in description_match.json()["items"]] == [
        "Cloud Native Mug"
    ]


def test_filters_category_case_insensitively(service):
    response = service["client"].get(
        "/products", params={"category": "CLOTHING"}
    )

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert {
        item["category"] for item in response.json()["items"]
    } == {"clothing"}


def test_returns_product_detail_and_not_found_error(service):
    found = service["client"].get("/products/1")
    missing = service["client"].get("/products/999")

    assert found.status_code == 200
    assert found.json()["name"] == "DevOps T-Shirt"
    assert missing.status_code == 404
    assert missing.json() == {"error": "Product not found"}


def test_invalid_product_id_uses_standard_error_shape(service):
    response = service["client"].get("/products/0")

    assert response.status_code == 400
    assert response.json() == {"error": "Invalid request"}


def test_second_identical_list_read_uses_cache(service):
    select_count = 0

    def count_selects(conn, cursor, statement, parameters, context, executemany):
        nonlocal select_count
        if statement.lstrip().upper().startswith("SELECT"):
            select_count += 1

    event.listen(service["engine"], "before_cursor_execute", count_selects)
    try:
        first = service["client"].get("/products", params={"search": "devops"})
        count_after_first = select_count
        second = service["client"].get("/products", params={"search": "devops"})
    finally:
        event.remove(service["engine"], "before_cursor_execute", count_selects)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == first.json()
    assert count_after_first == 1
    assert select_count == count_after_first


def test_second_identical_detail_read_uses_cache(service):
    select_count = 0

    def count_selects(conn, cursor, statement, parameters, context, executemany):
        nonlocal select_count
        if statement.lstrip().upper().startswith("SELECT"):
            select_count += 1

    event.listen(service["engine"], "before_cursor_execute", count_selects)
    try:
        first = service["client"].get("/products/2")
        count_after_first = select_count
        second = service["client"].get("/products/2")
    finally:
        event.remove(service["engine"], "before_cursor_execute", count_selects)

    assert first.status_code == 200
    assert second.json() == first.json()
    assert count_after_first == 1
    assert select_count == count_after_first


def test_redis_outage_is_treated_as_a_cache_miss():
    cache = CatalogCache(UnavailableRedis())

    assert cache.get("product:1") is None
    cache.set("product:1", {"id": 1})
