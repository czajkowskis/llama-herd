import json
from typing import List, Dict, Any

class ModelCatalogService:
    """
    Service for managing and providing the model catalog.
    """
    def __init__(self):
        self._catalog = self._load_predefined_catalog()

    def get_catalog(self) -> List[Dict[str, Any]]:
        """
        Returns the model catalog.
        """
        return self._catalog

    def _load_predefined_catalog(self) -> List[Dict[str, Any]]:
        """
        Loads the predefined model catalog.
        In the future, this could fetch from a dynamic source.
        """
        return [
          {
            "name": "Llama 3 8B Instruct Q4",
            "tag": "llama3:8b-instruct-q4_0",
            "size": 1900000000,
            "family": "llama",
            "quant": "q4_0",
            "notes": "Latest Llama 3 model, great for general chat"
          },
          {
            "name": "Llama 3 8B Instruct Q5",
            "tag": "llama3:8b-instruct-q5_0",
            "size": 2400000000,
            "family": "llama",
            "quant": "q5_0",
            "notes": "Higher quality quantization"
          },
          {
            "name": "Llama 3 70B Instruct Q4",
            "tag": "llama3:70b-instruct-q4_0",
            "size": 15000000000,
            "family": "llama",
            "quant": "q4_0",
            "notes": "Large 70B model for complex tasks"
          },
          {
            "name": "Code Llama 7B Q4",
            "tag": "codellama:7b-instruct-q4_0",
            "size": 1800000000,
            "family": "codellama",
            "quant": "q4_0",
            "notes": "Specialized for coding tasks"
          },
          {
            "name": "Code Llama 13B Q4",
            "tag": "codellama:13b-instruct-q4_0",
            "size": 3500000000,
            "family": "codellama",
            "quant": "q4_0",
            "notes": "Larger Code Llama"
          },
          {
            "name": "Code Llama 34B Q4",
            "tag": "codellama:34b-instruct-q4_0",
            "size": 8000000000,
            "family": "codellama",
            "quant": "q4_0",
            "notes": "Very large Code Llama"
          },
          {
            "name": "Mistral 7B Instruct Q5",
            "tag": "mistral:7b-instruct-q5_1",
            "size": 1700000000,
            "family": "mistral",
            "quant": "q5_1",
            "notes": "Fast and efficient"
          },
          {
            "name": "Mixtral 8x7B Instruct Q3",
            "tag": "mixtral:8x7b-instruct-v0.1-q3_K_M",
            "size": 7500000000,
            "family": "mistral",
            "quant": "q3_K_M",
            "notes": "Mixture of experts"
          },
          {
            "name": "Phi-3 Mini 3.8B Q4",
            "tag": "phi3:3.8b-mini-instruct-4k-q4_0",
            "size": 900000000,
            "family": "phi",
            "quant": "q4_0",
            "notes": "Microsoft Phi-3"
          },
          {
            "name": "Gemma 7B Q4",
            "tag": "gemma:7b-instruct-q4_0",
            "size": 1800000000,
            "family": "gemma",
            "quant": "q4_0",
            "notes": "Google Gemma"
          },
          {
            "name": "Qwen 7B Chat Q4",
            "tag": "qwen:7b-chat-q4_0",
            "size": 1900000000,
            "family": "qwen",
            "quant": "q4_0",
            "notes": "Alibaba Qwen"
          }
        ]

model_catalog_service = ModelCatalogService()
