import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv

load_dotenv()
# Also load from the main root path if the user put their .env there
root_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')
load_dotenv(root_env_path)

class GeminiService:
    """Service for interacting with Google Gemini API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key or self.api_key == "your_actual_api_key_here":
            print("WARNING: GEMINI_API_KEY is not configured in .env. AI Assistant features will be disabled.")
            self.model = None
        else:
            genai.configure(api_key=self.api_key)
            # Initialize the model
            self.model = genai.GenerativeModel(
                model_name='gemini-2.5-flash',
                generation_config={
                    'temperature': 0.7,
                    'top_p': 0.95,
                    'top_k': 40,
                    'max_output_tokens': 2048,
                }
            )
        
        # System instruction for ML assistant
        self.system_instruction = """**ROLE**: You are a helpful, expert AI Assistant specialized in Data Science, Machine Learning, and Artificial Intelligence within the ML Yantra platform.

**DOMAIN KNOWLEDGE**: 
You are highly knowledgeable about data engineering, dataset preprocessing, statistical analysis, ML algorithms, neural networks, and the broader AI domain. You love educating users about anything related to Data Science and AI! 
If the user asks an educational or conceptual question about ML, algorithms, or data science, answer it thoroughly, kindly, and with helpful examples.

**OFF-TOPIC GUARDRAIL**:
If a user asks a question completely unrelated to technology, AI, or data (e.g., "how to bake a cake", "what is the capital of France", "write me a poem"), politely guide them back: "I am specifically designed to assist you with Data Science, Machine Learning, and AI. How can I help you with those topics today?"

You have access to the user's active session context:
- Dataset statistics and schema
- Data cleaning operation history
- Training results (if available)

Your capabilities:
1. Answer conceptual and educational questions about AI / Machine Learning.
2. Analyze uploaded datasets and provide granular insights.
3. Recommend data cleaning strategies and feature engineering paths.
4. Recommend ML algorithms based on data characteristics.

