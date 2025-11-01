import threading
import queue
import gc
import os
from typing import Dict, Any, Optional, TypeAlias

from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    pipeline,
)
import torch
import logging

logger = logging.getLogger(__name__)

ModelType: TypeAlias = AutoModelForCausalLM
TokenizerType: TypeAlias = AutoTokenizer
ModelInfo: TypeAlias = Dict[str, Any]


class ModelManager:
    _instance = None
    _lock = threading.Lock()
    _initialized = False

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelManager, cls).__new__(cls)
            return cls._instance

    def initialize(self):
        if self._initialized:
            return
        # Go up from app/ai_engine/core/model_manager.py to project root
        self.model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "models"
        )
        os.makedirs(self.model_path, exist_ok=True)
        logger.info(f"Model path initialized at: {self.model_path}")

        self.model_cache: Dict[str, ModelType] = {}
        self.tokenizer_cache: Dict[str, TokenizerType] = {}
        self.load_queue: queue.Queue[ModelInfo] = queue.Queue()
        self.loading_status: Dict[str, str] = {}
        self.loading_event = threading.Event()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cuda":
            logger.info(f"CUDA is available. Device count: {torch.cuda.device_count()}")
            logger.info(f"Current device: {torch.cuda.current_device()}")
            logger.info(f"Device name: {torch.cuda.get_device_name(0)}")
            # Use quantization config for CUDA
            self.default_config = {
                "load_in_4bit": True,
                "bnb_4bit_compute_dtype": torch.bfloat16,
                "bnb_4bit_quant_type": "nf4",
                "bnb_4bit_use_double_quant": True,
                "llm_int8_enable_fp32_cpu_offload": True,
            }
        else:
            logger.warning("CUDA is NOT available. Falling back to CPU.")
            # No quantization for CPU
            self.default_config = {}

        self.loader_thread = threading.Thread(
            target=self._background_loader, daemon=True
        )
        self.loader_thread.start()

        self.pipeline = None
        self._initialized = True

    def preload_models(self):
        self.initialize()
        models_to_load = [
            {
                "name": "meta-llama/Llama-3.2-3B-Instruct",
                "config": self.default_config.copy(),
            }
        ]
        for model_info in models_to_load:
            self.load_queue.put(model_info)
        self.load_queue.join()

    def _background_loader(self):
        while True:
            try:
                model_info = self.load_queue.get()
                self._load_model(model_info)
                self.load_queue.task_done()
            except Exception as e:
                logger.exception(f"Error loading model: {e}")

    def _load_model(self, model_info: ModelInfo):
        name = model_info["name"]
        config = model_info["config"]
        self.loading_status[name] = "loading"
        logger.info(f"Loading model and tokenizer: {name}")

        try:
            self._load_tokenizer_with_retry(name)
            self._load_model_with_retry(name, config)

            self.loading_status[name] = "loaded"
            self.loading_event.set()

            if self.pipeline is None:  # Initialize pipeline *after* model is loaded
                self.pipeline = pipeline(
                    "text-generation",
                    model=self.model_cache[name],
                    tokenizer=self.tokenizer_cache[name],
                    torch_dtype=torch.bfloat16,
                    device_map="auto",
                )

        except Exception as e:
            error_msg = f"Error loading model/tokenizer for {name}: {str(e)}"
            logger.exception(error_msg)
            self.loading_status[name] = "failed"
            self.loading_event.set()
            torch.cuda.empty_cache()

    def _load_tokenizer_with_retry(self, name: str):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(
                    f"Loading tokenizer (attempt {attempt + 1}/{max_retries})..."
                )
                # Check if local model directory exists
                local_model_path = None
                if name == "meta-llama/Llama-3.2-3B-Instruct":
                    potential_path = os.path.join(self.model_path, "Llama-3.2-3B-Instruct")
                    if os.path.exists(potential_path):
                        local_model_path = potential_path
                        logger.info(f"Found local model at: {local_model_path}")
                
                tokenizer = AutoTokenizer.from_pretrained(
                    local_model_path if local_model_path else name,
                    trust_remote_code=True,
                    padding_side="left",
                    cache_dir=self.model_path,
                )
                if tokenizer:
                    self.tokenizer_cache[name] = tokenizer
                    logger.info("Tokenizer loaded successfully")
                    return
            except Exception as e:
                logger.warning(f"Tokenizer loading attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    raise

    def _load_model_with_retry(self, name: str, config: Dict[str, Any]):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Loading model (attempt {attempt + 1}/{max_retries})...")

                # Check if local model directory exists
                local_model_path = None
                if name == "meta-llama/Llama-3.2-3B-Instruct":
                    potential_path = os.path.join(self.model_path, "Llama-3.2-3B-Instruct")
                    if os.path.exists(potential_path):
                        local_model_path = potential_path
                        logger.info(f"Found local model at: {local_model_path}")

                # Build kwargs for from_pretrained
                load_kwargs = {
                    "trust_remote_code": True,
                    "cache_dir": self.model_path,
                    "low_cpu_mem_usage": True,
                }

                # Only add quantization if config is not empty
                if config:
                    config_for_bnb = config.copy()
                    config_for_bnb.pop("torch_dtype", None)
                    config_for_bnb.pop("device_map", None)
                    load_kwargs["quantization_config"] = BitsAndBytesConfig(**config_for_bnb)

                model = AutoModelForCausalLM.from_pretrained(
                    local_model_path if local_model_path else name,
                    **load_kwargs
                )

                if model:
                    self.model_cache[name] = model
                    logger.info("Model loaded successfully")
                    return

            except Exception as e:
                logger.warning(f"Model loading attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    raise

    def get_pipeline(self):
        self.initialize()
        if self.pipeline is None:
            self.loading_event.wait()
        return self.pipeline

    def get_model(self, name: str) -> Optional[ModelType]:
        self.initialize()
        if name not in self.model_cache:
            if name not in self.loading_status:
                model_info = {"name": name, "config": self.default_config.copy()}
                self.load_queue.put(model_info)
                self.loading_event.clear()
            self.loading_event.wait()
            if self.loading_status.get(name) == "failed":
                raise ValueError(f"Failed to load model {name}")
        return self.model_cache.get(name)

    def get_tokenizer(self, name: str) -> Optional[TokenizerType]:
        self.initialize()
        if name not in self.tokenizer_cache:
            if name not in self.loading_status:
                model_info = {"name": name, "config": self.default_config.copy()}
                self.load_queue.put(model_info)
                self.loading_event.clear()
            self.loading_event.wait()
            if self.loading_status.get(name) == "failed":
                raise ValueError(f"Failed to load tokenizer or associated model {name}")
        return self.tokenizer_cache.get(name)

    def clear_cache(self):
        self.initialize()
        self.model_cache.clear()
        self.tokenizer_cache.clear()
        if self.pipeline is not None:
            del self.pipeline
            self.pipeline = None
        torch.cuda.empty_cache()
        gc.collect()

    def is_model_loaded(self, name: str) -> bool:
        """Check if a model is loaded"""
        return name in self.model_cache


model_manager = ModelManager()
