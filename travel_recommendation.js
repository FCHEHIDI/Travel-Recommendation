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

    console.log("Search query:", query); // For debugging

    if (!data) {
        searchResultsContainer.innerHTML = '<p>Could not load travel recommendations.</p>';
        searchResultsContainer.style.display = 'block'; // Show container for error message
        return;
    }

    let allDestinations = [];

    // Flatten all recommendable items (cities, temples, beaches) into a single array
    data.countries.forEach(country => {
        country.cities.forEach(city => {
            allDestinations.push({
                type: 'city',
                countryName: country.name, // Keep country name for search matching
                ...city, // Spread city properties
                // NOTE: local_time is missing in your JSON for cities, this will be undefined unless added
            });
        });
    });

    data.temples.forEach(temple => {
        allDestinations.push({ type: 'temple', ...temple });
    });

    data.beaches.forEach(beach => {
        allDestinations.push({ type: 'beach', ...beach });
    });

    console.log("All flattened destinations:", allDestinations); // For debugging

    // Filter based on query
    let foundRecommendations = allDestinations.filter(item => {
        const itemName = item.name.toLowerCase();
        const itemDescription = (item.description || '').toLowerCase(); // Ensure description exists
        const itemCountryName = (item.countryName || '').toLowerCase(); // Ensure countryName exists for cities

        // Check if query matches item name, description, or associated country name (for cities)
        return itemName.includes(query) ||
               itemDescription.includes(query) ||
               itemCountryName.includes(query);
    });

    console.log("Filtered recommendations:", foundRecommendations); // For debugging

    // Filter for unique recommendations (in case a city search also matched its country)
    const uniqueRecommendations = [];
    const seen = new Set();

    foundRecommendations.forEach(rec => {
        // Use a more robust identifier to distinguish different types of recommendations
        const identifier = `${rec.type}-${rec.name}-${rec.description}`;
        if (!seen.has(identifier)) {
            uniqueRecommendations.push(rec);
            seen.add(identifier);
        }
    });

    console.log("Unique recommendations for display:", uniqueRecommendations); // For debugging

    if (uniqueRecommendations.length > 0) {
        const resultsHtml = document.createElement('div');
        resultsHtml.classList.add('recommendations-grid'); // For CSS grid layout

        // Display up to 2 recommendations (as requested)
        uniqueRecommendations.slice(0, 2).forEach(rec => {
            const card = document.createElement('div');
            card.classList.add('recommendation-card');

            const img = document.createElement('img');
            img.src = rec.imageUrl; // Use imageUrl from your JSON
            img.alt = rec.name;
            img.onerror = function() { this.onerror=null; this.src='placeholder.jpg'; }; // Fallback image

            const title = document.createElement('h3');
            title.textContent = rec.name;

            const description = document.createElement('p');
            description.textContent = rec.description;

            const localTimeInfo = document.createElement('p');
            localTimeInfo.classList.add('local-time-info');

            // --- IMPORTANT NOTE ABOUT TIME ZONE ---
            // Your travel_recommendation_api (1).json currently does NOT have 'local_time'
            // defined for cities, temples, or beaches. For accurate time display,
            // you MUST add a "local_time": "TimeZone/Identifier" property
            // (e.g., "Asia/Tokyo", "America/Sao_Paulo") to each recommendable item
            // in your JSON file. Without it, it will display "N/A".
            // The `getTimeZoneForCity` is a simple placeholder that requires manual mapping.
            let timeZoneToUse = rec.local_time || getTimeZoneForCity(rec.name);

            if (timeZoneToUse) {
                updateLocalTime(timeZoneToUse, localTimeInfo);
                // Update time every second if a valid timezone is found
                setInterval(() => updateLocalTime(timeZoneToUse, localTimeInfo), 1000);
            } else {
                localTimeInfo.textContent = `Local Time: N/A`;
            }

            card.appendChild(img);
            card.appendChild(title);
            card.appendChild(description);
            card.appendChild(localTimeInfo);

            resultsHtml.appendChild(card);
        });
        searchResultsContainer.appendChild(resultsHtml);
        searchResultsContainer.style.display = 'flex'; // Show container with results
    } else {
        searchResultsContainer.innerHTML = `<p class="no-results">No recommendations found for "${query}". Try searching for 'country', 'beach', 'temple', or specific names like 'Australia', 'Bora Bora', 'Angkor Wat'.</p>`;
        searchResultsContainer.style.display = 'block'; // Show container for "no results" message
    }
    // Scroll to search results
    searchResultsContainer.scrollIntoView({ behavior: 'smooth' });
}


