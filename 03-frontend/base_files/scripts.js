document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await loginUser(email, password);

        if (response.ok) {
          const data = await response.json();
          // Set the cookie with SameSite=None; Secure
          document.cookie = `token=${data.access_token}; path=/; SameSite=None; Secure`;
          window.location.href = redirectFromUrl() || 'index.html';
        } else {
          const errorData = await response.json();
          alert('Login failed: ' + (errorData.msg || response.statusText));
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login. Please try again.');
      }
    });
  }
  else if (window.location.pathname.indexOf('place.html') > -1) {
    const placeId = getPlaceIdFromUrl();
    if (!placeId) {
        alert('Place ID not found in URL');
        return;
    }

    try {
        await displayPlaceDetails(placeId);
        await displayAddReviewForm(placeId);
        document.getElementById('login').setAttribute('href', `login.html?redirect=place.html?id=${placeId}`);
    } catch (error) {
        console.error('Error fetching place details:', error);
        alert('Failed to fetch place details');
    }
  }
  else if (window.location.pathname.indexOf('index.html') > -1) {
    fetchPlaces();
  }
  else if (window.location.pathname.indexOf('add_review.html') > -1) {
    const token = getCookie('token');
    if (!token) {
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    else {
      const placeId = getPlaceIdFromUrl();
      if (!placeId) {
        alert('Place ID not found in URL');
        window.location.href = 'index.html';
        return;
      }

      addReview(placeId, () => window.location.href = `place.html?id=${placeId}`);
    }
  }
});

async function loginUser(email, password) {
  const response = await fetch('http://127.0.0.1:5000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  return response;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

//Récupérer les données des lieux / PROBLEME PROBABLE ICI POUR RECUPERER LES FETCH
async function fetchPlaces() {
  try {
      let response = await fetch('http://127.0.0.1:5000/places', {
          method: 'GET'
      });

      if (response.ok) {
          const places = await response.json();
          displayPlaces(places);
          response = await fetch('http://127.0.0.1:5000/countries', {
            method: 'GET'
        });
        const countries = await response.json();
        const countryFilter = document.getElementById('country-filter');
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            countryFilter.appendChild(option);
        });
        document.getElementById('country-filter').addEventListener('change', (event) => {
            filterPlaces(event.target.value);
        });
      } else {
          console.error('Failed to fetch places:', response.statusText);
      }
  } catch (error) {
      console.error('Error:', error);
  }
}

// Afficher la liste des lieux / ICI AUSSI A VERIFIER POUR RECUPERER LES DONNEES
function displayPlaces(places) {
  const placesList = document.getElementById('places-list');
  placesList.innerHTML = '';

  places.forEach(place => {
      const placeCard = document.createElement('div');
      placeCard.className = 'place-card';
      placeCard.setAttribute('data-country', place.country_code);
      placeCard.innerHTML = `
          <img class="place-image" src="${place.image_url == undefined ? 'images/place1.jpg' : place.image_url}" alt="${place.host_name}">
          <h3>${place.host_name}</h3>
          <p>${place.description}</p>
          <p>Location: ${place.city_name}, ${place.country_name}</p>
          <p>Price: ${place.price_per_night}</p>
          <a class="details-button" href="place.html?id=${place.id}">View Details</button>
      `;

      placesList.appendChild(placeCard);
  });
}

// Filtrage côté client
function filterPlaces(selectedCountry) {
  const places = document.querySelectorAll('.place-card');

  places.forEach(place => {
      const location = place.getAttribute('data-country');
      if (selectedCountry === 'All' || location === selectedCountry) {
          place.style.display = 'block';
      } else {
          place.style.display = 'none';
      }
  });
}

// Fonction pour obtenir les paramètres de la requête
function getQueryParams() {
  let params = {};
  let queryString = window.location.search.substring(1);
  let regex = /([^&=]+)=([^&]*)/g, m;
  while (m = regex.exec(queryString)) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
  }
  return params;
}

// --Extraire l'ID de l'endroit à partir des paramètres de l'URL
function getPlaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function redirectFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect');
}

//Faire une requête AJAX pour obtenir les détails de l'endroit
async function fetchPlaceDetails(placeId) {
  const response = await fetch(`http://127.0.0.1:5000/places/${placeId}`, {
      method: 'GET'
  });

  if (response.ok) {
      return await response.json();
  } else {
      throw new Error('Failed to fetch place details');
  }
}

//Remplir dynamiquement les détails de l'endroit
async function displayPlaceDetails(placeId) {
  const place = await fetchPlaceDetails(placeId);
  const content = document.getElementById('place-info');
  content.innerHTML = `
          <img src="${place.image_url == undefined ? 'images/place1.jpg' : place.image_url}" alt="${place.host_name}" alt="Beautiful Beach House" class="place-image-large">
          <div class="place-info">
              <p><strong>Host:</strong> ${place.host_name}</p>
              <p><strong>Price per night:</strong> $${place.price_per_night}</p>
              <p><strong>Location:</strong> ${place.city_name}, ${place.country_name}</p>
              <p><strong>Description:</strong> ${place.description}</p>
          </div>
      `;

  const amenitiesList = document.getElementById('place-amenities');
  place.amenities.forEach(amenity => {
      const li = document.createElement('li');
      li.textContent = amenity;
      amenitiesList.appendChild(li);
  });

  // Afficher les avis
  const reviewsList = document.getElementById('reviews-list');
  reviewsList.innerHTML = '';
  place.reviews.forEach(review => {
      const div = document.createElement('div');
      div.classList.add('review-card');
      div.innerHTML = `
          <p>${review.comment}</p>
          <p><strong>${review.user_name}</strong></p>
          <p>Rating: ${review.rating}</p>
      `;
      reviewsList.appendChild(div);
  });
}

// Afficher le formulaire d'ajout de commentaire seulement si l'utilisateur est authentifié
function isAuthenticated() {
  return !!getCookie('token');
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

async function displayAddReviewForm(placeId) {
  if (isAuthenticated()) {
      document.getElementById('add-review-form').style.display = 'block';
      await addReview(placeId, () => displayPlaceDetails(placeId));
  } else {
      document.getElementById('add-review-form').style.display = 'none';
  }
}

async function addReview(placeId, callback) {
  const token = getCookie('token');
  const addReviewForm = document.getElementById('add-review-form');
      addReviewForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const rating = document.getElementById('rating').value;
        const review = document.getElementById('review').value;

        fetch(`http://127.0.0.1:5000/places/${placeId}/reviews`,{
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              rating: rating,
              review: review
            })
          })
          .then(() => {
            alert('Review submitted successfully!');
            callback();
          })
          .catch(error => console.error('Failed to submit review:', error));
        });
}
