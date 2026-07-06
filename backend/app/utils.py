from bson import ObjectId


def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return doc
    result = {**doc}
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    return result


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid id")
    return ObjectId(value)
