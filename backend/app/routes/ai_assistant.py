from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.gemini_service import gemini_service
from app.services.context_builder import context_builder

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    include_training: bool = False
    training_results: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    context_used: Dict[str, Any]


class AnalyzeDatasetRequest(BaseModel):
    session_id: str


class RecommendCleaningRequest(BaseModel):
    session_id: str


class RecommendAlgorithmsRequest(BaseModel):
    session_id: str
    problem_type: str
    features: List[str]
    target: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with AI assistant"""
    try:
        # Build context
        context = context_builder.build_full_context(
            request.session_id,
            include_training=request.include_training,
            training_results=request.training_results
        )
        
        # Get AI response
        response = await gemini_service.chat(
            message=request.message,
            context=context
        )
        
        return ChatResponse(
            response=response,
            context_used=context
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/analyze-dataset")
async def analyze_dataset(request: AnalyzeDatasetRequest):
    """Analyze dataset and provide insights"""
    try:
        dataset_info = context_builder.build_dataset_context(request.session_id)
        
        response = await gemini_service.analyze_dataset(dataset_info)
        
        return {"response": response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.post("/recommend-cleaning")
async def recommend_cleaning(request: RecommendCleaningRequest):
    """Get cleaning recommendations"""
    try:
        dataset_info = context_builder.build_dataset_context(request.session_id)
        history = context_builder.build_history_context(request.session_id)
        
        response = await gemini_service.recommend_cleaning(dataset_info, history)
        
        return {"response": response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


@router.post("/recommend-algorithms")
async def recommend_algorithms(request: RecommendAlgorithmsRequest):
    """Get algorithm recommendations"""
    try:
        dataset_info = context_builder.build_dataset_context(request.session_id)
        
        response = await gemini_service.recommend_algorithms(
            problem_type=request.problem_type,
            dataset_info=dataset_info,
            features=request.features,
            target=request.target
        )
        
        return {"response": response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Algorithm recommendation error: {str(e)}")
