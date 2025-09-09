/* ================== INITIALISATION FIREBASE ================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Configuration Firebase de l'application (depuis la console)

const firebaseConfig = {
  apiKey: "AIzaSyCtDh5FOD7MsI5tntUhm9e1331vQeuRQSc",
  authDomain: "habilitar-el-mapa.firebaseapp.com",
  databaseURL: "https://habilitar-el-mapa-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "habilitar-el-mapa",
  storageBucket: "habilitar-el-mapa.firebasestorage.app",
  messagingSenderId: "292352801680",
  appId: "1:292352801680:web:3ee8418dee3df382091115",
  measurementId: "G-QTP7TSYWE8"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);



const markersRef = ref(db, "markers");
let map;
let panorama; // panorama global



/*===============TEXTE===============*/

document.addEventListener("DOMContentLoaded", function () {

  if (document.getElementById("animated-text")) {
      startTypingEffect("animated-text", ["La connexion est le signe qu’il y a de la vie de l’autre côté."]);
  }

  if (document.getElementById("animated-text-2")) {
      startTypingEffect("animated-text-2", ["La vraie vie n’est qu’une autre fenêtre"]);
  }

  // Initialise la carte uniquement si on est sur la page "map"
  if (document.getElementById("map")) {
      initMap();
  }
});

/* Animation du texte */
function startTypingEffect(elementId, messages) {
  const textElement = document.getElementById(elementId);
  let index = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeEffect() {
      const currentMessage = messages[index];

      if (isDeleting) {
          textElement.textContent = currentMessage.substring(0, charIndex - 1);
          charIndex--;
      } else {
          textElement.textContent = currentMessage.substring(0, charIndex + 1);
          charIndex++;
      }

      let speed = isDeleting ? 50 : 100;
      if (!isDeleting && charIndex === currentMessage.length) {
          speed = 1500;
          isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
          isDeleting = false;
          index = (index + 1) % messages.length;
          speed = 500;
      }

      setTimeout(typeEffect, speed);
  }

  typeEffect();
}



/*==============CARTE==================*/

let activeInfoWindow = null;
let addedMarkers = [];
let lastAddedMarker = null;

// === Synchronisation Firebase ===
const markersByKey = new Map(); // clé (Firebase)
let lastAddedKey = null;        // pour supprimer le dernier ajouté depuis la DB



// ================== Aide modale d’alerte ==================
function showAlert(message = "Something went wrong") {
  const modal = document.getElementById("alertModal");
  document.getElementById("alertMessage").textContent = message;
  modal.style.display = "flex";
}

function hideAlert() {
  document.getElementById("alertModal").style.display = "none";
}

// Écouteurs d’événements pour fermer la fenêtre d’alerte
document.getElementById("alertOkBtn")?.addEventListener("click", hideAlert);
document.querySelector('[data-close="alertModal"]')?.addEventListener("click", hideAlert);
document.getElementById("alertModal")?.addEventListener("click", (e) => {
  if (e.target.id === "alertModal") hideAlert(); // clic sur le fond = fermer
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideAlert();
});

async function initMap() {
  
  // 1) Charger les bibliothèques
  const { Map } = await google.maps.importLibrary("maps");
  const { PlacesService, Autocomplete } = await google.maps.importLibrary("places");

  // 2) Créer la carte
  map = new Map(document.getElementById("map"), {
    center: { lat: 39.46975, lng: -0.37739 }, // Valencia
    zoom: 5,
    mapId: "DEMO_MAP_ID",
    mapTypeId: "roadmap",
    tilt: 0,
    heading: 0
  });

  // 3) Autocomplétion dans la barre de recherche
  const input = document.getElementById("searchBox");
  const autocomplete = new Autocomplete(input, {
    fields: ["geometry", "name", "formatted_address"],
    types: ["address"],
    // componentRestrictions: { country: ["es"] },
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) return;
    const loc = place.geometry.location;
    map.setCenter(loc);
    map.setZoom(16);
    updateStreetView(loc);
  });

  // 4) Bouton Rechercher
  const geocoder = new google.maps.Geocoder();
  document.getElementById("searchBtn").addEventListener("click", () => {
    const inputVal = document.getElementById("searchBox").value;
    if (!inputVal) return;

    geocoder.geocode({ address: inputVal }, (results, status) => {
      if (status === "OK" && results[0]) {
        const location = results[0].geometry.location;
        map.setCenter(location);
        map.setZoom(14);
        updateStreetView(location);

        new google.maps.Marker({
          map,
          position: location,
          title: results[0].formatted_address
        });
      } else {
        console.error("Adresse introuvable :" + status);
      }
    });
  });


  // 5) Écouteurs Firebase
const markersRef = ref(db, "markers");

// Lorsqu’un nouveau marqueur est ajouté dans Firebase
onChildAdded(markersRef, (snap) => {
  const key = snap.key;
  const data = snap.val();
  const pos = { lat: data.lat, lng: data.lng };

  const marker = new google.maps.Marker({
    position: pos,
    map,
    title: data.name,
    animation: google.maps.Animation.DROP
  });

  const info = new google.maps.InfoWindow({
    content: `
      <div style="font-family: Arial, sans-serif; padding: 8px; max-width: 220px;">
        <h3 style="margin:0; font-size:14px; color:#333;">${data.name ?? "Sans nom"}</h3>
        <p style="margin:4px 0 0; font-size:13px; color:#444;">
          ${data.note ?? "Sans note"}
        </p>
      </div>
    `
  });

  marker.addListener("click", () => info.open(map, marker));

  // Clic droit = supprimer le marqueur dans Firebase
  marker.addListener("rightclick", () => {
    remove(ref(db, `markers/${key}`));
  });

  markersByKey.set(key, marker);
});


