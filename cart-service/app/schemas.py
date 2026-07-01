from pydantic import BaseModel, Field


class CartItem(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class CartResponse(BaseModel):
    items: list[CartItem]
    total_items: int


def build_cart_response(items: list[dict]) -> CartResponse:
    parsed_items = [CartItem.model_validate(item) for item in items]
    return CartResponse(
        items=parsed_items,
        total_items=sum(item.quantity for item in parsed_items),
    )

