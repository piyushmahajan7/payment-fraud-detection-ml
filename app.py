
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

# Initialize FastAPI
app = FastAPI(
    title="Payment Fraud Detection API",
    description="ML API for detecting fraudulent transactions",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # fine for local testing; restrict this in production
    allow_methods=["*"],
    allow_headers=["*"],
) 

# Load trained ML pipeline
model = joblib.load("models/fraud_detection_model.pkl")


# Define input data structure
class Transaction(BaseModel):
    step: int
    type: str
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float


# Home endpoint
@app.get("/")
def home():
    return {"message": "Payment Fraud Detection API is running"}


# Health check endpoint
@app.get("/health")
def health():
    return {"status": "healthy"}


# Prediction endpoint
@app.post("/predict")
def predict_fraud(transaction: Transaction):

    # Convert input into DataFrame
    input_data = pd.DataFrame([transaction.model_dump()])

    # Make prediction
    prediction = model.predict(input_data)[0]

    # Get fraud probability
    probability = model.predict_proba(input_data)[0][1]

    # Return response
    return {
        "prediction": int(prediction),
        "result": "Fraudulent" if prediction == 1 else "Legitimate",
        "fraud_probability": round(float(probability), 4)
    }
