from sentence_transformers import SentenceTransformer
import numpy as np
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", 'all-MiniLM-L6-v2') # Default model
model_instance = None

def load_model():
    """Loads the sentence-transformer model."""
    global model_instance
    if model_instance is None:
        logger.info(f"Loading sentence-transformer model: {MODEL_NAME}...")
        try:
            model_instance = SentenceTransformer(MODEL_NAME)
            logger.info(f"Model '{MODEL_NAME}' loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading sentence-transformer model '{MODEL_NAME}': {e}", exc_info=True)
            raise  # Re-raise to signal failure
    return model_instance

def get_embedding(text: str) -> list[float]:
    """
    Generates an embedding vector for the given text.
    Returns an empty list if an error occurs or text is invalid.
    """
    if not text or not isinstance(text, str):
        logger.warning("Received empty or invalid text for embedding.")
        return []

    current_model = load_model() # Ensures model is loaded
    if current_model is None:
        logger.error("Model is not loaded. Cannot generate embedding.")
        return []

    try:
        embedding = current_model.encode(text, convert_to_tensor=False)
        # Ensure the embedding is a list of floats (JSON serializable)
        return embedding.tolist() if isinstance(embedding, np.ndarray) else list(embedding)
    except Exception as e:
        logger.error(f"Error generating embedding for text (first 50 chars): '{text[:50]}...': {e}", exc_info=True)
        return []

if __name__ == '__main__':
    # Quick test (will run if the script is executed directly)
    print("Running embedding.py directly for testing...")
    try:
        test_model = load_model()
        sample_text_1 = "This is a test sentence for the JobSense embedding service."
        embedding_vector_1 = get_embedding(sample_text_1)
        if embedding_vector_1:
            print(f"Embedding for '{sample_text_1}': {embedding_vector_1[:5]}... (Dimension: {len(embedding_vector_1)})")
        else:
            print(f"Failed to get embedding for '{sample_text_1}'")

        sample_text_2 = "Another test sentence, focusing on software development."
        embedding_vector_2 = get_embedding(sample_text_2)
        if embedding_vector_2:
            print(f"Embedding for '{sample_text_2}': {embedding_vector_2[:5]}... (Dimension: {len(embedding_vector_2)})")
        else:
            print(f"Failed to get embedding for '{sample_text_2}'")

    except Exception as e:
        print(f"Error during self-test: {e}")