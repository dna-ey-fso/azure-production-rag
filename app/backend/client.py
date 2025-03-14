import requests

# L'URL de l'API FastAPI
url = "http://127.0.0.1:8000/execute_cascade"

# Demander à l'utilisateur de saisir une question
question = input("Veuillez entrer votre question : ")

# La donnée à envoyer au serveur avec la question entrée par l'utilisateur
data = {
    "prompt": question
}

# Envoyer la requête POST avec la donnée JSON
response = requests.post(url, json=data)

# Vérifier si la requête a été réussie
if response.status_code == 200:
    # Récupérer la réponse JSON du serveur
    result = response.json()
    
    # Afficher le résultat
    if result["status"] == "success":
        print("Réponse obtenue :", result["result"]["answer"])
        print("Coût :", result["result"]["cost"])
        print("Modèle utilisé :", result["result"]["model_used"])
    else:
        print("Erreur :", result["message"])
else:
    print(f"Erreur lors de la requête : {response.status_code}")
