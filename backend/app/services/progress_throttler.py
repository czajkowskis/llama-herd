"""
Progress throttling service for model pull operations.
"""
import time
from typing import Dict, Any, Optional
from ..core.config import settings
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ProgressThrottler:
    """Handles throttling of progress updates to prevent overwhelming clients."""
    
    def __init__(self):
        # Get throttling settings with fallback defaults
        try:
            self.throttle_ms = int(getattr(settings, 'pull_progress_throttle_ms', 500))
            self.percent_delta = float(getattr(settings, 'pull_progress_percent_delta', 2.0))
        except Exception:
            self.throttle_ms = 500
            self.percent_delta = 2.0
    
    def should_emit_progress(
        self, 
        progress: Dict[str, Any], 
        last_emit_time: Optional[float], 
        last_emitted_percent: Optional[float]
    ) -> bool:
        """
        Determine if progress should be emitted based on throttling rules.
        
        Args:
            progress: Current progress data
            last_emit_time: Timestamp of last emission (epoch seconds)
            last_emitted_percent: Last emitted percentage (0-100)
            
        Returns:
            True if progress should be emitted
        """
        now_ts = time.time()
        
        # If we've never emitted for this task, emit immediately
        if last_emit_time is None:
            return True
        
        # Time-based emission
        if (now_ts - last_emit_time) * 1000.0 >= self.throttle_ms:
            return True
        
        # Percent-delta emission (if percent available)
        progress_pct = self._extract_percent(progress)
        if progress_pct is not None:
            if last_emitted_percent is None:
                # If we have a percent now but never emitted percent before, emit
                return True
            elif abs(progress_pct - last_emitted_percent) >= self.percent_delta:
                return True
        
        return False
    
    def _extract_percent(self, progress: Dict[str, Any]) -> Optional[float]:
        """Extract a percent value (0-100) from progress data when available."""
        # Prefer explicit fields
        for key in ('percent', 'progress'):
            if key in progress:
                try:
                    val = float(progress[key])
                    # If given as 0..1 convert to 0..100
                    if 0.0 <= val <= 1.0:
                        val = val * 100.0
                    return float(val)
                except Exception:
                    pass
        
        # Try bytes / total pattern
        for a_key, b_key in (('downloaded_bytes', 'total_bytes'), ('downloaded', 'size'), ('downloaded', 'total')):
            if a_key in progress and b_key in progress:
                try:
                    a = float(progress.get(a_key, 0))
                    b = float(progress.get(b_key, 0))
                    if b > 0:
                        return (a / b) * 100.0
                except Exception:
                    pass
        
        return None
