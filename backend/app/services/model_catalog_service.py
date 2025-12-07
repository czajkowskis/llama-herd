import json
import re
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, UTC
from bs4 import BeautifulSoup
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..utils.logging import get_logger
from ..core.config import settings

logger = get_logger(__name__)


class ModelCatalogService:
    """
    Service for managing and providing the model catalog.
    Fetches models from ollama.com/library with caching.
    """

    def __init__(self, cache_ttl_hours: int = 24):
        """
        Initialize the model catalog service.

        Args:
            cache_ttl_hours: Cache time-to-live in hours (default: 24)
        """
        self._cache_ttl = timedelta(hours=cache_ttl_hours)
        self._cached_catalog: Optional[List[Dict[str, Any]]] = None
        self._cache_timestamp: Optional[datetime] = None
        self._base_models_catalog: Optional[List[Dict[str, Any]]] = (
            None  # Quick base models
        )
        self._base_models_timestamp: Optional[datetime] = None
        self._predefined_catalog = self._load_predefined_catalog()
        self._variant_fetch_executor: Optional[ThreadPoolExecutor] = None
        self._scraping_lock = (
            threading.Lock()
        )  # Lock to ensure scraping happens only once
        self._base_scraping_in_progress = (
            False  # Flag to prevent duplicate base scraping
        )
        self._variant_fetch_in_progress = (
            False  # Flag to prevent duplicate variant fetching
        )
        # Load saved catalog from disk on startup
        self._catalog_file = self._get_catalog_file_path()
        self._saved_catalog = self._load_saved_catalog()
        if self._saved_catalog:
            self._cached_catalog = self._saved_catalog
            logger.info(f"Loaded {len(self._saved_catalog)} models from saved catalog")

    def get_catalog(self) -> List[Dict[str, Any]]:
        """
        Returns the model catalog, sorted by popularity (pull count).
        Returns saved catalog by default, or predefined catalog as fallback.
        Does not automatically scrape - use update_catalog() to refresh.
        """
        # Get catalog (saved or predefined)
        catalog = (
            self._cached_catalog if self._cached_catalog else self._predefined_catalog
        )

        # Sort by popularity (pull_count descending, then by name)
        def sort_key(model: Dict[str, Any]) -> Tuple[int, str]:
            pull_count = model.get("pull_count", 0)
            name = model.get("name", model.get("tag", ""))
            # Negative pull_count for descending sort
            return (-pull_count, name.lower())

        return sorted(catalog, key=sort_key)

    def update_catalog(self) -> Dict[str, Any]:
        """
        Manually trigger catalog update by scraping ollama.com/library.
        Saves the results to disk as the new default catalog.

        Returns:
            Dict with 'success', 'message', and 'model_count'
        """
        with self._scraping_lock:
            if self._base_scraping_in_progress or self._variant_fetch_in_progress:
                return {
                    "success": False,
                    "message": "Catalog update already in progress",
                    "model_count": 0,
                }

            self._base_scraping_in_progress = True

        try:
            logger.info("Starting manual catalog update...")
            # Scrape full catalog with variants
            full_catalog = self._scrape_ollama_library()

            if full_catalog and len(full_catalog) > 0:
                # Save to disk
                self._save_catalog(full_catalog)

                # Update in-memory cache
                with self._scraping_lock:
                    self._cached_catalog = full_catalog
                    self._cache_timestamp = datetime.now(UTC)

                logger.info(f"Catalog updated successfully: {len(full_catalog)} models")
                return {
                    "success": True,
                    "message": f"Catalog updated successfully with {len(full_catalog)} models",
                    "model_count": len(full_catalog),
                }
            else:
                logger.warning("Catalog update returned no models")
                return {
                    "success": False,
                    "message": "Failed to scrape models from ollama.com/library",
                    "model_count": 0,
                }
        except Exception as e:
            logger.error(f"Error updating catalog: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error updating catalog: {str(e)}",
                "model_count": 0,
            }
        finally:
            with self._scraping_lock:
                self._base_scraping_in_progress = False

    def _get_catalog_with_cache(self) -> List[Dict[str, Any]]:
        """
        Get catalog with caching logic.
        Returns base models immediately, then fetches variants in background.
        """
        now = datetime.now(UTC)

        # Check if full catalog cache is valid
        if (
            self._cached_catalog is not None
            and self._cache_timestamp is not None
            and (now - self._cache_timestamp) < self._cache_ttl
        ):
            logger.debug("Returning cached model catalog")
            return self._cached_catalog

        # Check if base models cache is valid (for quick return)
        if (
            self._base_models_catalog is not None
            and self._base_models_timestamp is not None
            and (now - self._base_models_timestamp) < self._cache_ttl
        ):
            # Return base models immediately, fetch variants in background (only if not already in progress)
            logger.debug("Returning base models, checking if variants need fetching")
            self._fetch_variants_in_background()
            return self._base_models_catalog

        # No cache, fetch base models quickly first (only once, even with concurrent requests)
        with self._scraping_lock:
            # Double-check after acquiring lock (another thread might have scraped while we waited)
            if (
                self._base_models_catalog is not None
                and self._base_models_timestamp is not None
                and (now - self._base_models_timestamp) < self._cache_ttl
            ):
                return self._base_models_catalog

            # Check if scraping is already in progress
            if self._base_scraping_in_progress:
                logger.debug("Base models scraping already in progress, using fallback")
                # Release lock and return fallback
                return self._predefined_catalog

            # Mark scraping as in progress
            self._base_scraping_in_progress = True

        # Do the actual scraping outside the lock to avoid blocking other threads
        try:
            logger.info("Fetching base models from ollama.com/library...")
            base_models = self._scrape_base_models_only()
            if base_models and len(base_models) > 0:
                with self._scraping_lock:
                    self._base_models_catalog = base_models
                    self._base_models_timestamp = datetime.now(UTC)
                logger.info(
                    f"Found {len(base_models)} base models, returning immediately"
                )
                # Start fetching variants in background (only once)
                self._fetch_variants_in_background()
                return base_models
            else:
                logger.warning("No base models found from scraping, using fallback")
        except Exception as e:
            logger.error(
                f"Failed to scrape base models from ollama.com/library: {e}",
                exc_info=True,
            )
        finally:
            with self._scraping_lock:
                self._base_scraping_in_progress = False

        # Fallback to predefined catalog
        logger.info("Using predefined model catalog as fallback")
        return self._predefined_catalog

    def _fetch_variants_in_background(self):
        """Fetch variants in background thread and update cache when done.
        Ensures only one background fetch happens at a time.
        """
        # Check if full catalog is already cached
        now = datetime.now(UTC)
        if (
            self._cached_catalog is not None
            and self._cache_timestamp is not None
            and (now - self._cache_timestamp) < self._cache_ttl
        ):
            return  # Already have full catalog, no need to fetch

        # Check if fetch is already in progress
        with self._scraping_lock:
            if self._variant_fetch_in_progress:
                logger.debug("Variant fetching already in progress, skipping")
                return

            # Double-check cache after acquiring lock
            if (
                self._cached_catalog is not None
                and self._cache_timestamp is not None
                and (now - self._cache_timestamp) < self._cache_ttl
            ):
                return

            self._variant_fetch_in_progress = True

        if self._variant_fetch_executor is None:
            self._variant_fetch_executor = ThreadPoolExecutor(max_workers=1)

        def update_cache():
            try:
                logger.info("Fetching variants in background...")
                full_catalog = self._scrape_ollama_library()
                if full_catalog:
                    with self._scraping_lock:
                        self._cached_catalog = full_catalog
                        self._cache_timestamp = datetime.now(UTC)
                    logger.info(
                        f"Background fetch complete: {len(full_catalog)} models with variants"
                    )
            except Exception as e:
                logger.warning(f"Background variant fetch failed: {e}")
            finally:
                with self._scraping_lock:
                    self._variant_fetch_in_progress = False

        # Submit background task (fire and forget)
        self._variant_fetch_executor.submit(update_cache)

    def _scrape_base_models_only(self) -> Optional[List[Dict[str, Any]]]:
        """
        Quickly scrape only base models from the library page (no variants).
        Filters out cloud-only models.

        Returns:
            List of base model dictionaries, or None if scraping fails
        """
        url = "https://ollama.com/library"
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; llama-herd/1.0; +https://github.com/your-repo/llama-herd)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "lxml")
            models = []

            # Try to find model links - they typically follow pattern /library/{model_name}
            model_links = soup.find_all("a", href=re.compile(r"/library/[^/]+$"))
            logger.info(f"Found {len(model_links)} model links on library page")
            seen_base_models = set()
            cloud_count = 0

            # Collect base models and filter out cloud models
            for link in model_links:
                href = link.get("href", "")
                match = re.search(r"/library/([^/]+)$", href)
                if match:
                    base_model = match.group(1)
                    if base_model not in seen_base_models:
                        seen_base_models.add(base_model)

                        # Check if this is a cloud-only model
                        # Only check the immediate model card (li or direct parent), not higher containers
                        parent = link.parent
                        is_cloud = False
                        if parent:
                            # Find the model card container (usually an <li> or direct parent <a>)
                            model_card = None
                            if parent.name == "li":
                                model_card = parent
                            elif parent.name == "a":
                                # The link itself might be the card
                                model_card = parent
                            else:
                                # Look for the closest li or a ancestor
                                model_card = parent.find_parent(["li", "a"])

                            if model_card:
                                # Only check within this specific model card
                                cloud_badges = model_card.find_all(
                                    "span", class_=re.compile(r"bg-cyan", re.I)
                                )
                                # Check if any badge contains "cloud" text
                                for badge in cloud_badges:
                                    badge_text = badge.get_text().lower().strip()
                                    if badge_text == "cloud":
                                        is_cloud = True
                                        break

                        # Skip cloud-only models
                        if is_cloud:
                            cloud_count += 1
                            logger.debug(f"Skipping cloud-only model: {base_model}")
                            continue

                        # Get description from the library page
                        description = None
                        if parent:
                            desc_elem = parent.find_next("p")
                            if not desc_elem:
                                container = parent.find_parent(
                                    ["div", "article", "section"]
                                )
                                if container:
                                    desc_elem = container.find(
                                        "p",
                                        class_=re.compile(
                                            r"text|description|break", re.I
                                        ),
                                    )
                            if desc_elem:
                                desc_text = desc_elem.get_text(strip=True)
                                if desc_text and len(desc_text) > 10:
                                    description = desc_text[:200]

                        # Extract pull count (popularity indicator)
                        pull_count = 0
                        if parent:
                            # Look for pull count in the model card
                            pull_elem = parent.find(attrs={"x-test-pull-count": True})
                            if not pull_elem:
                                # Try finding in parent container
                                container = parent.find_parent(
                                    ["li", "div", "article", "section"]
                                )
                                if container:
                                    pull_elem = container.find(
                                        attrs={"x-test-pull-count": True}
                                    )

                            if pull_elem:
                                pull_text = pull_elem.get_text(strip=True)
                                pull_count = self._parse_pull_count(pull_text)

                        # Create base model entry
                        family, quant = self._parse_model_tag(base_model)
                        models.append(
                            {
                                "name": self._format_model_name(base_model),
                                "tag": base_model,
                                "family": family,
                                "quant": quant,
                                "description": description,
                                "notes": description,
                                "pull_count": pull_count,
                            }
                        )

            logger.info(
                f"Scraped {len(models)} base models (filtered out {cloud_count} cloud models)"
            )
            if len(models) == 0 and len(model_links) > 0:
                logger.warning(
                    f"Found {len(model_links)} links but no models after filtering. This might indicate a parsing issue."
                )
            return models if models else None

        except requests.exceptions.RequestException as e:
            logger.error(f"Network error while scraping base models: {e}")
            return None
        except Exception as e:
            logger.error(
                f"Unexpected error while scraping base models: {e}",
                exc_info=True,
            )
            return None

    def _scrape_ollama_library(self) -> Optional[List[Dict[str, Any]]]:
        """
        Scrape models from https://ollama.com/library with all variants.
        Filters out cloud-only models.

        Returns:
            List of model dictionaries with variants, or None if scraping fails
        """
        url = "https://ollama.com/library"
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; llama-herd/1.0; +https://github.com/your-repo/llama-herd)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "lxml")
            models = []

            # Try to find model links - they typically follow pattern /library/{model_name}
            model_links = soup.find_all("a", href=re.compile(r"/library/[^/]+$"))
            seen_base_models = set()
            all_model_tags = set()

            # First pass: collect all base models (excluding cloud)
            base_models = []
            for link in model_links:
                href = link.get("href", "")
                match = re.search(r"/library/([^/]+)$", href)
                if match:
                    base_model = match.group(1)
                    if base_model not in seen_base_models:
                        seen_base_models.add(base_model)

                        # Check if this is a cloud-only model
                        # Only check the immediate model card (li or direct parent), not higher containers
                        parent = link.parent
                        is_cloud = False
                        if parent:
                            # Find the model card container (usually an <li> or direct parent <a>)
                            model_card = None
                            if parent.name == "li":
                                model_card = parent
                            elif parent.name == "a":
                                # The link itself might be the card
                                model_card = parent
                            else:
                                # Look for the closest li or a ancestor
                                model_card = parent.find_parent(["li", "a"])

                            if model_card:
                                # Only check within this specific model card
                                cloud_badges = model_card.find_all(
                                    "span", class_=re.compile(r"bg-cyan", re.I)
                                )
                                # Check if any badge contains "cloud" text (exact match to avoid false positives)
                                for badge in cloud_badges:
                                    badge_text = badge.get_text().lower().strip()
                                    if badge_text == "cloud":
                                        is_cloud = True
                                        break

                        # Skip cloud-only models
                        if is_cloud:
                            logger.debug(f"Skipping cloud-only model: {base_model}")
                            continue

                        # Get description from the library page
                        description = None
                        if parent:
                            desc_elem = parent.find_next("p")
                            if not desc_elem:
                                container = parent.find_parent(
                                    ["div", "article", "section"]
                                )
                                if container:
                                    desc_elem = container.find(
                                        "p",
                                        class_=re.compile(
                                            r"text|description|break", re.I
                                        ),
                                    )
                            if desc_elem:
                                desc_text = desc_elem.get_text(strip=True)
                                if desc_text and len(desc_text) > 10:
                                    description = desc_text[:200]

                        # Extract pull count (popularity indicator)
                        pull_count = 0
                        if parent:
                            pull_elem = parent.find(attrs={"x-test-pull-count": True})
                            if not pull_elem:
                                container = parent.find_parent(
                                    ["li", "div", "article", "section"]
                                )
                                if container:
                                    pull_elem = container.find(
                                        attrs={"x-test-pull-count": True}
                                    )
                            if pull_elem:
                                pull_text = pull_elem.get_text(strip=True)
                                pull_count = self._parse_pull_count(pull_text)

                        base_models.append((base_model, description, pull_count))

            # Second pass: visit each model's page to get all variants (in parallel)
            logger.info(
                f"Found {len(base_models)} base models, fetching variants in parallel..."
            )

            # Use thread pool for parallel requests (limit to 10 concurrent to be respectful)
            max_workers = min(10, len(base_models))
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all scraping tasks
                future_to_model = {
                    executor.submit(
                        self._scrape_model_variants,
                        base_model,
                        base_description,
                        headers,
                        pull_count,
                    ): (base_model, base_description, pull_count)
                    for base_model, base_description, pull_count in base_models
                }

                # Process results as they complete
                completed = 0
                for future in as_completed(future_to_model):
                    completed += 1
                    base_model, base_description, pull_count = future_to_model[future]
                    try:
                        variants = future.result()
                        for variant in variants:
                            variant_tag = variant["tag"]
                            if variant_tag not in all_model_tags:
                                all_model_tags.add(variant_tag)
                                # Ensure variant has pull_count (inherit from base if not set)
                                if "pull_count" not in variant:
                                    variant["pull_count"] = pull_count
                                models.append(variant)
                        if completed % 10 == 0:
                            logger.debug(
                                f"Processed {completed}/{len(base_models)} models..."
                            )
                    except Exception as e:
                        logger.warning(
                            f"Failed to fetch variants for {base_model}: {e}"
                        )
                        # Still add base model if we couldn't get variants
                        family, quant = self._parse_model_tag(base_model)
                        if base_model not in all_model_tags:
                            all_model_tags.add(base_model)
                            models.append(
                                {
                                    "name": self._format_model_name(base_model),
                                    "tag": base_model,
                                    "family": family,
                                    "quant": quant,
                                    "description": base_description,
                                    "notes": base_description,
                                    "pull_count": pull_count,
                                }
                            )

            if not models:
                logger.warning(
                    "No models found, trying fallback extraction from library page"
                )
                # Fallback: look for any text that looks like model tags
                text_content = soup.get_text()
                tag_pattern = re.compile(
                    r"\b([a-z0-9]+(?::[a-z0-9\-_]+)+)\b", re.IGNORECASE
                )
                found_tags = tag_pattern.findall(text_content)

                for tag in found_tags[:100]:  # Limit to first 100 matches
                    if ":" in tag and tag not in all_model_tags:
                        all_model_tags.add(tag)
                        family, quant = self._parse_model_tag(tag)
                        models.append(
                            {
                                "name": self._format_model_name(tag),
                                "tag": tag,
                                "family": family,
                                "quant": quant,
                                "pull_count": 0,  # Default for fallback models
                            }
                        )

            return models if models else None

        except requests.exceptions.RequestException as e:
            logger.error(f"Network error while scraping ollama.com/library: {e}")
            return None
        except Exception as e:
            logger.error(
                f"Unexpected error while scraping ollama.com/library: {e}",
                exc_info=True,
            )
            return None

    def _scrape_model_variants(
        self,
        base_model: str,
        base_description: Optional[str],
        headers: Dict[str, str],
        pull_count: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Scrape all variants for a specific model by visiting its page and tags page.

        Args:
            base_model: Base model name (e.g., "llama3")
            base_description: Description from the library page
            headers: HTTP headers to use for requests

        Returns:
            List of model variant dictionaries
        """
        variants = []
        variant_tags = set()
        variant_sizes = {}  # Map of tag -> size in bytes

        # Try the main model page first (with shorter timeout for faster scraping)
        model_url = f"https://ollama.com/library/{base_model}"
        try:
            response = requests.get(model_url, headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "lxml")
                text_content = soup.get_text()

                # Look for model tags in the page (e.g., "ollama pull llama3:8b-instruct-q4_0")
                # Pattern: ollama pull <tag> or just the tag itself
                tag_patterns = [
                    # Match "ollama pull <tag>" commands
                    re.compile(
                        r"ollama\s+pull\s+("
                        + re.escape(base_model)
                        + r":[a-z0-9\.\-_:]+)",
                        re.IGNORECASE,
                    ),
                    # Match tags in code blocks
                    re.compile(
                        r"<code[^>]*>.*?("
                        + re.escape(base_model)
                        + r":[a-z0-9\.\-_:]+)",
                        re.IGNORECASE | re.DOTALL,
                    ),
                    # Match standalone tags
                    re.compile(
                        r"\b(" + re.escape(base_model) + r":[a-z0-9\.\-_:]+)\b",
                        re.IGNORECASE,
                    ),
                ]

                for pattern in tag_patterns:
                    matches = pattern.findall(text_content)
                    for match in matches:
                        # Extract tag from match (might be a tuple or string)
                        tag = (
                            match
                            if isinstance(match, str)
                            else match[0]
                            if match
                            else None
                        )
                        if tag and ":" in tag and tag not in variant_tags:
                            variant_tags.add(tag)

                            # Try to find size for this variant
                            # Look for size patterns near the tag in the HTML
                            size_pattern = re.compile(
                                r"(\d+\.?\d*)\s*(GB|MB|TB|KB)",
                                re.IGNORECASE,
                            )

                            # Search in code blocks that might contain the tag
                            code_blocks = soup.find_all("code")
                            for code_block in code_blocks:
                                code_text = code_block.get_text()
                                if tag in code_text:
                                    # Look for size in the same code block
                                    size_matches = size_pattern.findall(code_text)
                                    if size_matches:
                                        # Take the first size found (usually the model size)
                                        size_str = (
                                            f"{size_matches[0][0]} {size_matches[0][1]}"
                                        )
                                        parsed_size = self._parse_size(size_str)
                                        if parsed_size:
                                            variant_sizes[tag] = parsed_size
                                            break

                            # Also search in the text content around the tag
                            if tag not in variant_sizes:
                                # Find position of tag in text
                                tag_pos = text_content.find(tag)
                                if tag_pos >= 0:
                                    # Look for size within 200 characters after the tag
                                    context = text_content[tag_pos : tag_pos + 200]
                                    size_matches = size_pattern.findall(context)
                                    if size_matches:
                                        size_str = (
                                            f"{size_matches[0][0]} {size_matches[0][1]}"
                                        )
                                        parsed_size = self._parse_size(size_str)
                                        if parsed_size:
                                            variant_sizes[tag] = parsed_size

                # Also try to find description on the model page
                if not base_description:
                    desc_elem = soup.find(
                        "p", class_=re.compile(r"text|description", re.I)
                    )
                    if not desc_elem:
                        desc_elem = soup.find("p")
                    if desc_elem:
                        desc_text = desc_elem.get_text(strip=True)
                        if desc_text and len(desc_text) > 10:
                            base_description = desc_text[:200]

        except Exception as e:
            logger.debug(f"Error fetching model page for {base_model}: {e}")

        # Try the tags page for more complete variant list (only if we didn't find many variants)
        # Skip tags page if we already found variants to speed things up
        if len(variant_tags) < 3:
            tags_url = f"https://ollama.com/library/{base_model}/tags"
            try:
                response = requests.get(tags_url, headers=headers, timeout=5)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "lxml")
                    text_content = soup.get_text()

                    # Extract all tags from the tags page
                    tag_pattern = re.compile(
                        r"\b(" + re.escape(base_model) + r":[a-z0-9\.\-_:]+)\b",
                        re.IGNORECASE,
                    )
                    matches = tag_pattern.findall(text_content)
                    for tag in matches:
                        if ":" in tag and tag not in variant_tags:
                            variant_tags.add(tag)
            except Exception as e:
                logger.debug(f"Error fetching tags page for {base_model}: {e}")

        # If no variants found, at least include the base model
        if not variant_tags:
            variant_tags.add(base_model)

        # Create model entries for each variant
        for tag in variant_tags:
            family, quant = self._parse_model_tag(tag)
            variant_data = {
                "name": self._format_model_name(tag),
                "tag": tag,
                "family": family,
                "quant": quant,
                "description": base_description,
                "notes": base_description,
                "pull_count": pull_count,  # Inherit from base model
                "size": variant_sizes.get(tag),  # Size in bytes if found
            }
            variants.append(variant_data)

        return variants

    def _parse_pull_count(self, pull_text: str) -> int:
        """
        Parse pull count text (e.g., "5M", "665.1K", "1.2M") into integer.

        Args:
            pull_text: Text like "5M", "665.1K", "1.2M", "1234"

        Returns:
            Integer pull count, or 0 if parsing fails
        """
        if not pull_text:
            return 0

        # Remove any non-numeric/decimal/letter characters
        pull_text = pull_text.strip().upper().replace(",", "")

        # Match pattern: number (optional decimal) + optional suffix (K, M, B, T)
        match = re.match(r"^(\d+(?:\.\d+)?)\s*([KMBT]?)$", pull_text)
        if not match:
            return 0

        number = float(match.group(1))
        suffix = match.group(2)

        multipliers = {
            "K": 1_000,
            "M": 1_000_000,
            "B": 1_000_000_000,
            "T": 1_000_000_000_000,
        }
        multiplier = multipliers.get(suffix, 1)

        return int(number * multiplier)

    def _parse_size(self, size_text: str) -> Optional[int]:
        """
        Parse size text (e.g., "4.7 GB", "7 GB", "500 MB") into bytes.

        Args:
            size_text: Text like "4.7 GB", "7 GB", "500 MB", "1.2 TB"

        Returns:
            Integer size in bytes, or None if parsing fails
        """
        if not size_text:
            return None

        # Remove any non-numeric/decimal/letter characters except spaces
        size_text = size_text.strip().upper().replace(",", "")

        # Match pattern: number (optional decimal) + unit (GB, MB, TB, KB)
        match = re.match(r"^(\d+(?:\.\d+)?)\s*(GB|MB|TB|KB)$", size_text)
        if not match:
            return None

        number = float(match.group(1))
        unit = match.group(2)

        multipliers = {
            "KB": 1_000,
            "MB": 1_000_000,
            "GB": 1_000_000_000,
            "TB": 1_000_000_000_000,
        }
        multiplier = multipliers.get(unit, 1)

        return int(number * multiplier)

    def _parse_model_tag(self, tag: str) -> Tuple[str, Optional[str]]:
        """
        Parse a model tag to extract family and quantization.

        Args:
            tag: Model tag (e.g., "llama3:8b-instruct-q4_0")

        Returns:
            Tuple of (family, quant) where quant may be None
        """
        # Extract family (part before first colon)
        family = tag.split(":")[0] if ":" in tag else tag.split("/")[-1].split(":")[0]

        # Try to extract quantization
        quant = None
        quant_patterns = [
            r"q(\d+[km]?[_\.]?\w*)",  # q4_0, q5_1, q3_K_M, etc.
            r"quant[_-]?(\w+)",  # quant-4, quant_4, etc.
        ]

        for pattern in quant_patterns:
            match = re.search(pattern, tag, re.IGNORECASE)
            if match:
                quant = match.group(1).lower()
                break

        return family, quant

    def _format_model_name(self, tag: str) -> str:
        """
        Format a model tag into a human-readable name.

        Args:
            tag: Model tag (e.g., "llama3:8b-instruct-q4_0")

        Returns:
            Formatted name (e.g., "Llama 3 8B Instruct Q4")
        """
        # Remove quantization suffix for display
        display_tag = re.sub(r"[-_]?q\d+[km]?[_\.]?\w*", "", tag, flags=re.IGNORECASE)
        display_tag = re.sub(
            r"[-_]?quant[_-]?\w+", "", display_tag, flags=re.IGNORECASE
        )

        # Split by colon and format
        parts = display_tag.split(":")
        if len(parts) >= 2:
            base = parts[0]
            variant = parts[1]

            # Format base name
            base_formatted = base.replace("-", " ").replace("_", " ").title()

            # Format variant
            variant_formatted = variant.replace("-", " ").replace("_", " ")

            # Capitalize numbers with units (e.g., "8b" -> "8B") - keep them together
            def upper_repl(match):
                return f"{match.group(1)}{match.group(2).upper()}"

            # Replace number+unit patterns (e.g., "8b", "70b") to keep them together
            variant_formatted = re.sub(
                r"(\d+)([a-z]+)", upper_repl, variant_formatted, flags=re.IGNORECASE
            )
            # Apply title case, but preserve the number+unit patterns we just fixed
            # Split by spaces, capitalize each word, then rejoin
            words = variant_formatted.split()
            words = [
                word.title() if not re.match(r"^\d+[A-Z]+$", word) else word
                for word in words
            ]
            variant_formatted = " ".join(words)

            return f"{base_formatted} {variant_formatted}".strip()

        # Fallback: just format the tag
        return tag.replace("-", " ").replace("_", " ").replace(":", " ").title()

    def _get_catalog_file_path(self) -> Path:
        """Get the path to the saved catalog file."""
        data_dir = Path(settings.data_directory)
        catalog_file = data_dir / "model_catalog.json"
        return catalog_file

    def _load_saved_catalog(self) -> Optional[List[Dict[str, Any]]]:
        """Load catalog from saved file."""
        try:
            if self._catalog_file.exists():
                with open(self._catalog_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "models" in data:
                        return data["models"]
                    elif isinstance(data, list):
                        return data
                    else:
                        logger.warning(
                            f"Invalid catalog file format: {self._catalog_file}"
                        )
                        return None
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse catalog file {self._catalog_file}: {e}")
            return None
        except Exception as e:
            logger.warning(f"Failed to load catalog file {self._catalog_file}: {e}")
            return None
        return None

    def _save_catalog(self, catalog: List[Dict[str, Any]]) -> bool:
        """Save catalog to disk."""
        try:
            # Ensure directory exists
            self._catalog_file.parent.mkdir(parents=True, exist_ok=True)

            # Save with metadata
            data = {
                "models": catalog,
                "updated_at": datetime.now(UTC).isoformat(),
                "model_count": len(catalog),
            }

            # Write atomically (write to temp file, then rename)
            temp_file = self._catalog_file.with_suffix(".json.tmp")
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # Atomic rename
            temp_file.replace(self._catalog_file)
            logger.info(f"Saved catalog to {self._catalog_file}")
            return True
        except Exception as e:
            logger.error(
                f"Failed to save catalog to {self._catalog_file}: {e}", exc_info=True
            )
            return False

    def _load_predefined_catalog(self) -> List[Dict[str, Any]]:
        """
        Loads the predefined model catalog as fallback.
        """
        return [
            {
                "name": "Llama 3 8B Instruct Q4",
                "tag": "llama3:8b-instruct-q4_0",
                "size": 1900000000,
                "family": "llama",
                "quant": "q4_0",
                "notes": "Latest Llama 3 model, great for general chat",
                "pull_count": 0,
            },
            {
                "name": "Llama 3 8B Instruct Q5",
                "tag": "llama3:8b-instruct-q5_0",
                "size": 2400000000,
                "family": "llama",
                "quant": "q5_0",
                "notes": "Higher quality quantization",
                "pull_count": 0,
            },
            {
                "name": "Llama 3 70B Instruct Q4",
                "tag": "llama3:70b-instruct-q4_0",
                "size": 15000000000,
                "family": "llama",
                "quant": "q4_0",
                "notes": "Large 70B model for complex tasks",
                "pull_count": 0,
            },
            {
                "name": "Code Llama 7B Q4",
                "tag": "codellama:7b-instruct-q4_0",
                "size": 1800000000,
                "family": "codellama",
                "quant": "q4_0",
                "notes": "Specialized for coding tasks",
                "pull_count": 0,
            },
            {
                "name": "Code Llama 13B Q4",
                "tag": "codellama:13b-instruct-q4_0",
                "size": 3500000000,
                "family": "codellama",
                "quant": "q4_0",
                "notes": "Larger Code Llama",
                "pull_count": 0,
            },
            {
                "name": "Code Llama 34B Q4",
                "tag": "codellama:34b-instruct-q4_0",
                "size": 8000000000,
                "family": "codellama",
                "quant": "q4_0",
                "notes": "Very large Code Llama",
                "pull_count": 0,
            },
            {
                "name": "Mistral 7B Instruct Q5",
                "tag": "mistral:7b-instruct-q5_1",
                "size": 1700000000,
                "family": "mistral",
                "quant": "q5_1",
                "notes": "Fast and efficient",
                "pull_count": 0,
            },
            {
                "name": "Mixtral 8x7B Instruct Q3",
                "tag": "mixtral:8x7b-instruct-v0.1-q3_K_M",
                "size": 7500000000,
                "family": "mistral",
                "quant": "q3_K_M",
                "notes": "Mixture of experts",
                "pull_count": 0,
            },
            {
                "name": "Phi-3 Mini 3.8B Q4",
                "tag": "phi3:3.8b-mini-instruct-4k-q4_0",
                "size": 900000000,
                "family": "phi",
                "quant": "q4_0",
                "notes": "Microsoft Phi-3",
                "pull_count": 0,
            },
            {
                "name": "Gemma 7B Q4",
                "tag": "gemma:7b-instruct-q4_0",
                "size": 1800000000,
                "family": "gemma",
                "quant": "q4_0",
                "notes": "Google Gemma",
                "pull_count": 0,
            },
            {
                "name": "Qwen 7B Chat Q4",
                "tag": "qwen:7b-chat-q4_0",
                "size": 1900000000,
                "family": "qwen",
                "quant": "q4_0",
                "notes": "Alibaba Qwen",
                "pull_count": 0,
            },
        ]


model_catalog_service = ModelCatalogService()
