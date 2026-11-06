# Payment Fraud Detection

A machine learning-based payment fraud detection application built with
**Python, Scikit-learn, FastAPI, HTML, CSS, and JavaScript**. It uses
the **PaySim synthetic financial transaction dataset** to classify
transactions as potentially fraudulent or legitimate.

The application includes a trained Random Forest pipeline, a REST API
for predictions, and an interactive frontend for entering transaction
details and viewing model predictions.

> **Disclaimer:** This is an educational portfolio project built with
> synthetic data. It is not a production banking or payment security
> system and must not be used to make real financial decisions.

## Features

-   Exploratory data analysis of the PaySim transaction dataset.
-   Binary classification of transactions (`isFraud`).
-   Random Forest model with preprocessing included in a Scikit-learn
    pipeline.
-   FastAPI endpoint for transaction predictions.
-   Interactive frontend with sample transaction scenarios.
-   Fraud probability returned by the model.
-   Transaction inputs for transaction type, amount, time step, and
    sender/recipient balances.

## Tech Stack

  Area                Tools
  ------------------- -----------------------
  Language            Python
  Data analysis       Pandas, NumPy
  Visualization       Matplotlib, Seaborn
  Machine learning    Scikit-learn
  Model persistence   Joblib
  Backend API         FastAPI, Uvicorn
  Frontend            HTML, CSS, JavaScript
  Dataset             PaySim (Kaggle)

## Dataset

The project uses the PaySim dataset:

[Kaggle: Synthetic Financial Datasets for Fraud
Detection](https://www.kaggle.com/datasets/ealaxi/paysim1)

The dataset contains simulated mobile-money transactions. It is
synthetic, so patterns learned from it should not be assumed to
represent real banking or UPI transactions.

The raw dataset is not included in this repository because of its size.
Download it from Kaggle and place it in the project's `dataset/`
directory if you want to reproduce the notebook analysis.

## Project Structure

``` text
payment-fraud-detection-ml/
├── dataset/                         # Local dataset; excluded from Git
├── notebooks/
│   └── 01_Fraud_Detection.ipynb     # EDA, preprocessing and model experiments
├── models/
│   └── fraud_detection_model.pkl    # Saved trained pipeline
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── app.py                           # FastAPI application
├── requirements.txt
├── .gitignore
└── README.md
```

Update this structure if your actual filenames or folders differ.

## Model Development

The task is a binary classification problem:

-   `0`: Legitimate transaction
-   `1`: Fraudulent transaction

The target column is `isFraud`. The existing `isFlaggedFraud` column and
raw account identifiers (`nameOrig`, `nameDest`) were excluded from the
initial model inputs.

The selected model inputs are:

-   `step`
-   `type`
-   `amount`
-   `oldbalanceOrg`
-   `newbalanceOrig`
-   `oldbalanceDest`
-   `newbalanceDest`

A chronological split was used to train on earlier transactions and
evaluate on a later time period. The Random Forest experiment was
trained on a 500,000-row sample from the training period.

### Random Forest evaluation

Results on the held-out test period:

  Metric               Result
  ----------------- ---------
  Fraud precision     100.00%
  Fraud recall         68.62%
  Fraud F1-score       81.39%
  False positives           0
  False negatives         519

These are results from this particular test split, not a guarantee of
future performance. The model missed 519 fraud cases in the test set.
The test period also had a higher fraud rate than the training period,
indicating a distribution shift.

The Logistic Regression experiment and its results are documented in the
notebook.

## Run Locally

### 1. Clone the repository

``` bash
git clone https://github.com/YOUR_USERNAME/payment-fraud-detection-ml.git
cd payment-fraud-detection-ml
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Create and activate a virtual environment

**Windows PowerShell:**

``` powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

``` bash
pip install -r requirements.txt
```

If you do not have a `requirements.txt` yet, install the packages used
by the application:

``` bash
pip install fastapi "uvicorn[standard]" scikit-learn pandas numpy joblib
```

Use the same Scikit-learn version used to train and save the model
whenever possible. Scikit-learn does not guarantee compatibility when
loading persisted models across different versions.

### 4. Check the model path

Make sure the saved model exists at:

``` text
models/fraud_detection_model.pkl
```

The path used in `app.py` must match your actual folder structure.
Prefer a path resolved relative to `app.py` so the application does not
depend on the terminal's current working directory.

### 5. Start the FastAPI server

From the project root:

``` bash
python -m uvicorn app:app --reload
```

Open the interactive API documentation:

`http://127.0.0.1:8000/docs`

The prediction endpoint used by the frontend is:

`POST /predict`

### 6. Open the frontend

Open `frontend/index.html` with VS Code Live Server or another local
static web server.

For local development, the API URL in `frontend/script.js` should point
to:

``` javascript
const API_URL = "http://127.0.0.1:8000/predict";
```

The FastAPI application must allow requests from the frontend origin
through CORS. For deployment, restrict allowed origins to the actual
frontend domain rather than allowing every origin.

## Deployment

The frontend and backend can be deployed separately:

-   **Backend:** a Python-compatible hosting service such as Render.
-   **Frontend:** a static hosting service such as Vercel or Netlify.

After deploying the backend:

1.  Copy its public base URL.
2.  Update `API_URL` in `frontend/script.js` to the deployed `/predict`
    endpoint.
3.  Configure FastAPI CORS to allow the deployed frontend's exact
    origin.
4.  Deploy the frontend.
5.  Test the public application with both sample scenarios and manually
    entered values.

Do not put API secrets or private credentials in frontend JavaScript.

## Important Limitations

-   PaySim is synthetic data, not real financial transaction data.
-   The dataset is highly imbalanced, so accuracy alone is not a useful
    measure of model quality.
-   The Random Forest model was trained on a 500,000-row sample, not the
    full training set.
-   The held-out test period had a higher fraud rate than the training
    period.
-   The model's probability output should not be treated as a calibrated
    real-world fraud risk without further validation.
-   A transaction that empties a sender's account is not automatically
    fraudulent.
-   The application is a demonstration of an end-to-end machine learning
    workflow, not a production fraud prevention system.

## Future Improvements

-   Evaluate the model on additional time-based test periods.
-   Investigate probability calibration and decision-threshold selection
    using a separate validation set.
-   Monitor model performance under changing transaction patterns.
-   Add authentication, rate limiting, logging, and production-grade
    error handling before any real deployment.

## Author

**Piyush**
