from langsmith import traceable

class AIService:
    def __init__(self):
        pass

    @traceable(name="AI Orchestrator Call")
    async def generate_response(self, prompt: str):
        # TODO: Implement OpenAI -> Gemini -> Groq fallback logic
        pass
