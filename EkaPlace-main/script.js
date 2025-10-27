document.addEventListener('DOMContentLoaded',()=>{

//FONCTIONNALITE DU BURGER

    const burger=document.querySelector('.burger');
    const lienav=document.querySelector('nav ul')

    if(burger && lienav){
        burger.addEventListener('click',()=>{
            lienav.classList.toggle('nav-active');
            burger.classList.toggle('toggle');
        })

    }
    
//FONCTIONNALITE POUR FILTRE

let maisons=[]
const boxGalllerie=document.getElementById('maisons-gallery')
const searchForm=document.getElementById('Recherches-form')

async function chargerMaisons(){
    try{
    const response =await fetch('Maisons.json');
        if(!response.ok){
            throw new Error('Erreur HTTP:${response.status}');
        }
        maisons=await response.json()
        affichageMaison(maisons)
        
    }catch(error){
        console.error('Erreur lors du chargement des maisons:error')
        boxGalllerie.innerHTML='<p>Désolé, impossible de charger les maisons pour le moment.</p>'
    }

}

chargerMaisons();

function affichageMaison(listeMaison){
    boxGalllerie.innerHTML='';

    if(listeMaison.length===0){
        boxGalllerie.innerHTML='<p>Aucune correspondance à vos critères</p>'
        return;
    }
    listeMaison.forEach(maison=>{
function affichageMaison(listeMaison) {
    boxGalllerie.innerHTML = '';

    if (listeMaison.length === 0) {
        boxGalllerie.innerHTML = '<p>Aucune correspondance à vos critères</p>';
        return;
    }}})

    // Récupère le nom du locataire courant (stocké en session)
    const currentUser = sessionStorage.getItem('currentTenant') || '';

    listeMaison.forEach(maison => {
        const isAvailable = maison.available !== false;
        const statusText = isAvailable ? 'Disponible' : `Réservée par ${maison.tenantName || 'un utilisateur'}`;
        const statusClass = isAvailable ? 'status-available' : 'status-reserved';

        let buttonHTML = '';
        if (isAvailable) {
            buttonHTML = `<button class="btn-reserve cta-button" data-id="${maison.id}">Réserver</button>`;
        } else if (maison.tenantName === currentUser) {
            buttonHTML = `<button class="btn-libere cta-button" data-id="${maison.id}">Libérer</button>`;
        }

        const maisonCarteHTML = `
        <article class="maison-card-v2">
            <img src="${maison.image}" alt="${maison.nom}"/>
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
    const boutonsReserve = document.querySelectorAll('.btn-reserve');
    boutonsReserve.forEach(button => {
        button.addEventListener('click', (event) => {
            const maisonId = parseInt(event.target.dataset.id);
            ouvrirModalReservation(maisonId)
            // afficherFormulaireReservation(maisonId);
        });
    });
}
    // Pour la gestion du formulaire de réservation
    function ouvrirModalReservation(maisonId) {
        document.getElementById('maison-id').value = maisonId; // Met à jour l'input caché
        const modal = document.getElementById('reservation-modal');
        modal.style.display = 'block';
        modal.dataset.maisonId = maisonId;
    }

    // Fermer la boîte
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.onclick = function() {
            document.getElementById('reservation-modal').style.display = 'none';
        };
    }

    // Fermer la boîte si on clique en dehors
    window.onclick = function(event) {
        const modal = document.getElementById('reservation-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Gestion du formulaire de réservation
    // Le formulaire de réservation s'envoie vers projet.php
//  fin

// Ajout des listeners pour libérer
function ajouterListenersBoutonsLiberation() {
    const boutonsLibere = document.querySelectorAll('.btn-libere');
    boutonsLibere.forEach(button => {
        button.addEventListener('click', (event) => {
            const maisonId = parseInt(event.target.dataset.id);
            Liberation(maisonId);
        });
    });
}

function afficherFormulaireReservation(maisonId) {
    const maison = maisons.find(m => m.id === maisonId);
    if (!maison) return;

    const reservationName = prompt(`Réserver la maison "${maison.nom}" (ID: ${maison.id}). Entrez votre nom :`);
    if (reservationName && reservationName.trim() !== '') {
        handleReservation(maisonId, reservationName.trim());
    } else if (reservationName !== null) {
        alert("Veuillez entrer votre nom");
        return;
    }
}

function handleReservation(maisonId, tenantName) {
    const maisonIndex = maisons.findIndex(m => m.id === maisonId);
    if (maisonIndex === -1) return;

    if (maisons[maisonIndex].available) {
        maisons[maisonIndex].available = false;
        maisons[maisonIndex].tenantName = tenantName;
        sessionStorage.setItem('currentTenant', tenantName);
        alert(`Maison "${maisons[maisonIndex].nom}" réservée par ${tenantName} !`);
        affichageMaison(maisons);
    } else {
        alert(`Désolé, la maison "${maisons[maisonIndex].nom}" est déjà réservée.`);
    }
}

function Liberation(maisonId) {
    const maison = maisons.find(m => m.id === maisonId);
    if (!maison) return;

    const releaseName = prompt(`Libérer la maison "${maison.nom}" (ID: ${maison.id}). Entrez le nom utilisé lors de la réservation :`);
    if (!releaseName || releaseName.trim() === '') {
        alert("Veuillez entrer votre nom.");
        return;
    }

    // Envoi de la demande de libération au backend PHP
    const formData = new FormData();
    formData.append('liberer_maison_id', maisonId);
    formData.append('liberer_nom', releaseName.trim());

    fetch('projet.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(data => {
        if (data.includes('Maison libérée.')) {
            // Met à jour le statut local
            maison.available = true;
            maison.tenantName = '';
            sessionStorage.setItem('currentTenant', '');
            alert('Maison libérée !');
            affichageMaison(maisons);
        } else {
            alert(data);
        }
    })
    .catch(error => {
        alert('Erreur lors de la libération !');
    });
}

function handleLiberation(maisonId) {
    const maisonIndex = maisons.findIndex(m => m.id === maisonId);
    if (maisonIndex === -1) return;

    maisons[maisonIndex].available = true;
    maisons[maisonIndex].tenantName = '';
    alert(`Maison "${maisons[maisonIndex].nom}" libérée !`);
    affichageMaison(maisons);
}

if(searchForm){
    searchForm.addEventListener('submit',function(event){
        event.preventDefault()

        const communeChoisie=document.getElementById('commune').value;
        const nbresChambresChoisies=parseInt(document. getElementById('chambres').value,10);
        const pourUsage=document.getElementById('usage').value
        const filtrageDeMaison=maisons.filter(maison=>{
            const conditionPourCommune=communeChoisie==='toutes'||maison.commune===communeChoisie   
        
        let conditionPourChambre=true
        if(nbresChambresChoisies>0){
            if(nbresChambresChoisies===6){
                conditionPourChambre=maison.chambres>=6
            }else{
                conditionPourChambre=maison.chambres===nbresChambresChoisies
            }
        }
        const conditionPourUsage=pourUsage==='tous'||maison.usage===pourUsage

        return conditionPourCommune && conditionPourChambre &&conditionPourUsage
    })
    affichageMaison(filtrageDeMaison)

    })
}

// essai pour l'envoi du formulaire de contact en ajax et php

const reservationForm = document.getElementById('reservation-form');
if (reservationForm) {
    reservationForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Empêche l'envoi classique

        const formData = new FormData(reservationForm);

        fetch('projet.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            // Affiche une boîte de confirmation
            alert("Réservation enregistrée avec succès !");
            // Ou affichez un modal personnalisé ici
            document.getElementById('reservation-modal').style.display = 'none';
        })
        .catch(error => {
            alert("Erreur lors de la réservation !");
        });
    });
}

//FONCTIONNALITE VALIDATION DU FORMULAIRE

const formecontacte=document.getElementById('contact-form');
const InputNom=document.getElementById('name');
const InputMail=document.getElementById('mail')
const InputMessage=document.getElementById('message')
const formStatus=document.getElementById('form-status')

if (formecontacte){

    // Le formulaire s'envoye vers projet.php
    // La validation du formulaire se fait par JS via un message
}
function metErreur(input,message){
const controldeforme=input.parentElement;
const small=controldeforme.querySelector('small')
controldeforme.className='form-control error'
small.innerText=message
}

function metReussite(input){
    const controldeforme=input.parentElement;
    controldeforme.className='form-control success';
}

function Emailval(email){
  const EmailExpr=/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
  return EmailExpr.test(String(email).toLowerCase())
}

function validationInputs(){
    const valeurName=InputNom.value.trim()
    const valeurEmail=InputMail.value.trim()
    const valeurMessage=InputMessage.value.trim()

    let verifValidationForm=true;

    if(valeurName===''){
        metErreur(InputNom,'Faut compléter le nom')
        verifValidationForm=false
    }else{

        metReussite(InputNom)
    }

    if(valeurEmail===''){
        metErreur(InputMail,'Faut compléter l\'email')
        verifValidationForm=false
    }else if(!Emailval(valeurEmail)){
        metErreur(InputMail,'Cet email n\'est pas valide')
        verifValidationForm=false
    }else{
        metReussite(InputMail);
    }

    if (valeurMessage===''){
        metErreur(InputMessage,'le message ne doit pas êtrer vide ')
        verifValidationForm=false
    }else{
        metReussite(InputMessage)
    }


    if(verifValidationForm){
        formStatus.innerText="Message envoyé! Nous vous répondons bientôt."

        formStatus.className='success'
        formecontacte.reset()

        setTimeout(()=>{
            document.querySelectorAll('.form-control').forEach(control=>{
                control.className='form-control'
            })
            formStatus.innerText='';
            formStatus.className='';
        },4000)
    }else{
        formStatus.innerText='';
        formStatus.className='';
    }

}


//FONCTIONNALITE POUR LE THEME SOMBRE

    const levier_theme =document.getElementById('levier_theme')
    const body=document.body

    const change_levier=()=>{
        body.classList.toggle('dark-theme')

        if (body.classList.contains('dark-theme')){
            levier_theme.classList.remove('fa-sun')
            levier_theme.classList.add('fa-moon')

            localStorage.setItem('theme','dark')
        }else{
            levier_theme.classList.remove('fa-moon')
            levier_theme.classList.add('fa-sun')
            localStorage.setItem('theme','light')
        }
    }

    const themeSauvegardé=localStorage.getItem('theme')
    if(themeSauvegardé==='dark'){
        body.classList.add('dark-theme')
        

            levier_theme.classList.remove('fa-sun')
            levier_theme.classList.add('fa-moon')
        
    }
levier_theme.addEventListener('click',change_levier);

})





