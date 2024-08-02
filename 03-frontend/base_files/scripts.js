document.addEventListener('DOMContentLoaded', () => {
  const token = getCookie('token');

  if (document.getElementById('places-list')) {
      // Page with list of places
      checkAuthentication(token);
      populateCountryFilter();
      fetchPlaces(token);
  } else if (document.getElementById('place-details')) {
      // Page with details of a single place
      checkAuthentication(token);
      fetchPlaceDetails(token, getPlaceIdFromURL());
  } else if (document.getElementById('login-form')) {
      // Page with login form
      handleLoginForm();
  }
});

function handleLoginForm() {
  // Handle login form submission
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
                  document.cookie = `token=${data.access_token}; path=/; SameSite=None; Secure`;
                  window.location.href = 'index.html'; // Redirect to index page
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
}

function getPlaceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('place_id');
}

function checkAuthentication(token = null) {
  if (!token) {
      token = getCookie('token');
  }
  const addReviewSection = document.getElementById('add-review');
  const reviewButton = document.getElementById('review-button');
  const loginButton = document.getElementById('login-button');

  if (!token) {
      if (loginButton) loginButton.style.display = 'block';
      if (addReviewSection) {
          addReviewSection.style.display = 'none';
          if (reviewButton) reviewButton.style.display = 'block'; // Show button if not authenticated
      }
  } else {
      if (loginButton) loginButton.style.display = 'none';
      if (addReviewSection) {
          addReviewSection.style.display = 'block'; // Show section if authenticated
          if (reviewButton) reviewButton.style.display = 'none'; // Hide button if authenticated
      }
  }
}

async function fetchPlaceDetails(token, placeId) {
  try {
      const response = await fetch(`http://127.0.0.1:5000/places/${placeId}`, {
          method: 'GET',
          headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
          }
      });

      if (response.ok) {
          const place = await response.json();
          displayPlaceDetails(place);
      } else {
          console.error('Failed to fetch place details:', response.statusText);
      }
  } catch (error) {
      console.error('Error fetching place details:', error);
  }
}

function displayPlaceDetails(place) {
  const placeDetailsSection = document.getElementById('place-details');
  const reviewsSection = document.getElementById('reviews'); // Get the reviews section

  if (placeDetailsSection) {
      placeDetailsSection.innerHTML = ''; // Clear existing content
      const placeCard = document.createElement('div');
      placeCard.className = 'place-card'; // Add class for styling
      placeCard.innerHTML = `
          <h2>${place.host_name} - ${place.city_name}, ${place.country_name}</h2>
          <p>${place.description}</p>
          <p><strong>Location:</strong> ${place.city_name}, ${place.country_name}</p>
          <p><strong>Price:</strong> $${place.price_per_night} per night</p>
          <div class="images">
              ${place.images ? place.images.map(img => `<img src="${img}" alt="Place image">`).join('') : ''}
          </div>
      `;
      placeDetailsSection.appendChild(placeCard);
  }

  if (reviewsSection) {
      reviewsSection.innerHTML = ''; // Clear existing content in the reviews section

      if (place.reviews && place.reviews.length > 0) {
          const reviewsTitle = document.createElement('h2');
          reviewsTitle.textContent = 'Reviews';
          reviewsSection.appendChild(reviewsTitle);

          place.reviews.forEach(review => {
              const reviewCard = document.createElement('div');
              reviewCard.classList.add('review-card');

              reviewCard.innerHTML = `
                  <p><strong>${review.user_name}</strong></p>
                  <p>Rating: ${review.rating} / 5</p>
                  <p>${review.comment}</p>
              `;

              reviewsSection.appendChild(reviewCard);
          });
      } else {
          const noReviewsMessage = document.createElement('p');
          noReviewsMessage.textContent = 'No reviews yet.';
          reviewsSection.appendChild(noReviewsMessage);
      }
  }
}



function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

async function fetchPlaces(token) {
  try {
      const response = await fetch('http://127.0.0.1:5000/places', {
          method: 'GET',
          headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
          }
      });

      if (response.ok) {
          const places = await response.json();
          displayPlaces(places);
      } else {
          console.error('Failed to fetch places:', response.statusText);
      }
  } catch (error) {
      console.error('Error fetching places:', error);
  }
}

function displayPlaces(places) {
  const placesList = document.getElementById('places-list');
  if (placesList) {
      placesList.innerHTML = ''; // Clear existing content

      places.forEach(place => {
          const placeElement = document.createElement('div');
          placeElement.className = 'place-card';
          placeElement.innerHTML = `
              <h3>${place.host_name} - ${place.city_name}, ${place.country_name}</h3>
              <p>${place.description}</p>
              <p><strong>Price:</strong> $${place.price_per_night} per night</p>
              <button class="details-button" data-id="${place.id}">View Details</button>
          `;

          placesList.appendChild(placeElement);
      });

      // Add event listener to all "View Details" buttons
      document.querySelectorAll('.details-button').forEach(button => {
          button.addEventListener('click', function() {
              const placeId = this.getAttribute('data-id');
              window.location.href = `place.html?place_id=${placeId}`;
          });
      });
  }
}

async function populateCountryFilter() {
  try {
      const response = await fetch('http://127.0.0.1:5000/countries');
      if (response.ok) {
          const countries = await response.json();
          const countryFilter = document.getElementById('country-filter');

          if (countryFilter) {
              // Add default option
              const defaultOption = document.createElement('option');
              defaultOption.value = 'All';
              defaultOption.textContent = 'All Countries';
              countryFilter.appendChild(defaultOption);

              // Populate dropdown with countries
              countries.forEach(country => {
                  const option = document.createElement('option');
                  option.value = country;
                  option.textContent = country;
                  countryFilter.appendChild(option);
              });

              // Add event listener for filtering places
              countryFilter.addEventListener('change', (event) => {
                  const selectedCountry = event.target.value;
                  filterPlacesByCountry(selectedCountry);
              });
          }
      } else {
          console.error('Failed to fetch countries:', response.statusText);
      }
  } catch (error) {
      console.error('Error fetching countries:', error);
  }
}

function filterPlacesByCountry(country) {
  const placesList = document.getElementById('places-list');
  if (placesList) {
      const places = placesList.getElementsByClassName('place-card');
      Array.from(places).forEach(place => {
          const placeCountry = place.querySelector('h3').textContent.split(', ').pop();
          if (country === 'All' || placeCountry === country) {
              place.style.display = 'block';
          } else {
              place.style.display = 'none';
          }
      });
  }
}

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
