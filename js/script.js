// ================== FIREBASE INIT ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Your web app's Firebase configuration (from console)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);



const markersRef = ref(db, "markers");
let map;
let panorama; // ✅ panorama global



// ===================================================




/*===============TEXT===============*/

document.addEventListener("DOMContentLoaded", function () {
  // Inicializa la animación de texto si hay elementos con ID "animated-text" o "animated-text-2"
  if (document.getElementById("animated-text")) {
      startTypingEffect("animated-text", ["The connection is the sign that there is life on the other side."]);
  }

  if (document.getElementById("animated-text-2")) {
      startTypingEffect("animated-text-2", ["Real life is just another window"]);
  }

  // Inicializa el mapa solo si está en la página del mapa
  if (document.getElementById("map")) {
      initMap();
  }
});

/* Text Animation */
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

/*==============MAP==================*/

let activeInfoWindow = null;
let addedMarkers = [];
let lastAddedMarker = null;

// === Firebase sync ===
const markersByKey = new Map(); // key (Firebase) -> google.maps.Marker
let lastAddedKey = null;        // para borrar el último añadido desde DB



async function initMap() {
  
  // 1) Load libraries (new style)
  const { Map } = await google.maps.importLibrary("maps");
  const { PlacesService, Autocomplete } = await google.maps.importLibrary("places");

  // 2) Create the map
  map = new Map(document.getElementById("map"), {
    center: { lat: 39.46975, lng: -0.37739 }, // Valencia
    zoom: 5,
    mapId: "DEMO_MAP_ID",
    mapTypeId: "roadmap",
    tilt: 0,
    heading: 0
  });

  // 3) Autocomplete in the search box
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

  // 4) Search button (use Geocoder instead of legacy PlacesService)
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
        console.error("Address not found:" + status);
      }
    });
  });

  // 5) Firebase listeners (your code stays the same)
const markersRef = ref(db, "markers");

// Listener cuando se añade un nuevo marcador en Firebase
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
        <h3 style="margin:0; font-size:14px; color:#333;">${data.name ?? "Sin nombre"}</h3>
        <p style="margin:4px 0 0; font-size:13px; color:#444;">
          ${data.note ?? "Sin nota"}
        </p>
      </div>
    `
  });

  marker.addListener("click", () => info.open(map, marker));

  // Al hacer clic derecho: eliminar el marcador en DB
  marker.addListener("rightclick", () => {
    remove(ref(db, `markers/${key}`));
  });

  markersByKey.set(key, marker);
});




// Listener cuando se elimina un marcador en Firebase
onChildRemoved(markersRef, (snap) => {
  const key = snap.key;
  const m = markersByKey.get(key);

  if (m) {
    m.setMap(null);           // quita el marcador del mapa
    markersByKey.delete(key); // lo elimina del mapa local
  }

  if (lastAddedKey === key) {
    lastAddedKey = null; // resetea el último añadido
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
      panorama.setPosition(location);  // ✅ mucho más rápido
    }
  }
}
window.initMap = initMap;


document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("customModal");
  const closeBtn = document.querySelector(".close-btn");

  // Asegura que el modal esté oculto al cargar la página
  modal.style.display = "none";

  
   //buscar con enter - Aymane
  document.getElementById("searchBox").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("searchBtn").click();
    }
  });
  //

  // Al hacer click en "Añadir Ubicación"


  document.getElementById("addLocationBtn").addEventListener("click", function () {
  const input = document.getElementById("searchBox").value;
  if (!input) {
    alert("Please type an address first");
    return;
  }

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: input }, (results, status) => {
    if (status === "OK" && results[0]) {
      const location = results[0].geometry.location;
      const name = results[0].formatted_address;

      // Show modal
      const modal = document.getElementById("customModal");
      modal.style.display = "flex";

      // Save handler
      document.getElementById("saveNoteBtn").onclick = function () {
        const userNote = document.getElementById("noteInput").value.trim();
        if (!userNote) {
          alert("You have not added your note");
          return;
        }

        // ✅ Push marker into Firebase
        try {
          const newRef = push(ref(db, "markers"), {
            lat: location.lat(),
            lng: location.lng(),
            name: name,
            note: userNote,
            ts: Date.now()
          });
          lastAddedKey = newRef.key;


          // Recenter map
          map.setCenter(location);
          map.setZoom(14);

          // Hide modal + clear input
          modal.style.display = "none";
          document.getElementById("noteInput").value = "";
        } catch (err) {
          console.error("Firebase push failed:", err);
          alert("Could not save marker. Check Firebase setup.");
        }
      };
    } else {
      alert("Address not found: " + status);
    }
  });
});




function showError(message = "Something went wrong") {
    const modal = document.getElementById("errorModal");
    document.getElementById("errorMessage").textContent = message;
    modal.style.display = "flex";
  }
  function hideError() {
    document.getElementById("errorModal").style.display = "none";
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("errorOkBtn")?.addEventListener("click", hideError);
    document.querySelector('[data-close="errorModal"]')?.addEventListener("click", hideError);
    document.getElementById("errorModal")?.addEventListener("click", (e) => {
      if (e.target.id === "errorModal") hideError(); // click backdrop to close
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideError();
    });
  });
  


  // Cerrar la ventana emergente al hacer clic en la "X"
  closeBtn.addEventListener("click", function () {
      modal.style.display = "none";
  });
});

document.getElementById("removeLastMarkerBtn").addEventListener("click", function () {
  if (lastAddedKey) {
    // ✅ eliminar con la API moderna
    remove(ref(db, `markers/${lastAddedKey}`))
      .then(() => {
        lastAddedKey = null; // onChildRemoved quitará el pin del mapa
      })
      .catch((error) => {
        console.error("Error removing marker:", error);
        alert("Error deleting the mark");
      });
  } else {
    alert("There is no recent last mark recorded.");
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
