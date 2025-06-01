// Search functionality
document.getElementById('searchButton').addEventListener('click', searchDestinations);
document.getElementById('searchBar').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchDestinations();
    }
});

// Reset functionality
document.getElementById('resetButton').addEventListener('click', resetSearch);

const searchResultsContainer = document.getElementById('searchResults');

async function fetchTravelData() {
    try {
        // Updated to reflect the new JSON filename
        const response = await fetch('travel_recommendation_api.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched travel data:", data); // For debugging
        return data;
    } catch (error) {
        console.error('Error fetching travel data:', error);
        return null;
    }
}

async function searchDestinations() {
    const query = document.getElementById('searchBar').value.toLowerCase().trim();
    const data = await fetchTravelData();
    searchResultsContainer.innerHTML = ''; // Clear previous results

    console.log("Search query:", query); // DEBUG: Log the query

    if (!data) {
        searchResultsContainer.innerHTML = '<p>Could not load travel recommendations.</p>';
        searchResultsContainer.style.display = 'block'; // Show container for error message
        return;
    }

    let allDestinations = [];

    // Flatten countries' cities
    data.countries.forEach(country => {
        country.cities.forEach(city => {
            allDestinations.push({
                ...city,
                countryName: country.name // Add country name for filtering
            });
        });
    });

    // Add temples
    data.temples.forEach(temple => allDestinations.push(temple));

    // Add beaches
    data.beaches.forEach(beach => allDestinations.push(beach));

    console.log("All destinations flattened:", allDestinations); // DEBUG: See what's in allDestinations

    let uniqueRecommendations = new Map();

    allDestinations.forEach(destination => {
        const destName = destination.name.toLowerCase();
        const destDescription = destination.description.toLowerCase();
        // Ensure destCountry is a string before calling .toLowerCase() and .includes()
        const destCountry = (destination.countryName || '').toLowerCase(); 

        console.log(`Checking destination: ${destName}, Description: ${destDescription}, Country: ${destCountry}`); // DEBUG: Log each item checked

        if (destName.includes(query) || destDescription.includes(query) || destCountry.includes(query)) {
            // Use destination name as key for uniqueness
            uniqueRecommendations.set(destination.name, destination);
            console.log(`Match found for "${query}":`, destination.name); // DEBUG: Log matches
        }
    });

    console.log("Unique recommendations found (Map):", uniqueRecommendations); // DEBUG: Final map content
    console.log("Number of unique recommendations:", uniqueRecommendations.size); // DEBUG: Size of the map

    if (uniqueRecommendations.size === 0) {
        searchResultsContainer.innerHTML = `<p>No recommendations found for "${query}".</p>`;
        searchResultsContainer.style.display = 'block';
        return;
    }

    // Display only top 2 unique recommendations
    let count = 0;
    for (let [key, destination] of uniqueRecommendations) {
        if (count >= 2) break;

        const recommendationCard = document.createElement('div');
        recommendationCard.classList.add('recommendation-card');

        const img = document.createElement('img');
        img.src = destination.imageUrl;
        img.alt = destination.name;
        img.onerror = function() {
            this.onerror = null; // Prevent infinite loop if fallback also fails
            this.src = 'placeholder.jpg'; // Path to a default placeholder image
        };
        recommendationCard.appendChild(img);

        const content = document.createElement('div');
        content.classList.add('card-content');

        const title = document.createElement('h3');
        title.textContent = destination.name;
        content.appendChild(title);

        const description = document.createElement('p');
        description.textContent = destination.description;
        content.appendChild(description);

        // Local time display
        const localTimeSpan = document.createElement('span');
        localTimeSpan.classList.add('local-time');
        content.appendChild(localTimeSpan);

        // Initial call
        updateLocalTime(destination.local_time || getTimeZoneForCity(destination.name), localTimeSpan);
        // Update every second (clear interval on card removal if dynamic)
        setInterval(() => {
            updateLocalTime(destination.local_time || getTimeZoneForCity(destination.name), localTimeSpan);
        }, 1000);

        recommendationCard.appendChild(content);
        searchResultsContainer.appendChild(recommendationCard);
        count++;
    }

    searchResultsContainer.style.display = 'flex'; // Show container with results
}

function resetSearch() {
    document.getElementById('searchBar').value = ''; // Clear search bar
    searchResultsContainer.innerHTML = ''; // Clear results container
    searchResultsContainer.style.display = 'none'; // Hide results container
    alert('Search results cleared.');
}

function getTimeZoneForCity(cityName) {
    const timeZones = {
        "Sydney, Australia": "Australia/Sydney",
        "Melbourne, Australia": "Australia/Melbourne",
        "Tokyo, Japan": "Asia/Tokyo",
        "Kyoto, Japan": "Asia/Tokyo",
        "Rio de Janeiro, Brazil": "America/Sao_Paulo",
        "São Paulo, Brazil": "America/Sao_Paulo",
        "Paris, France": "Europe/Paris",
        "London, UK": "Europe/London",
        "Rome, Italy": "Europe/Rome",
        "Cairo, Egypt": "Africa/Cairo",
        "New York, USA": "America/New_York",
        "Los Angeles, USA": "America/Los_Angeles",
        "Vancouver, Canada": "America/Vancouver",
        "Toronto, Canada": "America/Toronto",
        "Angkor Wat, Cambodia": "Asia/Phnom_Penh",
        "Taj Mahal, India": "Asia/Kolkata",
        "Bora Bora, French Polynesia": "Pacific/Tahiti",
        "Copacabana Beach, Brazil": "America/Sao_Paulo",
        "Petra, Jordan": "Asia/Amman" // Added Petra as it was in JSON
    };
    return timeZones[cityName];
}

function updateLocalTime(timeZone, element) {
    if (!timeZone) {
        element.textContent = 'Local Time: N/A';
        return;
    }
    try {
        const now = new Date();
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: timeZone
        };
        element.textContent = `Local Time: ${now.toLocaleTimeString('en-US', options)}`;
    } catch (error) {
        console.error('Error updating local time:', error);
        element.textContent = 'Local Time: N/A (Invalid TimeZone)';
    }
}


