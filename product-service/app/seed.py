from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product

SEED_PRODUCTS = [
    {
        "name": "DevOps T-Shirt",
        "description": "A comfortable shirt for long deployment days.",
        "price": Decimal("24.99"),
        "stock": 30,
        "category": "clothing",
    },
    {
        "name": "Kubernetes Hoodie",
        "description": "A warm hoodie with a tiny cluster on the front.",
        "price": Decimal("49.99"),
        "stock": 18,
        "category": "clothing",
    },
    {
        "name": "Cloud Native Mug",
        "description": "For coffee, tea, and watching build logs.",
        "price": Decimal("14.50"),
        "stock": 40,
        "category": "home",
    },
    {
        "name": "Terraform Notebook",
        "description": "Paper infrastructure for plans that are not yet code.",
        "price": Decimal("9.99"),
        "stock": 50,
        "category": "stationery",
    },
    {
        "name": "Mechanical Keyboard",
        "description": "A compact keyboard for satisfyingly loud automation.",
        "price": Decimal("89.00"),
        "stock": 12,
        "category": "electronics",
    },
    {
        "name": "Observability Sticker Pack",
        "description": "Metrics, logs, traces, and one suspiciously calm mascot.",
        "price": Decimal("5.00"),
        "stock": 100,
        "category": "accessories",
    },
]


def seed_products(session: Session) -> bool:
    existing_product = session.scalar(select(Product.id).limit(1))
    if existing_product is not None:
        return False

    session.add_all(Product(**data) for data in SEED_PRODUCTS)
    session.commit()
    return True

