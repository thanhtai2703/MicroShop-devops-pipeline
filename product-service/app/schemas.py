from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_serializer


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    price: Decimal
    stock: int
    category: str

    @field_serializer("price")
    def serialize_price(self, price: Decimal) -> float:
        return float(price)


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int

