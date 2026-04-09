# --- Goalie Code Fix: data-leakage-detection ---

# Leakage-safe train/test split with feature pipeline
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

TARGET = "target"

X = df.drop(columns=[TARGET])
y = df[TARGET]

numeric = X.select_dtypes(include=["number"]).columns.tolist()

preprocess = ColumnTransformer(
    [
        ("num", StandardScaler(), numeric),
    ],
    remainder="drop",
)

clf = Pipeline(
    steps=[
        ("preprocess", preprocess),
        ("model", LogisticRegression(max_iter=1000)),
    ],
)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    stratify=y,
    random_state=42,
)

clf.fit(X_train, y_train)