// Lorsqu’un marqueur est supprimé de Firebase
onChildRemoved(markersRef, (snap) => {
  const key = snap.key;
  const m = markersByKey.get(key);

  if (m) {
    m.setMap(null);           // retire le marqueur de la carte
    markersByKey.delete(key); // le supprime du local
  }

  if (lastAddedKey === key) {
    lastAddedKey = null; // réinitialise le dernier ajouté
  }
});


  // 6) Helpers
  function createMarker(position, label, title, content) {
    const marker = new google.maps.Marker({
      position,
      map,
      label,
      title,
      draggable: false,
      animation: google.maps.Animation.DROP
    });

    const infoWindow = new google.maps.InfoWindow({ content });
    google.maps.event.addListener(marker, "click", function () {
      if (activeInfoWindow) activeInfoWindow.close();
      infoWindow.open(map, marker);
      activeInfoWindow = infoWindow;
    });

    return marker;
  }

  function initStreetView() {
    const streetViewElement = document.getElementById("street-view");
    if (!streetViewElement) return;
    const panorama = new google.maps.StreetViewPanorama(streetViewElement, {
      pov: { heading: 165, pitch: 0 },
      zoom: 1
    });
    map.setStreetView(panorama);
  }
  panorama = new google.maps.StreetViewPanorama(
      document.getElementById("street-view"),
      {
        pov: { heading: 165, pitch: 0 },
        zoom: 1
      }
    );
    map.setStreetView(panorama);

  function updateStreetView(location) {
    if (panorama) {
      panorama.setPosition(location);  // plus rapide
    }
  }
}
window.initMap = initMap;


document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("customModal");
  const closeBtn = document.querySelector(".close-btn");

  // Assure que la fenêtre modale est cachée au chargement
  modal.style.display = "none";

  
  // Recherche avec la touche Entrée
  document.getElementById("searchBox").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("searchBtn").click();
    }
  });
  //

  // Au clic sur "Ajouter une localisation"
  document.getElementById("addLocationBtn").addEventListener("click", function () {
  const input = document.getElementById("searchBox").value;
  if (!input) {
    showAlert("Veuillez saisir d’abord une adresse");
    return;
  }

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: input }, (results, status) => {
    if (status === "OK" && results[0]) {
      const location = results[0].geometry.location;
      const name = results[0].formatted_address;

      // Afficher la modale
      const modal = document.getElementById("customModal");
      modal.style.display = "flex";

      // Gestion de l’enregistrement
      document.getElementById("saveNoteBtn").onclick = function () {
        const userNote = document.getElementById("noteInput").value.trim();
        if (!userNote) {
          showAlert("Vous n’avez pas ajouté votre note");
          return;
        }

        // Envoi du marqueur dans Firebase
        try {
          const newRef = push(ref(db, "markers"), {
            lat: location.lat(),
            lng: location.lng(),
            name: name,
            note: userNote,
            ts: Date.now()
          });
          lastAddedKey = newRef.key;


          // Recentrer la carte
          map.setCenter(location);
          map.setZoom(14);

          // Fermer la modale + vider le champ
          modal.style.display = "none";
          document.getElementById("noteInput").value = "";
        } catch (err) {
          console.error("Échec de l’envoi Firebase :", err);
          showAlert("Impossible d’enregistrer le marqueur. Vérifiez la configuration Firebase.");
        }
      };
    } else {
      showAlert("Adresse introuvable :" + status);
    }
  });
});

  // Fermer la fenêtre modale au clic sur le "X"
  closeBtn.addEventListener("click", function () {
    modal.style.display = "none";
  });
});

document.getElementById("removeLastMarkerBtn").addEventListener("click", function () {
  if (lastAddedKey) {
    // supprimer avec l’API moderne
    remove(ref(db, `markers/${lastAddedKey}`))
      .then(() => {
        lastAddedKey = null;  // onChildRemoved retirera le pin de la carte
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression :", error);
        showAlert("Erreur lors de la suppression de la marque");
      });
  } else {
    showAlert("Il n’y a pas de dernière marque enregistrée récemment.");
  }
});
;


/* function saveLocation(name, lat, lng, note) {
  const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x300&markers=color:red%7C${lat},${lng}&key=AIzaSyBVY02QDmfubvjexmPNj0P1oCefwD6ffkE`;

  // Crear objeto de ubicación
  const locationData = {
      name: name,
      lat: lat,
      lng: lng,
      note: note,
      image: imageUrl
  };

  // Obtener datos previos de LocalStorage y añadir el nuevo
  let locations = JSON.parse(localStorage.getItem("locations")) || [];
  locations.push(locationData);
  localStorage.setItem("locations", JSON.stringify(locations));

  
} */

/* document.addEventListener("DOMContentLoaded", function () {
  const saveButton = document.getElementById("saveLocations");

  if (saveButton) {
      saveButton.addEventListener("click", saveExistingMarkers);
  }
});

 */
