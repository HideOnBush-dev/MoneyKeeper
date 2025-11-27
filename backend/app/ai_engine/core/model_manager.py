import os
import logging
import time
from typing import Optional, Generator
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from functools import wraps

logger = logging.getLogger(__name__)


def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """Decorator to retry function on failure"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)  # Exponential backoff
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed: {e}. "
                            f"Retrying in {wait_time}s..."
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(f"All {max_retries} attempts failed")
            raise last_exception
        return wrapper
    return decorator


class ModelManager:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def initialize(self):
        """Initialize Google Gemini API"""
        if self._initialized:
            return
        
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            logger.error("GOOGLE_API_KEY not found in environment variables")
            raise ValueError("GOOGLE_API_KEY is required for Google AI")
        
        # Validate API key format
        if len(api_key) < 20:
            raise ValueError("GOOGLE_API_KEY appears to be invalid")
        
        try:
            genai.configure(api_key=api_key)
            # Use the correct model name - gemini-flash-latest is the stable latest version
            # Other good options: gemini-2.5-flash, gemini-2.0-flash, gemini-pro-latest
            self.model_name = os.environ.get("AI_MODEL_NAME", "gemini-flash-latest")
            self.timeout = int(os.environ.get("AI_REQUEST_TIMEOUT", 30))
            self.max_retries = int(os.environ.get("AI_MAX_RETRIES", 3))
            
            # Configure generation settings for safety and quality
            self.generation_config = GenerationConfig(
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                max_output_tokens=2048,
            )
            
            # Configure safety settings
            self.safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]
            
            self.model = genai.GenerativeModel(
                self.model_name,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            logger.info(f"Google AI initialized with model: {self.model_name}")
            self._initialized = True
            
        except Exception as e:
            logger.exception(f"Failed to initialize Google AI: {e}")
            raise

    def preload_models(self):
        """Initialize Google AI - no preloading needed for API"""
        self.initialize()
        logger.info("Google AI ready")

    def get_model(self) -> Optional[genai.GenerativeModel]:
        """Get the Gemini model instance"""
        self.initialize()
        return self.model

    @retry_on_failure(max_retries=3, delay=1.0)
    def generate_content(self, prompt: str, **kwargs) -> str:
        """Generate content using Gemini API with retry logic"""
        self.initialize()
        
        # Validate input
        if not prompt or not isinstance(prompt, str):
            raise ValueError("Prompt must be a non-empty string")
        
        if len(prompt) > 30000:
            logger.warning(f"Prompt too long ({len(prompt)} chars), truncating...")
            prompt = prompt[:30000]
        
        try:
            # Merge custom config with defaults
            # Extract attributes from GenerationConfig object
            config_dict = {
                'temperature': kwargs.get('temperature', self.generation_config.temperature),
                'top_p': kwargs.get('top_p', self.generation_config.top_p),
                'top_k': kwargs.get('top_k', self.generation_config.top_k),
                'max_output_tokens': kwargs.get('max_output_tokens', self.generation_config.max_output_tokens),
            }
            
            # Create a new GenerationConfig with merged settings
            merged_config = GenerationConfig(**config_dict)
            
            response = self.model.generate_content(
                prompt,
                generation_config=merged_config,
                request_options={"timeout": self.timeout}
            )
            
            if not response or not response.text:
                raise ValueError("Empty response from AI model")
            
            return response.text.strip()
            
        except Exception as e:
            logger.exception(f"Error generating content: {e}")
            raise

    @retry_on_failure(max_retries=2, delay=0.5)
    def generate_content_stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        """Generate content with streaming using Gemini API"""
        self.initialize()
        
        # Validate input
        if not prompt or not isinstance(prompt, str):
            raise ValueError("Prompt must be a non-empty string")
        
        if len(prompt) > 30000:
            logger.warning(f"Prompt too long ({len(prompt)} chars), truncating...")
            prompt = prompt[:30000]
        
        try:
            # Merge custom config with defaults
            # Extract attributes from GenerationConfig object
            config_dict = {
                'temperature': kwargs.get('temperature', self.generation_config.temperature),
                'top_p': kwargs.get('top_p', self.generation_config.top_p),
                'top_k': kwargs.get('top_k', self.generation_config.top_k),
                'max_output_tokens': kwargs.get('max_output_tokens', self.generation_config.max_output_tokens),
            }
            
            # Create a new GenerationConfig with merged settings
            merged_config = GenerationConfig(**config_dict)
            
            response = self.model.generate_content(
                prompt,
                generation_config=merged_config,
                stream=True,
                request_options={"timeout": self.timeout}
            )
            
            for chunk in response:
                # Some streamed chunks may not contain text (e.g., prompt_feedback or
                # final status-only candidates). Accessing chunk.text can raise when
                # there's no valid Part, so guard it defensively.
                try:
                    text_delta = chunk.text  # quick accessor when available
                except Exception:
                    text_delta = None

                if text_delta:
                    yield text_delta
                else:
                    # Fallback: try extracting any text parts if present
                    try:
                        for cand in getattr(chunk, "candidates", []) or []:
                            content = getattr(cand, "content", None)
                            parts = getattr(content, "parts", []) if content else []
                            for p in parts or []:
                                t = getattr(p, "text", None)
                                if t:
                                    yield t
                    except Exception:
                        # Swallow silent non-text chunks
                        pass
                    
        except Exception as e:
            logger.exception(f"Error generating content stream: {e}")
            raise

    def clear_cache(self):
        """Clear cache - minimal operation for API"""
        logger.info("Cache cleared")

    def is_model_loaded(self, name: str = None) -> bool:
        """Check if model is initialized"""
        return self._initialized


model_manager = ModelManager()