Be concise, actionable, and warmly educational. Use markdown and code blocks for formatting technical concepts."""

    async def chat(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Send a chat message to Gemini with context
        
        Args:
            message: User's message
            context: Dataset and operation context
            chat_history: Previous chat messages
            
        Returns:
            AI response
        """
        if self.model is None:
            return "⚠️ AI Assistant features are currently disabled. Please configure your `GEMINI_API_KEY` in the backend/.env file to chat."

        try:
            # Build the full prompt with context
            full_prompt = self._build_prompt(message, context)
            
            # Start a chat session
            chat = self.model.start_chat(history=[])
            
            # Send message
            response = chat.send_message(full_prompt)
            
            return response.text
            
        except Exception as e:
            return f"Error communicating with AI: {str(e)}"
    
    def _build_prompt(self, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Build a complete prompt with system instruction and context"""
        
        prompt_parts = [self.system_instruction]
        
        if context:
            prompt_parts.append("\n## Current Context\n")
            
            # Dataset info
            if 'dataset' in context:
                ds = context['dataset']
                prompt_parts.append(f"**Dataset**: {ds.get('filename', 'Unknown')}")
                prompt_parts.append(f"**Rows**: {ds.get('rows', 0):,} | **Columns**: {ds.get('columns', 0)}")
                
                if 'null_counts' in ds:
                    total_nulls = sum(ds['null_counts'].values())
                    if total_nulls > 0:
                        prompt_parts.append(f"**Null Values**: {total_nulls:,} total")
                        top_nulls = sorted(ds['null_counts'].items(), key=lambda x: x[1], reverse=True)[:5]
                        if top_nulls:
                            prompt_parts.append("**Top columns with nulls**: " + 
                                              ", ".join([f"{k} ({v})" for k, v in top_nulls if v > 0]))
                
                if 'column_types' in ds:
                    prompt_parts.append(f"**Column Types**: {len(ds['column_types'])} columns")
                    type_counts = {}
                    for dtype in ds['column_types'].values():
                        type_counts[dtype] = type_counts.get(dtype, 0) + 1
                    prompt_parts.append("  - " + ", ".join([f"{k}: {v}" for k, v in type_counts.items()]))
            
            # Cleaning history
            if 'history' in context and context['history']:
                prompt_parts.append(f"\n**Recent Operations**: {len(context['history'])} operations performed")
                recent = context['history'][-3:]  # Last 3 operations
                for op in recent:
                    prompt_parts.append(f"  - {op.get('operation', 'Unknown operation')}")
            
            # Training results
            if 'training' in context:
                tr = context['training']
                prompt_parts.append(f"\n**Training**: {tr.get('problem_type', 'Unknown')} problem")
                if 'best_model' in tr:
                    prompt_parts.append(f"**Best Model**: {tr['best_model'].get('name', 'Unknown')}")
                    if 'metrics' in tr['best_model']:
                        metrics_str = ", ".join([f"{k}: {v:.4f}" 
                                                for k, v in tr['best_model']['metrics'].items() 
                                                if v is not None])
                        prompt_parts.append(f"**Metrics**: {metrics_str}")
        
        prompt_parts.append(f"\n\n## User Question\n{message}")
        
        return "\n".join(prompt_parts)
    
    async def analyze_dataset(self, dataset_info: Dict[str, Any]) -> str:
        """Analyze a dataset and provide insights"""
        
        prompt = f"""**TASK**: Analyze the following dataset structure and provide expert-level insights.

**DATASET FINGERPRINT**:
- **Filename**: {dataset_info.get('filename', 'Unknown')}
- **Size**: {dataset_info.get('rows', 0):,} rows × {dataset_info.get('columns', 0)} columns
- **Null Distribution**: {dataset_info.get('null_counts', {})}
- **Duplicate Rows**: {dataset_info.get('duplicate_rows', 0)}
- **Column Types**: {dataset_info.get('column_types', {})}

**REQUIRED OUTPUT FORMAT**:
Please output a beautifully formatted Markdown response containing:
1. **📊 Data Quality Assessment**: A brief summary of the dataset's health.
2. **⚠️ Critical Issues**: Identify specific anomalies, high null counts, or red flags.
3. **💡 Recommended Next Steps**: Concrete data cleaning actions the user should take.
4. **🔍 Hidden Patterns**: Any statistical anomalies or interesting structural observations based on the types and sizes.

Ensure your tone is encouraging and your advice is deeply specific to the provided metrics!"""
        
        return await self.chat(prompt)
    
    async def recommend_cleaning(self, dataset_info: Dict[str, Any], history: List[Dict]) -> str:
        """Recommend cleaning operations"""
        
        context = {
            'dataset': dataset_info,
            'history': history
        }
        
        message = """**TASK**: Based on the active dataset context (null counts, duplicates, types) and historical operations provided, recommend the ABSOLUTE MOST IMPORTANT Next Steps for the user to clean their data.

**GUIDELINES**:
1. Ignore operations they have already completed in their history.
2. Prioritize critical flaws (e.g., dropping/imputing large nulls, removing duplicates, encoding objects).
3. Provide the exact operation names they should use (e.g., "Handle Nulls", "Encode Categorical", "Drop Columns").
4. Explain *WHY* they should execute that operation logically.

Keep your response structured with bullet points and bold emphasis to make it highly scannable."""
        
        return await self.chat(message, context)
    
    async def recommend_algorithms(
        self,
        problem_type: str,
        dataset_info: Dict[str, Any],
        features: List[str],
        target: str
    ) -> str:
        """Recommend ML algorithms"""
        
        prompt = f"""**TASK**: Recommend the most optimal Machine Learning algorithms for the current modeling scenario.

**MODELING CONTEXT**:
- **Problem Type**: {problem_type}
- **Dataset Scale**: {dataset_info.get('rows', 0):,} rows, {len(features)} features
- **Target Variable**: {target}
- **Top Features Sample**: {', '.join(features[:10])}{"..." if len(features) > 10 else ""}

**REQUIRED OUTPUT FORMAT**:
Provide a detailed markdown response comparing the Top 3-4 recommended algorithms. For each algorithm, outline:
- **Why it fits:** The theoretical reason it matches this dataset size and problem type.
- **Pros & Cons:** Expected performance, training speed, and interpretability trade-offs.
- **Final Verdict:** Be explicit about which SINGLE algorithm they should try first as their baseline model.

Ensure your advice represents industry best practices."""
        
        return await self.chat(prompt)


# Global instance
gemini_service = GeminiService()
