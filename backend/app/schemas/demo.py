from pydantic import BaseModel


class DemoResetRead(BaseModel):
    leads: int
    discussions: int
