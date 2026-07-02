from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from bson import ObjectId
import shutil
import os
import uuid

app = FastAPI()

# Dossier pour stocker les photos uploadées
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Rendre le dossier uploads accessible dans le navigateur
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connexion MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["testdb"]
collection = db["users"]

def user_serializer(user) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "photo": user.get("photo", ""),
        "description": user.get("description", ""),
        "created_at": user.get("created_at", "")
    }

def save_photo(photo: UploadFile):
    if not photo:
        return ""

    file_extension = os.path.splitext(photo.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    return f"http://127.0.0.1:8000/uploads/{unique_filename}"

@app.get("/users")
def get_users():
    users = list(collection.find())
    return [user_serializer(u) for u in users]

@app.post("/users")
async def create_user(
    name: str = Form(...),
    email: str = Form(...),
    description: str = Form(""),
    photo: UploadFile = File(None)
):
    photo_url = save_photo(photo)

    user_data = {
        "name": name,
        "email": email,
        "description": description,
        "photo": photo_url,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    result = collection.insert_one(user_data)
    new_user = collection.find_one({"_id": result.inserted_id})
    return user_serializer(new_user)

@app.put("/users/{user_id}")
async def update_user(
    user_id: str,
    name: str = Form(...),
    email: str = Form(...),
    description: str = Form(""),
    photo: UploadFile = File(None)
):
    try:
        user_data = {
            "name": name,
            "email": email,
            "description": description
        }

        if photo:
            user_data["photo"] = save_photo(photo)

        result = collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": user_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        updated_user = collection.find_one({"_id": ObjectId(user_id)})
        return user_serializer(updated_user)

    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@app.delete("/users/{user_id}")
def delete_user(user_id: str):
    try:
        result = collection.delete_one({"_id": ObjectId(user_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "User deleted"}

    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")