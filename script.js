document.addEventListener("DOMContentLoaded", () => {
  //FONCTIONNALITE DU BURGER
  const burger = document.querySelector(".burger");
  const lienav = document.querySelector("nav ul");

  if (burger && lienav) {
    burger.addEventListener("click", () => {
      lienav.classList.toggle("nav-active");
      burger.classList.toggle("toggle");
    });
  }

  //FONCTIONNALITE POUR FILTRE
  let maisons = [];
  const boxGalllerie = document.getElementById("maisons-gallery");
  const searchForm = document.getElementById("Recherches-form");

  // CHEMIN PAR DÉFAUT SI L'IMAGE EST MANQUANTE EN BASE DE DONNÉES
  const DEFAULT_IMAGE = "img/no_image_available.jpg";

  // CHARGEUR DE MAISONS : Appelle fetch_maisons.php pour obtenir les données fusionnées (JSON + DB)
  async function chargerMaisons() {
    try {
      const response = await fetch("fetch_maisons.php"); // Cible le script de fusion
      if (!response.ok) {
        throw new Error("Erreur HTTP: " + response.status);
      }
      maisons = await response.json();
      affichageMaison(maisons);
    } catch (error) {
      console.error("Erreur lors du chargement des maisons:", error);
      boxGalllerie.innerHTML =
        "<p>Désolé, impossible de charger les maisons pour le moment.</p>";
    }
  }

  chargerMaisons();

  function affichageMaison(listeMaison) {
    boxGalllerie.innerHTML = "";

    if (listeMaison.length === 0) {
      boxGalllerie.innerHTML = "<p>Aucune correspondance à vos critères</p>";
      return;
    }

    const currentUser = sessionStorage.getItem("currentTenant") || "";

    listeMaison.forEach((maison) => {
      // isAvailable est true si la maison n'a pas été réservée
      const isAvailable = maison.available !== false;
      const statusText = isAvailable
        ? "Disponible"
        : `Réservée par ${maison.tenantName || "un utilisateur"}`;
      const statusClass = isAvailable ? "status-available" : "status-reserved";

      // LOGIQUE CLÉ AJUSTÉE pour l'affichage de l'image
      const imagePath =
        maison.image && maison.image.trim() !== ""
          ? maison.image
          : DEFAULT_IMAGE;

      let buttonHTML = "";
      const maisonId = maison.id;

      if (isAvailable) {
        buttonHTML = `<button class="btn-reserve cta-button" data-id="${maisonId}">Réserver</button>`;
      } else if (maison.tenantName === currentUser) {
        buttonHTML = `<button class="btn-libere cta-button" data-id="${maisonId}">Libérer</button>`;
      }

      const maisonCarteHTML = `
          <article class="maison-card-v2">
              <img src="${imagePath}" alt="${maison.nom}"/>
              <div class="card-overlay">
                  <div class="overlay-content">
                      <h3>${maison.nom}</h3>
                      <p class="description">${maison.description}</p>
                      <p class="location"><i class="fas fa-map-marker-alt"></i> ${maison.adresse}</p>
                      <p class="price"><i class="fas fa-dollar-sign"></i> ${maison.prix}$ / mois</p>
                      <p class="status ${statusClass}">Statut: <strong>${statusText}</strong></p>
                      ${buttonHTML}
                      <a href="#contact" class="details-btn">Plus d'infos</a>
                  </div>
              </div>
          </article>`;
      boxGalllerie.innerHTML += maisonCarteHTML;
    });

    ajouterListenersBoutonsReservation();
    ajouterListenersBoutonsLiberation();
  }

  // Ajout des listeners pour réserver
  function ajouterListenersBoutonsReservation() {
    const boutonsReserve = document.querySelectorAll(".btn-reserve");
    boutonsReserve.forEach((button) => {
      button.addEventListener("click", (event) => {
        const maisonId = event.target.dataset.id;
        ouvrirModalReservation(maisonId);
      });
    });
  }

  // Pour la gestion du formulaire de réservation
  function ouvrirModalReservation(maisonId) {
    document.getElementById("maison-id").value = maisonId;
    const modal = document.getElementById("reservation-modal");
    modal.style.display = "block";
    modal.dataset.maisonId = maisonId;
  }

  // Fermer la boîte
  const closeModalBtn = document.getElementById("close-modal");
  if (closeModalBtn) {
    closeModalBtn.onclick = function () {
      document.getElementById("reservation-modal").style.display = "none";
    };
  }

  // Fermer la boîte si on clique en dehors
  window.onclick = function (event) {
    const modal = document.getElementById("reservation-modal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Ajout des listeners pour libérer
  function ajouterListenersBoutonsLiberation() {
    const boutonsLibere = document.querySelectorAll(".btn-libere");
    boutonsLibere.forEach((button) => {
      button.addEventListener("click", (event) => {
        const maisonId = event.target.dataset.id;
        Liberation(maisonId);
      });
    });
  }

  function Liberation(maisonId) {
    const maison = maisons.find((m) => m.id == maisonId);
    if (!maison) return;

    const releaseName = prompt(
      `Libérer la maison "${maison.nom}" (ID: ${maison.id}). Entrez le nom utilisé lors de la réservation :`
    );
    if (!releaseName || releaseName.trim() === "") {
      alert("Veuillez entrer votre nom.");
      return;
    }

    const formData = new FormData();
    // Retire 'db-' si c'est une annonce DB, sinon garde l'ID numérique
    formData.append(
      "liberer_maison_id",
      maisonId.toString().replace("db-", "")
    );
    formData.append("liberer_nom", releaseName.trim());

    fetch("projet.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((data) => {
        if (data.includes("Maison libérée.")) {
          alert("Maison libérée !");
          chargerMaisons(); // Recharger les maisons pour mettre à jour l'état
        } else {
          alert(data);
        }
      })
      .catch((error) => {
        alert("Erreur lors de la libération !");
      });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const communeChoisie = document.getElementById("commune").value;
      const nbresChambresChoisies = parseInt(
        document.getElementById("chambres").value,
        10
      );
      const pourUsage = document.getElementById("usage").value;

      const filtrageDeMaison = maisons.filter((maison) => {
        const conditionPourCommune =
          communeChoisie === "toutes" || maison.commune === communeChoisie;

        let conditionPourChambre = true;
        const maisonChambres = parseInt(maison.chambres, 10);

        if (nbresChambresChoisies > 0 && !isNaN(maisonChambres)) {
          if (nbresChambresChoisies === 6) {
            conditionPourChambre = maisonChambres >= 6;
          } else {
            conditionPourChambre = maisonChambres === nbresChambresChoisies;
          }
        } else if (nbresChambresChoisies > 0 && isNaN(maisonChambres)) {
          conditionPourChambre = false;
        }

        const conditionPourUsage =
          pourUsage === "tous" || maison.usage === pourUsage;

        return (
          conditionPourCommune && conditionPourChambre && conditionPourUsage
        );
      });
      affichageMaison(filtrageDeMaison);
    });
  }

  // GESTION DU FORMULAIRE DE RÉSERVATION (AJAX)
  const reservationForm = document.getElementById("reservation-form");
  if (reservationForm) {
    reservationForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const formData = new FormData(reservationForm);

      fetch("projet.php", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.text())
        .then((data) => {
          if (data.includes("enregistrée avec succès.")) {
            alert("Réservation enregistrée avec succès !");
            document.getElementById("reservation-modal").style.display = "none";
            chargerMaisons(); // Recharger la liste pour mettre à jour le statut
          } else {
            alert("Erreur lors de la réservation : " + data);
          }
        })
        .catch((error) => {
          alert("Erreur réseau lors de la réservation !");
        });
    });
  }

  // GESTION DU FORMULAIRE PROPRIÉTAIRE (AVEC REDIRECTION CLÉ)
  const ownerAnnouncementForm = document.getElementById(
    "owner-announcement-form"
  );
  if (ownerAnnouncementForm) {
    ownerAnnouncementForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const formData = new FormData(ownerAnnouncementForm);

      fetch("projet.php", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.text())
        .then((data) => {
          if (data.includes("Annonce enregistrée avec succès.")) {
            alert(
              "Votre annonce a été soumise avec succès ! Redirection vers la galerie."
            );
            ownerAnnouncementForm.reset();

            // Redirection après succès, comme vous l'aviez demandé précédemment
            window.location.href = "houses.php";
          } else {
            alert("Erreur lors de l'envoi de l'annonce : " + data);
          }
        })
        .catch((error) => {
          alert("Erreur réseau lors de l'envoi de l'annonce !");
        });
    });
  }

  //FONCTIONNALITE VALIDATION DU FORMULAIRE (Contact)
  const formecontacte = document.getElementById("contact-form");
  const InputNom = document.getElementById("name");
  const InputMail = document.getElementById("mail");
  const InputMessage = document.getElementById("message");
  const formStatus = document.getElementById("form-status");

  if (formecontacte) {
    formecontacte.addEventListener("submit", function (e) {
      e.preventDefault();
      validationInputs();
    });
  }

  function metErreur(input, message) {
    const controldeforme = input.parentElement;
    const small = controldeforme.querySelector("small");
    controldeforme.className = "form-control error";
    small.innerText = message;
  }

  function metReussite(input) {
    const controldeforme = input.parentElement;
    controldeforme.className = "form-control success";
  }

  function Emailval(email) {
    const EmailExpr = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return EmailExpr.test(String(email).toLowerCase());
  }

  function validationInputs() {
    const valeurName = InputNom.value.trim();
    const valeurEmail = InputMail.value.trim();
    const valeurMessage = InputMessage.value.trim();

    let verifValidationForm = true;

    if (valeurName === "") {
      metErreur(InputNom, "Faut compléter le nom");
      verifValidationForm = false;
    } else {
      metReussite(InputNom);
    }

    if (valeurEmail === "") {
      metErreur(InputMail, "Faut compléter l'email");
      verifValidationForm = false;
    } else if (!Emailval(valeurEmail)) {
      metErreur(InputMail, "Cet email n'est pas valide");
      verifValidationForm = false;
    } else {
      metReussite(InputMail);
    }

    if (valeurMessage === "") {
      metErreur(InputMessage, "le message ne doit pas êtrer vide ");
      verifValidationForm = false;
    } else {
      metReussite(InputMessage);
    }

    if (verifValidationForm) {
      const formData = new FormData(formecontacte);

      fetch("projet.php", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (response.redirected) {
            formStatus.innerText =
              "Message envoyé! Nous vous répondons bientôt.";
            formStatus.className = "success";
            formecontacte.reset();
            setTimeout(() => {
              document.querySelectorAll(".form-control").forEach((control) => {
                control.className = "form-control";
              });
              formStatus.innerText = "";
              formStatus.className = "";
            }, 4000);
          } else {
            // Le serveur a répondu (même si pas de redirection)
            return response.text().then((text) => {
              throw new Error("Erreur de l'envoi: " + text);
            });
          }
        })
        .catch((error) => {
          formStatus.innerText = "Erreur lors de l'envoi du message.";
          formStatus.className = "error";
          console.error("Contact form submission error:", error);
        });
    } else {
      formStatus.innerText = "";
      formStatus.className = "";
    }
  }

  //FONCTIONNALITE POUR LE THEME SOMBRE

  const levier_theme = document.getElementById("levier_theme");
  const body = document.body;

  const change_levier = () => {
    body.classList.toggle("dark-theme");

    if (body.classList.contains("dark-theme")) {
      levier_theme.classList.remove("fa-sun");
      levier_theme.classList.add("fa-moon");

      localStorage.setItem("theme", "dark");
    } else {
      levier_theme.classList.remove("fa-moon");
      levier_theme.classList.add("fa-sun");
      localStorage.setItem("theme", "light");
    }
  };

  const themeSauvegardé = localStorage.getItem("theme");
  if (themeSauvegardé === "dark") {
    body.classList.add("dark-theme");

    levier_theme.classList.remove("fa-sun");
    levier_theme.classList.add("fa-moon");
  }
  levier_theme.addEventListener("click", change_levier);
});
