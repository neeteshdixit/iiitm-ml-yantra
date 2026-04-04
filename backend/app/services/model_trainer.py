"""
Model Trainer Service
Handles ML model training, evaluation, and metrics calculation
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.svm import SVC, SVR
from xgboost import XGBRegressor
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    r2_score,
    mean_absolute_error,
    mean_squared_error,
    mean_absolute_percentage_error,
    log_loss,
    roc_auc_score
)
import time
import uuid
from typing import Dict, List, Tuple, Any, Optional

# Algorithm definitions
CLASSIFICATION_ALGORITHMS = {
    'logistic_regression': lambda: LogisticRegression(max_iter=1000, random_state=42),
    'random_forest': lambda: RandomForestClassifier(n_estimators=100, random_state=42),
    'decision_tree': lambda: DecisionTreeClassifier(random_state=42),
    'svm': lambda: SVC(kernel='rbf', random_state=42, probability=True)
}

REGRESSION_ALGORITHMS = {
    'linear_regression': lambda: LinearRegression(),
    'random_forest': lambda: RandomForestRegressor(n_estimators=100, random_state=42),
    'decision_tree': lambda: DecisionTreeRegressor(random_state=42),
    'svr': lambda: SVR(kernel='rbf'),
    'xgboost': lambda: XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
}

ALGORITHM_NAMES = {
    'logistic_regression': 'Logistic Regression',
    'random_forest': 'Random Forest',
    'decision_tree': 'Decision Tree',
    'svm': 'Support Vector Machine',
    'linear_regression': 'Linear Regression',
    'svr': 'Support Vector Regression',
    'xgboost': 'XGBoost'
}


class ModelTrainer:
    """Service for training and evaluating ML models"""
    
    def __init__(self):
        self.scalers = {}
    
    def train_models(
        self,
        df: pd.DataFrame,
        features: List[str],
        target: str,
        problem_type: str,
        algorithms: List[str],
        train_test_split_ratio: float = 0.8,
        scaling: bool = True
    ) -> Dict[str, Any]:
        """
        Train multiple ML models and evaluate them
        
        Args:
            df: Input dataframe
            features: List of feature column names
            target: Target column name
            problem_type: 'classification' or 'regression'
            algorithms: List of algorithm IDs to train
            train_test_split_ratio: Ratio for train/test split
            scaling: Whether to apply StandardScaler (True/False)
        
        Returns:
            Dictionary with training results
        """
        # Prepare data
        X = df[features].copy()
        y = df[target].copy()
        
        # Handle missing values (drop rows with NaN)
        mask = X.notna().all(axis=1) & y.notna()
        X = X[mask]
        y = y[mask]
        
        if X.empty:
            raise ValueError("Dataset is empty after dropping missing values. Please clean missing data first.")
            
        categorical_cols = X.select_dtypes(include=['object', 'string', 'category']).columns
        if len(categorical_cols) > 0:
            raise ValueError(f"Cannot train models on string/categorical columns ({', '.join(categorical_cols)})... Please encode them first.")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=(1 - train_test_split_ratio), random_state=42
        )
        
        # Apply scaling if requested
        scaler = None
        if scaling:
            scaler = StandardScaler()
            X_train = pd.DataFrame(
                scaler.fit_transform(X_train),
                columns=X_train.columns,
                index=X_train.index
            )
            X_test = pd.DataFrame(
                scaler.transform(X_test),
                columns=X_test.columns,
                index=X_test.index
            )
        
        # Get algorithm pool based on problem type
        if problem_type == 'classification':
            algo_pool = CLASSIFICATION_ALGORITHMS
        else:
            algo_pool = REGRESSION_ALGORITHMS
        
        # If no specific algorithms requested, train all for the problem type
        if not algorithms:
            algorithms = list(algo_pool.keys())
        
        # Train models
        results = []
        trained_models = {}
        
        for algo_id in algorithms:
            if algo_id not in algo_pool:
                continue
            
            start_time = time.time()
            
            # Create and train model
            model = algo_pool[algo_id]()
            model.fit(X_train, y_train)
            
            # Make predictions
            y_pred = model.predict(X_test)
            
            training_time = time.time() - start_time
            
            # Calculate metrics
            metrics = self._calculate_metrics(
                y_test, y_pred, problem_type, model, X_test, len(features)
            )
            
            # Get feature importance if available
            feature_importance = self._get_feature_importance(
                model, features
            )
            
            # Get confusion matrix for classification
            conf_matrix = None
            if problem_type == 'classification':
                conf_matrix = confusion_matrix(y_test, y_pred).tolist()
            
            model_id = str(uuid.uuid4())
            
            results.append({
                'modelId': model_id,
                'name': ALGORITHM_NAMES.get(algo_id, algo_id),
                'algorithm': algo_id,
                'metrics': metrics,
                'confusionMatrix': conf_matrix,
                'featureImportance': feature_importance,
                'trainingTime': round(training_time, 3),
                'isBest': False
            })
            
            # Store trained model
            trained_models[model_id] = {
                'model': model,
                'scaler': scaler,
                'features': features,
                'target': target
            }
        
        # Determine best model
        if results:
            if problem_type == 'classification':
                best_idx = max(range(len(results)), key=lambda i: results[i]['metrics']['accuracy'] or 0)
            else:
                best_idx = max(range(len(results)), key=lambda i: results[i]['metrics']['r2Score'] or 0)
            
            results[best_idx]['isBest'] = True
            best_model_id = results[best_idx]['modelId']
        else:
            best_model_id = None
        
        training_id = str(uuid.uuid4())
        
        return {
            'trainingId': training_id,
            'problemType': problem_type,
            'models': results,
            'bestModel': best_model_id,
            'trained_models': trained_models
        }
    
    def _calculate_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        problem_type: str,
        model: Any = None,
        X_test: np.ndarray = None,
        n_features: int = 1
    ) -> Dict[str, Optional[float]]:
        """Calculate metrics based on problem type"""
        
        if problem_type == 'classification':
            precision, recall, f1, _ = precision_recall_fscore_support(
                y_true, y_pred, average='weighted', zero_division=0
            )
            
            # ROC AUC (needs predict_proba)
            roc_auc = None
            log_loss_val = None
            try:
                if model is not None and hasattr(model, 'predict_proba') and X_test is not None:
                    y_proba = model.predict_proba(X_test)
                    n_classes = len(np.unique(y_true))
                    if n_classes == 2:
                        roc_auc = round(roc_auc_score(y_true, y_proba[:, 1]), 4)
                    else:
                        roc_auc = round(roc_auc_score(y_true, y_proba, multi_class='ovr', average='weighted'), 4)
                    log_loss_val = round(log_loss(y_true, y_proba), 4)
            except Exception:
                pass
            
            return {
                'accuracy': round(accuracy_score(y_true, y_pred), 4),
                'precision': round(precision, 4),
                'recall': round(recall, 4),
                'f1Score': round(f1, 4),
                'rocAuc': roc_auc,
                'logLoss': log_loss_val,
                'r2Score': None,
                'mae': None,
                'rmse': None,
                'mape': None,
                'mse': None,
                'adjR2': None
            }
        else:  # regression
            r2 = r2_score(y_true, y_pred)
            mae = mean_absolute_error(y_true, y_pred)
            mse = mean_squared_error(y_true, y_pred)
            rmse = np.sqrt(mse)
            
            # Adjusted R²
            n = len(y_true)
            p = n_features
            if n > p + 1:
                adj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)
            else:
                adj_r2 = r2
            
            # Calculate MAPE safely (avoid division by zero)
            try:
                mape = mean_absolute_percentage_error(y_true, y_pred)
            except Exception:
                mape = None
            
            return {
                'accuracy': None,
                'precision': None,
                'recall': None,
                'f1Score': None,
                'rocAuc': None,
                'logLoss': None,
                'r2Score': round(r2, 4),
                'adjR2': round(adj_r2, 4),
                'mae': round(mae, 4),
                'mse': round(mse, 4),
                'rmse': round(rmse, 4),
                'mape': round(mape, 4) if mape is not None else None
            }
    
    def _get_feature_importance(
        self,
        model: Any,
        features: List[str]
    ) -> Optional[Dict[str, float]]:
        """Extract feature importance from tree-based models"""
        
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            return {
                feature: round(float(importance), 4)
                for feature, importance in zip(features, importances)
            }
        
        return None


# Global instance
model_trainer = ModelTrainer()