// --- Carousel Auto-Scroll JavaScript ---
const carouselContainer = document.querySelector('.carousel-container');
const carouselInner = document.querySelector('.carousel-inner');
const carouselCards = document.querySelectorAll('.carousel-card');

let scrollInterval;
const scrollSpeed = 3000; // Time in milliseconds between scrolls (3 seconds)

function startAutoScroll() {
    // Clear previous interval to prevent multiple intervals running
    stopAutoScroll();

    if (carouselCards.length === 0 || !carouselContainer || !carouselInner) {
        console.warn("Carousel elements not found or no cards. Auto-scroll disabled.");
        return;
    }

    const firstCard = carouselCards[0];
    // Ensure firstCard exists before accessing its properties
    if (!firstCard) {
        console.warn("No carousel cards found for auto-scroll.");
        return;
    }

    const cardWidth = firstCard.offsetWidth;
    const gap = 30; // Defined in CSS for .carousel-inner gap
    const scrollStep = cardWidth + gap;

    scrollInterval = setInterval(() => {
        const currentScrollLeft = carouselContainer.scrollLeft;
        const maxScrollLeft = carouselContainer.scrollWidth - carouselContainer.clientWidth;
        const epsilon = 1; // Small buffer for floating point comparisons

        if (currentScrollLeft >= maxScrollLeft - epsilon) {
            // Reset to beginning instantly when near the end
            carouselContainer.scrollTo({
                left: 0,
                behavior: 'instant'
            });
        } else {
            // Scroll by one card + gap
            carouselContainer.scrollBy({
                left: scrollStep,
                behavior: 'smooth'
            });
        }
    }, scrollSpeed);
}

function stopAutoScroll() {
    clearInterval(scrollInterval);
}

// Add event listeners for pausing/resuming scroll on hover
if (carouselContainer) {
    carouselContainer.addEventListener('mouseenter', stopAutoScroll);
    carouselContainer.addEventListener('mouseleave', startAutoScroll);
}


// Initial call to start the auto-scroll when the script loads
startAutoScroll();

// Re-evaluate scroll on window resize (e.g., for responsiveness)
window.addEventListener('resize', startAutoScroll);
