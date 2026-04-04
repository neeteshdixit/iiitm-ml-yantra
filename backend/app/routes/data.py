from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import io
from app.schemas import (
    UploadResponse,
    PreviewResponse,
    StatisticsResponse,
    CleaningResponse,
    NullHandlingRequest,
    DuplicateHandlingRequest,
    DataTypeConversionRequest,
    EncodingRequest,
    HistoryResponse,
    MessageResponse
)
from app.services.dataset_manager import dataset_manager
from app.services.data_cleaner import data_cleaner

router = APIRouter()


class MergeRequest(BaseModel):
    group_id: str
    sheet_names: List[str]
    merge_type: str  # 'concat_rows', 'concat_cols', 'join'
    on_column: Optional[str] = None
    how: str = 'inner'  # 'inner', 'outer', 'left', 'right'


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV or Excel file and create session(s)"""
    filename = file.filename.lower()
    
    if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx, .xls) files are supported")
        
    # Security: Enforce 100MB hard limit on the backend to prevent server memory exhaustion
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File is too large! Please upload a dataset under 100MB.")
    
    try:
        contents = await file.read()
        
        if filename.endswith('.csv'):
            # Single CSV file
            df = pd.read_csv(io.BytesIO(contents))
            session_id = dataset_manager.create_session(df)
            
            return {
                "session_id": session_id,
                "filename": file.filename,
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist(),
                "column_types": {col: str(df[col].dtype) for col in df.columns},
                "is_multi_sheet": False,
                "sheets": []
            }
        else:
            # Excel file - check for multiple sheets
            excel = pd.ExcelFile(io.BytesIO(contents))
            sheet_names = excel.sheet_names
            
            # Security: Prevent memory explosion from workbooks with massive sheet counts
            if len(sheet_names) > 10:
                raise HTTPException(status_code=400, detail="Excel workbook has too many sheets (Max 10). Please limit the number of sheets to optimize server memory.")
            
            if len(sheet_names) == 1:
                # Single sheet - treat like CSV
                df = pd.read_excel(io.BytesIO(contents), sheet_name=sheet_names[0])
                session_id = dataset_manager.create_session(df)
                
                return {
                    "session_id": session_id,
                    "filename": file.filename,
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": df.columns.tolist(),
                    "column_types": {col: str(df[col].dtype) for col in df.columns},
                    "is_multi_sheet": False,
                    "sheets": []
                }
            else:
                # Multiple sheets - create a group
                sheets = {}
                for name in sheet_names:
                    sheets[name] = pd.read_excel(io.BytesIO(contents), sheet_name=name)
                
                group_id, sheet_sessions = dataset_manager.create_multi_sheet_session(sheets)
                sheet_info = dataset_manager.get_sheet_info(group_id)
                
                # Return the first sheet as default active
                first_sheet = sheet_info[0]
                
                return {
                    "session_id": first_sheet["session_id"],
                    "filename": file.filename,
                    "rows": first_sheet["rows"],
                    "columns": first_sheet["columns"],
                    "column_names": first_sheet["column_names"],
                    "column_types": first_sheet["column_types"],
                    "is_multi_sheet": True,
                    "group_id": group_id,
                    "sheets": sheet_info
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/sheets/{group_id}")
async def get_sheets(group_id: str):
    """Get all sheets info for a group"""
    try:
        info = dataset_manager.get_sheet_info(group_id)
        return {"group_id": group_id, "sheets": info}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/sheets/{group_id}/common-columns")
async def get_common_columns(group_id: str, sheet_names: str = Query(...)):
    """Get common columns between selected sheets"""
    try:
        names = [n.strip() for n in sheet_names.split(',')]
        sheets = dataset_manager.get_sheet_group(group_id)
        
        column_sets = []
        all_columns = {}
        for name in names:
            if name not in sheets:
                raise ValueError(f"Sheet '{name}' not found")
            df = dataset_manager.get_dataset(sheets[name])
            cols = set(df.columns.tolist())
            column_sets.append(cols)
            all_columns[name] = df.columns.tolist()
        
        common = set.intersection(*column_sets) if column_sets else set()
        all_unique = set.union(*column_sets) if column_sets else set()
        
        return {
            "common_columns": sorted(list(common)),
            "all_columns": {k: sorted(v) for k, v in all_columns.items()},
            "unique_columns": sorted(list(all_unique - common)),
            "sheets_have_same_columns": len(common) == len(all_unique)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/merge")
async def merge_sheets(request: MergeRequest):
    """Merge multiple sheets into one"""
    try:
        new_session_id, merged_df = dataset_manager.merge_sheets(
            group_id=request.group_id,
            sheet_names=request.sheet_names,
            merge_type=request.merge_type,
            on_column=request.on_column,
            how=request.how
        )
        
        return {
            "session_id": new_session_id,
            "rows": len(merged_df),
            "columns": len(merged_df.columns),
            "column_names": merged_df.columns.tolist(),
            "column_types": {col: str(merged_df[col].dtype) for col in merged_df.columns},
            "message": f"Successfully merged {len(request.sheet_names)} sheets into {len(merged_df)} rows × {len(merged_df.columns)} columns"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error merging sheets: {str(e)}")

@router.get("/preview/{session_id}", response_model=PreviewResponse)
async def get_preview(session_id: str, num_rows: int = 5):
    """Get preview of dataset"""
    try:
        df = dataset_manager.get_dataset(session_id)
        preview_data = df.head(num_rows).to_dict(orient='records')
        
        return PreviewResponse(
            data=preview_data,
            total_rows=len(df)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")

@router.get("/preview/nulls/{session_id}")
async def get_nulls_preview(session_id: str, columns: Optional[str] = None):
    """Get preview of rows with null values or empty strings"""
    try:
        df = dataset_manager.get_dataset(session_id)
        
        # Filter to columns if specified
        if columns:
            column_list = [c.strip() for c in columns.split(',')]
            df_filtered = df[column_list].copy()
        else:
            df_filtered = df.copy()
        
        # Replace empty/whitespace strings with NaN so isnull() catches them
        for col in df_filtered.columns:
            if df_filtered[col].dtype == 'object':
                df_filtered[col] = df_filtered[col].replace(r'^\s*$', float('nan'), regex=True)
        
        # Now isnull() catches both real nulls and converted empty strings
        null_rows = df[df_filtered.isnull().any(axis=1)]
        
        # Replace NaN with None for JSON serialization
        import numpy as np
        clean_data = null_rows.head(50).replace({np.nan: None})
        
        return {
            "data": clean_data.to_dict(orient='records'),
            "total_rows": len(null_rows)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error getting nulls preview: {str(e)}")


@router.get("/preview/duplicates/{session_id}")
async def get_duplicates_preview(session_id: str):
    """Get preview of duplicate rows"""
    try:
        df = dataset_manager.get_dataset(session_id)
        
        # Get duplicate rows
        duplicate_rows = df[df.duplicated(keep='first')]
        
        import numpy as np
        clean_data = duplicate_rows.head(50).replace({np.nan: None})
        
        return {
            "data": clean_data.to_dict(orient='records'),
            "total_rows": len(duplicate_rows)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting duplicates preview: {str(e)}")


@router.get("/statistics/{session_id}", response_model=StatisticsResponse)
async def get_statistics(session_id: str):
    """Get dataset statistics"""
    try:
        stats = dataset_manager.get_statistics(session_id)
        return StatisticsResponse(**stats)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating statistics: {str(e)}")


@router.get("/correlation/{session_id}")
async def get_correlation(session_id: str):
    """Get correlation matrix for numeric columns"""
    try:
        df = dataset_manager.get_dataset(session_id)
        import numpy as np
        
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.empty or len(numeric_df.columns) < 2:
            return {"columns": [], "matrix": []}
        
        corr = numeric_df.corr()
        # Replace NaN with 0 for clean JSON
        corr = corr.fillna(0)
        
        return {
            "columns": corr.columns.tolist(),
            "matrix": corr.values.tolist()
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating correlation: {str(e)}")


@router.get("/distribution/{session_id}/{column}")
async def get_distribution(session_id: str, column: str):
    """Get value distribution for a column"""
    try:
        df = dataset_manager.get_dataset(session_id)
        import numpy as np
        
        if column not in df.columns:
            raise HTTPException(status_code=404, detail=f"Column '{column}' not found")
        
        col = df[column]
        is_numeric = pd.api.types.is_numeric_dtype(col)
        
        if is_numeric:
            # For numeric: return histogram bins
            clean = col.dropna()
            if len(clean) == 0:
                return {"type": "numeric", "bins": [], "counts": []}
            
            counts_arr, bin_edges = np.histogram(clean, bins=min(20, len(clean.unique())))
            return {
                "type": "numeric",
                "bins": [float(b) for b in bin_edges[:-1]],
                "bin_edges": [float(b) for b in bin_edges],
                "counts": [int(c) for c in counts_arr],
                "stats": {
                    "mean": float(clean.mean()),
                    "median": float(clean.median()),
                    "std": float(clean.std()) if len(clean) > 1 else 0
                }
            }
        else:
            # For categorical: return value counts
            vc = col.value_counts().head(20)
            return {
                "type": "categorical",
                "labels": vc.index.tolist(),
                "counts": vc.values.tolist(),
                "unique_count": col.nunique(),
                "total": len(col)
            }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting distribution: {str(e)}")


@router.get("/scatter/{session_id}")
async def get_scatter_data(session_id: str, x_col: Optional[str] = None, y_col: Optional[str] = None):
    """Get scatter plot data for two numeric columns"""
    try:
        df = dataset_manager.get_dataset(session_id)
        import numpy as np
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return {"pairs": [], "columns": numeric_cols}
        
        # If specific columns provided, return that pair
        if x_col and y_col:
            if x_col in df.columns and y_col in df.columns:
                sample = df[[x_col, y_col]].dropna().head(200)
                return {
                    "pairs": [{
                        "x_col": x_col,
                        "y_col": y_col,
                        "x": sample[x_col].tolist(),
                        "y": sample[y_col].tolist()
                    }],
                    "columns": numeric_cols
                }
        
        # Auto-generate top pairs (up to 6 combinations)
        pairs = []
        combo_count = 0
        for i in range(len(numeric_cols)):
            for j in range(i + 1, len(numeric_cols)):
                if combo_count >= 6:
                    break
                x, y = numeric_cols[i], numeric_cols[j]
                sample = df[[x, y]].dropna().head(150)
                if len(sample) > 0:
                    pairs.append({
                        "x_col": x,
                        "y_col": y,
                        "x": sample[x].tolist(),
                        "y": sample[y].tolist()
                    })
                    combo_count += 1
            if combo_count >= 6:
                break
        
        return {"pairs": pairs, "columns": numeric_cols}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting scatter data: {str(e)}")


@router.post("/clean/nulls/{session_id}", response_model=CleaningResponse)
async def handle_nulls(session_id: str, request: NullHandlingRequest):
    """Handle null values"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.handle_nulls(
            df,
            request.strategy,
            request.columns,
            request.fill_value
        )
        
        dataset_manager.update_dataset(
            session_id,
            df_clean,
            {"operation": "handle_nulls", "params": request.model_dump()}
        )
        
        return CleaningResponse(
            session_id=session_id,
            message=f"Successfully handled null values using {request.strategy} strategy"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error handling nulls: {str(e)}")

@router.post("/clean/duplicates/{session_id}", response_model=CleaningResponse)
async def handle_duplicates(session_id: str, request: DuplicateHandlingRequest):
    """Remove duplicate rows"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean, removed_count = data_cleaner.handle_duplicates(df, request.keep)
        
        dataset_manager.update_dataset(
            session_id,
            df_clean,
            {"operation": "handle_duplicates", "params": request.model_dump()}
        )
        
        return CleaningResponse(
            session_id=session_id,
            message=f"Removed {removed_count} duplicate rows",
            removed_count=removed_count
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error handling duplicates: {str(e)}")

@router.post("/clean/convert/{session_id}", response_model=CleaningResponse)
async def convert_datatype(session_id: str, request: DataTypeConversionRequest):
    """Convert column data type"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.convert_dtype(df, request.column, request.target_type)
        
        dataset_manager.update_dataset(
            session_id,
            df_clean,
            {"operation": "convert_datatype", "params": request.model_dump()}
        )
        
        return CleaningResponse(
            session_id=session_id,
            message=f"Converted column {request.column} to {request.target_type}"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting datatype: {str(e)}")

@router.post("/clean/encode/{session_id}", response_model=CleaningResponse)
async def encode_column(session_id: str, request: EncodingRequest):
    """Encode categorical column"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean, new_columns = data_cleaner.encode_column(df, request.column, request.method)
        
        dataset_manager.update_dataset(
            session_id,
            df_clean,
            {"operation": "encode_column", "params": request.model_dump()}
        )
        
        return CleaningResponse(
            session_id=session_id,
            message=f"Encoded column {request.column} using {request.method} encoding",
            new_columns=new_columns if request.method == 'onehot' else None
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error encoding column: {str(e)}")


class FilterRequest(BaseModel):
    column: str
    operator: str  # '>', '<', '>=', '<=', '==', '!=', 'contains', 'between', 'top_n', 'bottom_n', 'starts_with', 'ends_with', 'regex', 'is_empty', 'is_null', 'is_not_null', 'in', 'not_in', 'before', 'after', 'date_between', 'outliers', 'percentile'
    value: str = ''
    value2: Optional[str] = None
    values_list: Optional[List[str]] = None


@router.post("/clean/filter/{session_id}", response_model=CleaningResponse)
async def filter_rows(session_id: str, request: FilterRequest):
    """Filter dataset rows"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.filter_rows(
            df, request.column, request.operator, request.value,
            value2=request.value2, values_list=request.values_list
        )
        
        removed = len(df) - len(df_clean)
        dataset_manager.update_dataset(
            session_id,
            df_clean,
            {"operation": "filter_rows", "params": {"column": request.column, "operator": request.operator, "value": request.value, "value2": request.value2}}
        )
        
        return CleaningResponse(
            session_id=session_id,
            message=f"Filtered: kept {len(df_clean)} rows ({removed} removed)",
            removed_count=removed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filtering rows: {str(e)}")


class ColumnManagementRequest(BaseModel):
    action: str  # 'drop' or 'rename'
    columns: List[str]
    new_names: Optional[dict] = None


@router.post("/clean/columns/{session_id}", response_model=CleaningResponse)
async def manage_columns(session_id: str, request: ColumnManagementRequest):
    """Drop or rename columns"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.manage_columns(df, request.action, request.columns, request.new_names)
        
        dataset_manager.update_dataset(
            session_id,
            df_clean,
            {"operation": "manage_columns", "params": {"action": request.action, "columns": request.columns}}
        )
        
        return CleaningResponse(
            session_id=session_id,
            message=f"Successfully {request.action}ed {len(request.columns)} column(s)"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error managing columns: {str(e)}")


class NormalizeRequest(BaseModel):
    columns: List[str]
    method: str = 'standard'  # 'standard' or 'minmax'


@router.post("/clean/normalize/{session_id}", response_model=CleaningResponse)
async def normalize_columns(session_id: str, request: NormalizeRequest):
    """Normalize numeric columns"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.normalize_columns(df, request.columns, request.method)
        
        dataset_manager.update_dataset(
            session_id,
            df_clean,
            {"operation": "normalize", "params": {"columns": request.columns, "method": request.method}}
        )
        
        return CleaningResponse(
            session_id=session_id,
            message=f"Normalized {len(request.columns)} column(s) using {request.method} scaling"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error normalizing: {str(e)}")


class StringOperationRequest(BaseModel):
    column: str
    operation: str  # trim, lowercase, uppercase, title_case, replace, regex_replace, extract, remove_whitespace, remove_special_chars
    find_str: str = ''
    replace_str: str = ''
    regex_pattern: str = ''


@router.post("/clean/string_ops/{session_id}", response_model=CleaningResponse)
async def string_operations(session_id: str, request: StringOperationRequest):
    """Apply string operations to a column"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.string_operations(
            df, request.column, request.operation,
            find_str=request.find_str, replace_str=request.replace_str,
            regex_pattern=request.regex_pattern
        )
        dataset_manager.update_dataset(
            session_id, df_clean,
            {"operation": "string_ops", "params": {"column": request.column, "operation": request.operation}}
        )
        return CleaningResponse(session_id=session_id, message=f"String operation '{request.operation}' applied to '{request.column}'")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in string operation: {str(e)}")


class OutlierRemovalRequest(BaseModel):
    column: str
    method: str = 'zscore'  # zscore, iqr, percentile
    threshold: float = 2.0


@router.post("/clean/outliers/{session_id}", response_model=CleaningResponse)
async def remove_outliers(session_id: str, request: OutlierRemovalRequest):
    """Remove outliers from a numeric column"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.remove_outliers(df, request.column, request.method, request.threshold)
        removed = len(df) - len(df_clean)
        dataset_manager.update_dataset(
            session_id, df_clean,
            {"operation": "remove_outliers", "params": {"column": request.column, "method": request.method, "threshold": request.threshold}}
        )
        return CleaningResponse(session_id=session_id, message=f"Removed {removed} outlier(s) from '{request.column}' using {request.method}", removed_count=removed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing outliers: {str(e)}")


class FeatureEngineeringRequest(BaseModel):
    new_column: str
    expression: str


@router.post("/clean/feature_eng/{session_id}", response_model=CleaningResponse)
async def feature_engineering(session_id: str, request: FeatureEngineeringRequest):
    """Create a new column from an expression"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.feature_engineering(df, request.new_column, request.expression)
        dataset_manager.update_dataset(
            session_id, df_clean,
            {"operation": "feature_engineering", "params": {"new_column": request.new_column, "expression": request.expression}}
        )
        return CleaningResponse(session_id=session_id, message=f"Created column '{request.new_column}'")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in feature engineering: {str(e)}")


class DateOperationRequest(BaseModel):
    column: str
    operation: str  # extract_year, extract_month, extract_day, extract_weekday, extract_hour, extract_quarter, extract_all, date_diff, to_timestamp
    second_column: Optional[str] = None


@router.post("/clean/date_ops/{session_id}", response_model=CleaningResponse)
async def date_operations(session_id: str, request: DateOperationRequest):
    """Extract or transform date/time columns"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.date_operations(df, request.column, request.operation, request.second_column)
        dataset_manager.update_dataset(
            session_id, df_clean,
            {"operation": "date_ops", "params": {"column": request.column, "operation": request.operation}}
        )
        return CleaningResponse(session_id=session_id, message=f"Date operation '{request.operation}' applied to '{request.column}'")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in date operation: {str(e)}")


class BinningRequest(BaseModel):
    column: str
    method: str = 'equal_width'  # equal_width, equal_frequency, custom
    n_bins: int = 5
    labels: Optional[List[str]] = None
    custom_edges: Optional[List[float]] = None


@router.post("/clean/binning/{session_id}", response_model=CleaningResponse)
async def binning(session_id: str, request: BinningRequest):
    """Bin continuous data into categories"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.binning(df, request.column, request.method, request.n_bins, request.labels, request.custom_edges)
        dataset_manager.update_dataset(
            session_id, df_clean,
            {"operation": "binning", "params": {"column": request.column, "method": request.method, "n_bins": request.n_bins}}
        )
        return CleaningResponse(session_id=session_id, message=f"Binned '{request.column}' into {request.n_bins} groups using {request.method}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in binning: {str(e)}")


class SamplingRequest(BaseModel):
    method: str = 'random'  # random, stratified, first, last
    fraction: float = 0.5
    n_rows: Optional[int] = None
    stratify_column: Optional[str] = None


@router.post("/clean/sampling/{session_id}", response_model=CleaningResponse)
async def sampling(session_id: str, request: SamplingRequest):
    """Sample rows from the dataset"""
    try:
        df = dataset_manager.get_dataset(session_id)
        df_clean = data_cleaner.sampling(df, request.method, request.fraction, request.n_rows, request.stratify_column)
        kept = len(df_clean)
        removed = len(df) - kept
        dataset_manager.update_dataset(
            session_id, df_clean,
            {"operation": "sampling", "params": {"method": request.method, "fraction": request.fraction}}
        )
        return CleaningResponse(session_id=session_id, message=f"Sampled {kept} rows ({removed} removed) using {request.method}", removed_count=removed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in sampling: {str(e)}")


@router.get("/download/{session_id}")
async def download_dataset(session_id: str):
    """Download cleaned dataset as CSV"""
    try:
        df = dataset_manager.get_dataset(session_id)
        
        # Create CSV in memory
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        stream.seek(0)
        
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=cleaned_dataset.csv"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading dataset: {str(e)}")

@router.post("/history/undo/{session_id}", response_model=MessageResponse)
async def undo_operation(session_id: str):
    """Undo last operation"""
    try:
        dataset_manager.undo(session_id)
        return MessageResponse(message="Operation undone successfully")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error undoing operation: {str(e)}")

@router.post("/history/redo/{session_id}", response_model=MessageResponse)
async def redo_operation(session_id: str):
    """Redo last undone operation"""
    try:
        dataset_manager.redo(session_id)
        return MessageResponse(message="Operation redone successfully")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error redoing operation: {str(e)}")

@router.get("/history/{session_id}", response_model=HistoryResponse)
async def get_history(session_id: str):
    """Get operation history"""
    try:
        operations = dataset_manager.get_history(session_id)
        current_index = dataset_manager.current_index[session_id]
        
        return HistoryResponse(
            operations=operations,
            current_index=current_index
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting history: {str(e)}")
