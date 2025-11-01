<?php
// Désactiver le cache pour les réponses AJAX (fetch)
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // CONNEXION : UTILISE LA NOUVELLE BASE DE DONNÉES 'eka_db'
    $mysqli = new mysqli("localhost", "root", "", "eka_db"); 
    
    if ($mysqli->connect_errno) {
        http_response_code(500); 
        echo json_encode(["error" => "ERREUR: Échec de la connexion à la base de données 'eka_db'. Vérifiez si le script SQL a été exécuté."]);
        exit;
    }
    
    // -----------------------------------------------------------------------------------
    // A. GESTION DE LA RÉSERVATION 
    // -----------------------------------------------------------------------------------
    if (isset($_POST['nom']) && isset($_POST['prenom']) && isset($_POST['maison_id']) 
        && !isset($_POST['liberer_maison_id']) && !isset($_POST['owner_email'])) {
        
        $name = $_POST['nom'];
        $prenom = $_POST['prenom'];
        $email = $_POST['email'];
        $tel = $_POST['telephone'];
        $maison_id = (int)$_POST['maison_id'];
        
        $idclient = null;
        
        // 1. Chercher/Créer le client
        $sql_select_client = "SELECT ID FROM clients WHERE email = ?";
        $stmt_select = $mysqli->prepare($sql_select_client);
        if($stmt_select){
            $stmt_select->bind_param("s", $email);
            $stmt_select->execute();
            $stmt_select->bind_result($idclient_found);
            if($stmt_select->fetch()){
                $idclient = $idclient_found;
            }
            $stmt_select->close();
        }

        if ($idclient === null) {
             $sql = "INSERT INTO clients (name, prenom, email, tel) VALUES (?, ?, ?, ?)";
             $stmt = $mysqli->prepare($sql);
             if ($stmt) {
                 $stmt->bind_param("ssss", $name, $prenom, $email, $tel);
                 if ($stmt->execute()) {
                     $idclient = $mysqli->insert_id;
                 } else {
                     echo "ERREUR: Impossible d'enregistrer le client : " . $stmt->error;
                     $mysqli->close();
                     exit;
                 }
                 $stmt->close();
             }
        }
        
        // 2. Récupérer les données de la maison depuis le JSON
        $json = file_get_contents('Maisons.json');
        $maisons = json_decode($json, true);
        $maison_reservee = null;
        foreach ($maisons as $maison){
            if ((int)$maison['id'] === $maison_id){
                $maison_reservee = $maison;
                break;
            }
        }
        
        // 3. Enregistrement de la commande (available = 0: Réservée)
        if ($idclient && $maison_reservee) {
            $commune = $maison_reservee['commune'] ?? 'N/A';
            $chambres = $maison_reservee['chambres'] ?? 0;
            $usage = $maison_reservee['usage'] ?? 'N/A';
            
            $sql = "INSERT INTO commande (idclient, maison_id, nom_maison, commune, adresse, chambres, `usage`, prix, image, description, tenantName, available) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)";
            $stmt = $mysqli->prepare($sql);
            if ($stmt) {
                $prix_decimal = (float)$maison_reservee['prix'];
                
                $stmt->bind_param(
                    "iisssissssd", 
                    $idclient,
                    $maison_reservee['id'],
                    $maison_reservee['nom'],
                    $commune,
                    $maison_reservee['adresse'],
                    $chambres,
                    $usage,
                    $prix_decimal,
                    $maison_reservee['image'], // Utilise l'image du JSON
                    $maison_reservee['description'],
                    $name 
                );
                if ($stmt->execute()) {
                    echo "Réservation enregistrée avec succès.";
                } else {
                    echo "ERREUR: Problème lors de l'enregistrement de la réservation : " . $stmt->error;
                }
                $stmt->close();
            } else {
                echo "ERREUR: Problème de préparation de requête de réservation : " . $mysqli->error;
            }
        } else {
            echo "ERREUR: Maison non trouvée dans le JSON ou ID client manquant.";
        }

    }
    
    // -----------------------------------------------------------------------------------
    // B. GESTION DE LA LIBÉRATION 
    // -----------------------------------------------------------------------------------
    if (isset($_POST['liberer_maison_id']) && isset($_POST['liberer_nom']) && !isset($_POST['owner_email'])) {

        $maison_id = (int)$_POST['liberer_maison_id'];
        $nom = $_POST['liberer_nom'];
        
        $sql = "SELECT tenantName, ID FROM commande WHERE maison_id = ? AND available = 0 ORDER BY ID DESC LIMIT 1";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param("i", $maison_id);
        $stmt->execute();
        $stmt->bind_result($tenantName, $commande_id);
        $stmt->fetch();
        $stmt->close();
        
        if ($tenantName && strtolower($tenantName) === strtolower($nom)) {
            $sql_update = "UPDATE commande SET available = 1, tenantName = NULL WHERE ID = ?";
            $stmt_update = $mysqli->prepare($sql_update);
            $stmt_update->bind_param("i", $commande_id);
            if($stmt_update->execute()) {
                echo "Maison libérée avec succès.";
            } else {
                echo "ERREUR: Problème lors de la libération : " . $stmt_update->error;
            }
            $stmt_update->close();
        } else {
            echo "ERREUR: Nom incorrect ou maison non réservée sous ce nom.";
        }
    }
    
    // -----------------------------------------------------------------------------------
    // C. GESTION DU FORMULAIRE D'ANNONCE PROPRIÉTAIRE (MODIFIÉ)
    // -----------------------------------------------------------------------------------
    if (isset($_POST['owner_name']) && isset($_POST['owner_email']) && isset($_POST['adresse_annonce'])) {
        
        // 1. Récupération des données du formulaire
        $owner_name = $_POST['owner_name'];
        $owner_email = $_POST['owner_email'];
        $maison_nom = $_POST['maison_nom_annonce'] ?? 'Annonce sans nom';
        $adresse = $_POST['adresse_annonce'];
        $prix = (float)$_POST['prix_annonce']; 
        $description = $_POST['description_annonce'];

        // Données d'état
        // MODIFICATION : Initialisation à une chaîne vide si aucune image n'est fournie
        $image_path = ''; 
        $statut = 'En Attente';
        $date_soumission = date('Y-m-d H:i:s'); 

        // 2. Gestion de l'Upload d'Image 
        $uploadFileDir = './images_annonces/'; 
        
        // --- Vérifie et crée le dossier si nécessaire (Permissions 0777 pour un environnement de test) ---
        if (!is_dir($uploadFileDir)) {
            if (!mkdir($uploadFileDir, 0777, true)) {
                error_log("ERREUR: Impossible de créer le dossier d'upload: " . $uploadFileDir);
            }
        }

        if (isset($_FILES['image_annonce']) && $_FILES['image_annonce']['error'] === UPLOAD_ERR_OK) {
            $fileTmpPath = $_FILES['image_annonce']['tmp_name'];
            $fileName = $_FILES['image_annonce']['name'];
            $fileNameCmps = explode(".", $fileName);
            $fileExtension = strtolower(end($fileNameCmps));

            $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
            $dest_path = $uploadFileDir . $newFileName;

            $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');
            if (in_array($fileExtension, $allowedfileExtensions)) {
                if (move_uploaded_file($fileTmpPath, $dest_path)) {
                    // Si l'upload réussit, on met à jour le chemin de l'image
                    $image_path = $dest_path; 
                } else {
                    error_log("ERREUR: Échec du déplacement du fichier vers: " . $dest_path);
                }
            }
        }
        var_dump($image_path);
        // 3. Insertion en Base de Données 
        $sql = "INSERT INTO annonces (owner_name, owner_email, maison_nom, adresse, prix, description, image_path, statut, date_soumission) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $mysqli->prepare($sql);
        
        if ($stmt) {
            // Binding : ssssdssss
            $stmt->bind_param("ssssdssss", 
                $owner_name, 
                $owner_email, 
                $maison_nom, 
                $adresse, 
                $prix, 
                $description, 
                $image_path, // Sera '' si l'upload a échoué ou n'a pas eu lieu
                $statut, 
                $date_soumission
            );
            
            if ($stmt->execute()) {
                 // Nous ne faisons plus de 'header' dans un contexte AJAX
                 header('location: houses.html');
            } else {
                echo "ERREUR: Problème lors de l'enregistrement de l'annonce : " . $stmt->error;
            }
            $stmt->close();
        } else {
            echo "ERREUR: Problème de préparation de requête d'annonce : " . $mysqli->error;
        }
    }
    
    // -----------------------------------------------------------------------------------
    // D. GESTION DU FORMULAIRE DE CONTACT 
    // -----------------------------------------------------------------------------------
    if (isset($_POST['name']) && isset($_POST['mail']) && isset($_POST['message']) && !isset($_POST['owner_email'])) {
        $comnom = $_POST['name'];
        $comemail = $_POST['mail'];
        $commes = $_POST['message'];
        $sql = "INSERT INTO contact (name, mail, message) VALUES (?, ?, ?)";
        $stmt = $mysqli->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("sss", $comnom, $comemail, $commes);
            if ($stmt->execute()) {
                // Redirection après succès
                header("Location: index.html?success=contact#contact");
                exit;
            }
            $stmt->close();
        }
    }

    $mysqli->close();
}
?>