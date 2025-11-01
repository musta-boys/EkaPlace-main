<?php
header('Content-Type: application/json');

// --- Chemin de l'image par défaut (si aucune n'est uploadée) ---
$default_image_path = 'img/no_image_available.jpg'; 

// --- 1. CONNEXION À LA BASE DE DONNÉES ---
$mysqli = new mysqli("localhost", "root", "", "eka_db"); 
if ($mysqli->connect_errno) {
    $annonces_db = [];
} else {
    // --- 2. RÉCUPÉRATION DES ANNONCES DE PROPRIÉTAIRE ---
    $sql = "SELECT ID, maison_nom, adresse, prix, description, image_path FROM annonces WHERE statut = 'En Attente' OR statut = 'Validée'";
    $result = $mysqli->query($sql);
    $annonces_db = [];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            
            // LOGIQUE CLÉ : Utiliser l'image uploadée ou l'image par défaut si le champ est vide
            $image_to_use = !empty($row['image_path']) ? $row['image_path'] : $default_image_path;

            $annonces_db[] = [
                'id' => 'db-' . $row['ID'], // ID unique pour éviter les conflits
                'nom' => htmlspecialchars($row['maison_nom']),
                'commune' => 'À vérifier', // Info manquante dans le formulaire propriétaire
                'adresse' => htmlspecialchars($row['adresse']),
                'chambres' => 'N/A', // Info manquante
                'usage' => 'Vente/Location', // Info générique
                'prix' => number_format((float)$row['prix'], 2, '.', ''),
                'image' => htmlspecialchars($image_to_use), // Chemin corrigé pour l'affichage
                'description' => htmlspecialchars($row['description']),
                'available' => true, // Les nouvelles annonces sont toujours disponibles
                'tenantName' => null 
            ];
        }
    }
    $mysqli->close();
}

// --- 3. RÉCUPÉRATION DES MAISONS DU FICHIER JSON ---
$maisons_json = [];
if (file_exists('Maisons.json')) {
    $json_data = file_get_contents('Maisons.json');
    // On doit aussi ajouter le statut available/tenantName aux entrées JSON pour la fusion
    $temp_json = json_decode($json_data, true) ?? [];
    
    // Ajout des clés manquantes si non présentes dans le JSON initial
    foreach ($temp_json as $maison) {
        $maison['available'] = $maison['available'] ?? true;
        $maison['tenantName'] = $maison['tenantName'] ?? null;
        $maisons_json[] = $maison;
    }
}

// --- 4. FUSION DES DEUX LISTES ET ENVOI ---
$maisons_completes = array_merge($maisons_json, $annonces_db);

echo json_encode($maisons_completes);
?>