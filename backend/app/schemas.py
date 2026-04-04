from pydantic import BaseModel
from typing import Dict, List, Optional, Any

# Response Models
class UploadResponse(BaseModel):
    session_id: str
    filename: str
    rows: int
    columns: int
    column_names: List[str]
    column_types: Dict[str, str]

class PreviewResponse(BaseModel):
    data: List[Dict[str, Any]]
    total_rows: int

class StatisticsResponse(BaseModel):
    total_rows: int
    total_columns: int
    null_counts: Dict[str, int]
    duplicate_rows: int
    column_types: Dict[str, str]
    numeric_stats: Optional[Dict[str, Dict[str, float]]] = None

class CleaningResponse(BaseModel):
    session_id: str
    message: str
    removed_count: Optional[int] = None
    new_columns: Optional[List[str]] = None

# Request Models
class NullHandlingRequest(BaseModel):
    strategy: str  # 'drop', 'fill_mean', 'fill_median', 'fill_mode', 'fill_value'
    columns: Optional[List[str]] = None
    fill_value: Optional[Any] = None

class DuplicateHandlingRequest(BaseModel):
    keep: str = 'first'  # 'first', 'last', 'none'

class DataTypeConversionRequest(BaseModel):
    column: str
    target_type: str  # 'int', 'float', 'str', 'datetime'

class EncodingRequest(BaseModel):
    column: str
    method: str  # 'label', 'onehot', 'ordinal'

class HistoryResponse(BaseModel):
    operations: List[Dict[str, Any]]
    current_index: int

class MessageResponse(BaseModel):
    message: str

# ML Training Models
class TrainingRequest(BaseModel):
    features: List[str]
    target: str
    problemType: str  # 'classification' or 'regression'
    algorithms: List[str] = []  # Empty = train all algorithms for the problem type
    trainTestSplit: float = 0.8
    validationSplit: float = 0.0  # 0.0 = no validation set, e.g. 0.1 = 10% held out for validation
    scaling: bool = True  # True = StandardScaler, False = none

class FeatureValidationRequest(BaseModel):
    features: List[str]
    target: str
    problemType: str  # 'classification' or 'regression'

class ValidationIssue(BaseModel):
    level: str  # 'error' or 'warning'
    column: Optional[str] = None
    message: str

class FeatureValidationResponse(BaseModel):
    valid: bool
    warnings: List[ValidationIssue] = []
    errors: List[ValidationIssue] = []

class ModelMetrics(BaseModel):
    # Classification
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1Score: Optional[float] = None
    rocAuc: Optional[float] = None
    logLoss: Optional[float] = None
    
    # Regression
    r2Score: Optional[float] = None
    adjR2: Optional[float] = None
    mae: Optional[float] = None
    mse: Optional[float] = None
    rmse: Optional[float] = None
    mape: Optional[float] = None

class ModelResult(BaseModel):
    modelId: str
    name: str
    algorithm: str
    metrics: ModelMetrics
    confusionMatrix: Optional[List[List[int]]] = None
    featureImportance: Optional[Dict[str, float]] = None
    trainingTime: float
    isBest: bool

class TrainingResponse(BaseModel):
    trainingId: str
    session_id: str
    problemType: str
    models: List[ModelResult]
    bestModel: Optional[str]
    message: str
    classDistribution: Optional[Dict[str, float]] = None
    imbalanceRatio: Optional[float] = None
    smoteApplied: Optional[bool] = None
    validationMetrics: Optional[Dict[str, Any]] = None  # Metrics on held-out validation set
