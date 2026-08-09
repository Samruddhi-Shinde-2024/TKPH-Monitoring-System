# import pandas as pd
# from sklearn.model_selection import train_test_split
# from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
# import joblib

# # Load dataset
# df = pd.read_csv("synthetic_tkph_data.csv")

# # Define features and targets
# X = df[['TKPH']]

# y_reg = df[['Tire Wear (%)', 'Remaining Tire Life (Hours)', 'Fuel Consumption (L/h)']]
# y_class = df[['Tire Failure Risk', 'Maintenance Alert']]

# # Split the dataset
# X_train, X_test, y_train_reg, y_test_reg, y_train_class, y_test_class = train_test_split(
#     X, y_reg, y_class, test_size=0.2, random_state=42
# )

# # Train regression model
# reg_model = RandomForestRegressor(n_estimators=100, random_state=42)
# reg_model.fit(X_train, y_train_reg)

# # Train classification model
# class_model = RandomForestClassifier(n_estimators=100, random_state=42)
# class_model.fit(X_train, y_train_class)

# # Save models
# joblib.dump(reg_model, "regression_model.pkl", protocol=2)
# joblib.dump(class_model, "classification_model.pkl", protocol=2)



# print("Models trained and saved successfully!")

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import classification_report, mean_squared_error, mean_absolute_error, r2_score
import numpy as np

# Load dataset
df = pd.read_csv("synthetic_tkph_data.csv")

# Define features and targets
X = df[['TKPH']]

y_reg = df[['Tire Wear (%)', 'Remaining Tire Life (Hours)', 'Fuel Consumption (L/h)']]
y_class = df[['Tire Failure Risk', 'Maintenance Alert']]

# Split the dataset
X_train, X_test, y_train_reg, y_test_reg, y_train_class, y_test_class = train_test_split(
    X, y_reg, y_class, test_size=0.2, random_state=42
)

# Train regression model
reg_model = RandomForestRegressor(n_estimators=100, random_state=42)
reg_model.fit(X_train, y_train_reg)

# Train classification model
class_model = RandomForestClassifier(n_estimators=100, random_state=42)
class_model.fit(X_train, y_train_class)

# ---------------------
# Evaluation
# ---------------------

# Predict with regression model
y_pred_reg = reg_model.predict(X_test)

# Predict with classification model
y_pred_class = class_model.predict(X_test)

# Evaluate regression model
print("\n--- Regression Model Evaluation ---")
print("MAE:", mean_absolute_error(y_test_reg, y_pred_reg))
print("MSE:", mean_squared_error(y_test_reg, y_pred_reg))
print("RMSE:", np.sqrt(mean_squared_error(y_test_reg, y_pred_reg)))
print("R² Score:", r2_score(y_test_reg, y_pred_reg))

# Evaluate classification model
print("\n--- Classification Model Report ---")
for i, col in enumerate(y_class.columns):
    print(f"\nClassification Report for '{col}':")
    print(classification_report(y_test_class[col], y_pred_class[:, i]))

print("\nModel training and evaluation completed successfully!")
