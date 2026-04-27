"""
CrisisFlow — database connection & collection helpers.
Motor (async PyMongo) is used for all DB operations.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL    = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME  = os.getenv("DATABASE_NAME", "crisisflow")

client: AsyncIOMotorClient = None


def get_client() -> AsyncIOMotorClient:
    return client


def get_database():
    return client[DATABASE_NAME]


# Collection helpers
def get_users_collection():
    return get_database()["users"]


def get_resources_collection():
    return get_database()["resources"]


def get_requests_collection():
    return get_database()["requests"]


async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGODB_URL)
    # Create indexes for geo-queries
    db = get_database()
    await db["resources"].create_index("status")
    await db["resources"].create_index("expiry_timestamp")
    await db["requests"].create_index("timestamp")
    await db["requests"].create_index("status")
    print(f"[OK] Connected to MongoDB at {MONGODB_URL} / {DATABASE_NAME}")


async def close_db():
    global client
    if client:
        client.close()
        print("[--] MongoDB connection closed.")
