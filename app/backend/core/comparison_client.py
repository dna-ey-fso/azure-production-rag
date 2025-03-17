import requests

# Define the base URL of your FastAPI application
base_url = "http://127.0.0.1:8000"

# Define the payload for the /execute_cascade endpoint
cascade_payload = {
    "prompt": "What is the capital of France?"
}

# Call the /execute_cascade endpoint
cascade_response = requests.post(f"{base_url}/execute_cascade", json=cascade_payload)

# Print the response from the /execute_cascade endpoint
print("Response from /execute_cascade:")
print(cascade_response.json())

# Define the payload for the /execute_gpt4o endpoint
gpt4o_payload = {
    "prompt": "What is the capital of France?"
}

# Call the /execute_gpt4o endpoint
gpt4o_response = requests.post(f"{base_url}/execute_gpt4o", json=gpt4o_payload)

# Print the response from the /execute_gpt4o endpoint
print("Response from /execute_gpt4o:")
print(gpt4o_response.json())
