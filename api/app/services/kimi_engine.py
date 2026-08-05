from app.services.claude_engine import (
    ClaudeEngine,
    claude_engine,
    DEFAULT_SYSTEM_PROMPT
)
from app.schemas import ClaudeAnalysisOutput

# Backwards compatibility alias for KimiEngine -> ClaudeEngine
KimiEngine = ClaudeEngine
kimi_engine = claude_engine
KimiAnalysisOutput = ClaudeAnalysisOutput