// --- IMPORTANT: This is a placeholder function for Time Zones ---
// For accurate local time display, you MUST add a 'local_time' property
// (e.g., "Asia/Tokyo", "America/New_York") to each city, temple, and beach object
// in your travel_recommendation_api (1).json.
// Example for a city:
// {
//   "name": "Sydney, Australia",
//   "imageUrl": "...",
//   "description": "...",
//   "local_time": "Australia/Sydney" // <-- ADD THIS
// }
// This function below is a simple helper and will not cover all cases.
function getTimeZoneForCity(cityName) {
    const timezoneMap = {
        "sydney, australia": "Australia/Sydney",
        "melbourne, australia": "Australia/Melbourne",
        "tokyo, japan": "Asia/Tokyo",
        "kyoto, japan": "Asia/Tokyo",
        "rio de janeiro, brazil": "America/Sao_Paulo",
        "são paulo, brazil": "America/Sao_Paulo",
        "edinburgh, scotland": "Europe/London",
        "isle of skye, scotland": "Europe/London",
        "bangkok, thailand": "Asia/Bangkok",
        "chiang mai, thailand": "Asia/Bangkok",
        "beijing, china": "Asia/Shanghai",
        "shanghai, china": "Asia/Shanghai",
        "colombo, sri lanka": "Asia/Colombo",
        "kandy, sri lanka": "Asia/Colombo",
        "malé, maldives": "Indian/Maldives",
        "addu atoll, maldives": "Indian/Maldives",
        "marrakech, morocco": "Africa/Casablanca",
        "fes, morocco": "Africa/Casablanca",
        "dubai, uae": "Asia/Dubai",
        "abu dhabi, uae": "Asia/Dubai",
        "cape town, south africa": "Africa/Johannesburg",
        "johannesburg, south africa": "Africa/Johannesburg",
        "moscow, russia": "Europe/Moscow",
        "st. petersburg, russia": "Europe/Moscow",
        "rovaniemi, finland": "Europe/Helsinki",
        "levi, finland": "Europe/Helsinki",
        "vancouver, canada": "America/Vancouver",
        "toronto, canada": "America/Toronto",
        "lima, peru": "America/Lima",
        "cusco, peru": "America/Lima",
        "santiago, chile": "America/Santiago",
        "valparaíso, chile": "America/Santiago",
        "athens, greece": "Europe/Athens",
        "santorini, greece": "Europe/Athens",
        "prague, czech republic": "Europe/Prague",
        "český krumlov, czech republic": "Europe/Prague",
        "budapest, hungary": "Europe/Budapest",
        "eger, hungary": "Europe/Budapest",
        "amman, jordan": "Asia/Amman",
        "petra, jordan": "Asia/Amman",
        "angkor wat, cambodia": "Asia/Phnom_Penh",
        "taj mahal, india": "Asia/Kolkata",
        "bora bora, french polynesia": "Pacific/Tahiti",
        "copacabana beach, brazil": "America/Sao_Paulo"
    };
    return timezoneMap[cityName.toLowerCase()];
}


function updateLocalTime(timeZone, element) {
    try {
        const now = new Date();
        const options = {
            timeZone: timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        const localDateTime = new Intl.DateTimeFormat('en-US', options).format(now);
        element.textContent = `Local Time: ${localDateTime}`;
    } catch (error) {
        element.textContent = `Local Time: N/A (Invalid TimeZone)`;
        console.error(`Error updating local time for ${timeZone}:`, error);
    }
}

function resetSearch() {
    document.getElementById('searchBar').value = '';
    searchResultsContainer.innerHTML = ''; // Clear the results
    searchResultsContainer.style.display = 'none'; // Hide container on reset
    alert('Search results cleared.');
}

// --- Carousel Auto-Scroll JavaScript ---
const carouselContainer = document.querySelector('.carousel-container');
const carouselInner = document.querySelector('.carousel-inner');
const carouselCards = document.querySelectorAll('.carousel-card');

let scrollInterval;
const scrollSpeed = 3000; // Time in milliseconds between scrolls (3 seconds)

function startAutoScroll() {
    if (carouselCards.length === 0) return; // Prevent error if no cards

    const firstCard = carouselCards[0];
    const cardWidth = firstCard.offsetWidth;
    const gap = 30;
    const scrollStep = cardWidth + gap;

    stopAutoScroll();

    scrollInterval = setInterval(() => {
        const currentScrollLeft = carouselContainer.scrollLeft;
        const maxScrollLeft = carouselContainer.scrollWidth - carouselContainer.clientWidth;
        const epsilon = 1;

        if (currentScrollLeft >= maxScrollLeft - epsilon) {
            carouselContainer.scrollTo({
                left: 0,
                behavior: 'instant'
            });
        } else {
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

carouselContainer.addEventListener('mouseenter', stopAutoScroll);
carouselContainer.addEventListener('mouseleave', startAutoScroll);
startAutoScroll();
window.addEventListener('resize', startAutoScroll);