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
        // Ensure this matches your JSON filename exactly
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

    // Flatten countries' cities and add 'type'
    data.countries.forEach(country => {
        country.cities.forEach(city => {
            allDestinations.push({
                type: 'city', // Add type for category filtering
                countryName: country.name, // Add country name for specific search filtering
                ...city,
            });
        });
    });

    // Add temples and 'type'
    data.temples.forEach(temple => {
        allDestinations.push({ type: 'temple', ...temple });
    });

    // Add beaches and 'type'
    data.beaches.forEach(beach => {
        allDestinations.push({ type: 'beach', ...beach });
    });

    console.log("All flattened destinations:", allDestinations); // DEBUG: See what's in allDestinations

    let foundRecommendations = [];

    // --- NEW LOGIC FOR CATEGORY SEARCH ---
    if (query === 'country' || query === 'countries') {
        // If searching for 'country', show all cities from all countries
        foundRecommendations = allDestinations.filter(item => item.type === 'city');
    } else if (query === 'temple' || query === 'temples') {
        // If searching for 'temple', show all temples
        foundRecommendations = allDestinations.filter(item => item.type === 'temple');
    } else if (query === 'beach' || query === 'beaches') {
        // If searching for 'beach', show all beaches
        foundRecommendations = allDestinations.filter(item => item.type === 'beach');
    } else {
        // --- EXISTING LOGIC FOR SPECIFIC SEARCH (name, description, country name) ---
        foundRecommendations = allDestinations.filter(item => {
            const itemName = item.name.toLowerCase();
            const itemDescription = (item.description || '').toLowerCase();
            const itemCountryName = (item.countryName || '').toLowerCase(); // Ensure it's a string

            console.log(`Checking destination: ${itemName}, Description: ${itemDescription}, Country: ${itemCountryName}`); // DEBUG: Log each item checked

            return itemName.includes(query) ||
                   itemDescription.includes(query) ||
                   itemCountryName.includes(query);
        });
    }

    console.log("Filtered recommendations (after category/specific logic):", foundRecommendations);

    // Filter for unique recommendations (to avoid duplicates if an item matches multiple criteria)
    const uniqueRecommendations = [];
    const seen = new Set(); // Use a Set to track unique identifiers

    foundRecommendations.forEach(rec => {
        // Create a unique identifier for each recommendation (e.g., type-name-description)
        // This handles cases where a city's name might appear in another city's description etc.
        const identifier = `${rec.type}-${rec.name}-${rec.description}`;
        if (!seen.has(identifier)) {
            uniqueRecommendations.push(rec);
            seen.add(identifier);
        }
    });

    console.log("Unique recommendations for display:", uniqueRecommendations); // DEBUG: Final unique list
    console.log("Number of unique recommendations:", uniqueRecommendations.length); // DEBUG: Count of unique items

    if (uniqueRecommendations.length > 0) {
        // Create a container for the grid of recommendations
        const resultsGrid = document.createElement('div');
        resultsGrid.classList.add('recommendations-grid'); // You might need to add CSS for this class

        // Display up to 2 unique recommendations
        uniqueRecommendations.slice(0, 2).forEach(rec => {
            const recommendationCard = document.createElement('div');
            recommendationCard.classList.add('recommendation-card');

            const img = document.createElement('img');
            img.src = rec.imageUrl;
            img.alt = rec.name;
            img.onerror = function() {
                this.onerror = null; // Prevent infinite loop if fallback also fails
                this.src = 'placeholder.jpg'; // Path to a default placeholder image
            };
            recommendationCard.appendChild(img);

            const content = document.createElement('div');
            content.classList.add('card-content');

            const title = document.createElement('h3');
            title.textContent = rec.name;
            content.appendChild(title);

            const description = document.createElement('p');
            description.textContent = rec.description;
            content.appendChild(description);

            // Local time display
            const localTimeInfo = document.createElement('p');
            localTimeInfo.classList.add('local-time-info');
            content.appendChild(localTimeInfo);

            // Determine time zone: prefer local_time from JSON, then use getTimeZoneForCity lookup
            let timeZoneToUse = rec.local_time || getTimeZoneForCity(rec.name);

            if (timeZoneToUse) {
                // Initial call to display time
                updateLocalTime(timeZoneToUse, localTimeInfo);
                // Update every second
                setInterval(() => {
                    updateLocalTime(timeZoneToUse, localTimeInfo);
                }, 1000);
            } else {
                localTimeInfo.textContent = 'Local Time: N/A';
            }

            recommendationCard.appendChild(content);
            resultsGrid.appendChild(recommendationCard); // Append card to the grid
        });
        searchResultsContainer.appendChild(resultsGrid); // Append the grid to the search results container
        searchResultsContainer.style.display = 'flex'; // Show container with results
    } else {
        // Display "No recommendations found" message
        searchResultsContainer.innerHTML = `<p class="no-results">No recommendations found for "${query}". Try searching for 'country', 'beach', 'temple', or specific names like 'Australia', 'Bora Bora', 'Angkor Wat'.</p>`;
        searchResultsContainer.style.display = 'block'; // Show container for the message
    }
    // Scroll to results for better UX, especially on smaller screens
    searchResultsContainer.scrollIntoView({ behavior: 'smooth' });
}

function resetSearch() {
    document.getElementById('searchBar').value = ''; // Clear search bar
    searchResultsContainer.innerHTML = ''; // Clear results container
    searchResultsContainer.style.display = 'none'; // Hide results container
    alert('Search results cleared.'); // Provide user feedback
}

// Helper function to map city names to time zones
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
        "Petra, Jordan": "Asia/Amman" // Ensure this is also in your JSON if applicable
    };
    // Return the timezone if found, otherwise undefined
    return timeZones[cityName];
}

// Function to update the local time display for a given element
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
            hour12: false, // Use 24-hour format
            timeZone: timeZone // Apply the specific time zone
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

    // Check if necessary carousel elements exist
    if (!carouselContainer || !carouselInner || carouselCards.length === 0) {
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
    const gap = 30; // Matches CSS gap for .carousel-inner
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
if (carouselContainer) { // Ensure container exists before adding listeners
    carouselContainer.addEventListener('mouseenter', stopAutoScroll);
    carouselContainer.addEventListener('mouseleave', startAutoScroll);
}

// Initial call to start the auto-scroll when the script loads
startAutoScroll();

// Re-evaluate scroll on window resize (e.g., for responsiveness)
window.addEventListener('resize', startAutoScroll);
