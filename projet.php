<?php
// Vérifier que le formulaire a été soumis

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Connexion à la base de données
    $mysqli = new mysqli("lochalhost", "root", "", "essaie_sql");
     // Vérification de la connexion
    if ($mysqli->connect_errno) {
        die("Échec de la connexion : " . $mysqli->connect_errno);
    }

    // Vérification du formulaire de reservation
    if (isset($_POST['nom']) && isset($_POST['prenom']) && isset($_POST['maison_id'])) {
        $name = $_POST['nom'];
        $prenom = $_POST['prenom'];
        $email = isset($_POST['email']) ? $_POST['email'] : null;
        $tel = isset($_POST['telephone']) ? $_POST['telephone'] : null;
        $maison_id = $_POST['maison_id'];

        // recupérer le json de la maison
        $json = file_get_contents('Maisons.json');
        $maisons = json_decode($json, true);
        $maison_reservee = null;
        foreach ($maisons as $maison){
            if ($maison['id'] == $maison_id){
                $maison_reservee = $maison;
                break;
            }
        }
        // pour enregistrer le client 
        if ($maison_reservee){
             $sql = "INSERT INTO clients (name, prenom, email, tel) VALUES (?, ?, ?, ?)";
            $stmt = $mysqli->prepare($sql);
            if ($stmt) {
                $stmt->bind_param("ssss", $name, $prenom, $email, $tel);
                if ($stmt->execute()) {
                    $idclient = $mysqli->insert_id;
                    echo "Client enregistré.<br>";
                } else {
                    echo "Erreur client : " . $stmt->error . "<br>";
                }
                $stmt->close();
            } else {
                echo "Erreur préparation client : " . $mysqli->error . "<br>";
            }

            // Enregistrement de la réservation maison
             if ($maison_reservee) {
            // Ajout du nom du réservant et du statut disponible
            $sql = "INSERT INTO commande (idclient, maison_id, nom_maison, commune, adresse, chambres, `usage`, prix, image, description, tenantName, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)";
            $stmt = $mysqli->prepare($sql);
            if ($stmt) {
                $stmt->bind_param(
                    "iisssisssss",
                    $idclient,
                    $maison_reservee['id'],
                    $maison_reservee['nom'],
                    $maison_reservee['commune'],
                    $maison_reservee['adresse'],
                    $maison_reservee['chambres'],
                    $maison_reservee['usage'],
                    $maison_reservee['prix'],
                    $maison_reservee['image'],
                    $maison_reservee['description'],
                    $name // tenantName
                );
                if ($stmt->execute()) {
                    echo "DEBUG: Réservation enregistrée avec tenantName = '" . $name . "', available = 0.<br>";
                    echo "Réservation enregistrée.<br>";
                } else {
                    echo "Erreur réservation : " . $stmt->error . "<br>";
                }
                $stmt->close();
            } else {
                echo "Erreur préparation réservation : " . $mysqli->error . "<br>";
            }
             } else {
            echo "Maison non trouvée.<br>";
        }
    }
    if (isset($_POST['liberer_maison_id']) && isset($_POST['liberer_nom'])) {
        $maison_id = $_POST['liberer_maison_id'];
        $nom = $_POST['liberer_nom'];
        // Vérifier que le nom correspond à celui enregistré
        $sql = "SELECT tenantName FROM commande WHERE maison_id = ? AND available = 0 ORDER BY id DESC LIMIT 1";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param("i", $maison_id);
        $stmt->execute();
        $stmt->bind_result($tenantName);
        $stmt->fetch();
        $stmt->close();
        // Debug : afficher le nom attendu et le nom reçu
        echo "DEBUG: Nom attendu = '" . $tenantName . "', nom reçu = '" . $nom . "'.<br>";
        if ($tenantName && strtolower($tenantName) === strtolower($nom)) {
            // Libérer la maison
            $sql = "UPDATE commande SET available = 1, tenantName = '' WHERE maison_id = ? AND available = 0";
            $stmt = $mysqli->prepare($sql);
            $stmt->bind_param("i", $maison_id);
            $stmt->execute();
            $stmt->close();
            echo "Maison libérée.";
        } else {
            echo "Nom incorrect. Vous n'êtes pas autorisé à libérer cette maison.";
        }
    }


        }

    // Vérification du formulaire de contact
    if (isset($_POST['name']) && isset($_POST['mail']) && isset($_POST['message'])) {
        $comnom = $_POST['name'];
        $comemail = $_POST['mail'];
        $commes = $_POST['message'];
        $sql = "INSERT INTO contact (name, mail, message) VALUES (?, ?, ?)";
        $stmt = $mysqli->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("sss", $comnom, $comemail, $commes);
            if ($stmt->execute()) {
                echo "Contact enregistré.<br>";
            } else {
                echo "Erreur contact : " . $stmt->error . "<br>";
            }
            $stmt->close();
        } else {
            echo "Erreur préparation contact : " . $mysqli->error . "<br>";
        }
    }
    $mysqli->close();
    // pour eviter de renvoyer le formulaire en rafraichissant la page
    header("Location: Projet.html?success=1");
    exit();
}
?>