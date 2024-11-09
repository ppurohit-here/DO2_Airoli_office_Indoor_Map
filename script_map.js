// Initialize HERE map
const platform = new H.service.Platform({
    apikey: 'jJElkNruxi27GR5Mcl3uJzo9XEBp1Had_Qn50BVOipg'
});
const defaultLayers = platform.createDefaultLayers();
const map = new H.Map(
    document.getElementById('mapContainer'),
    defaultLayers.vector.normal.map,
    { zoom: 18, center: { lat: 19.17661825659251, lng: 72.99286167585473 } }
);

// Add default behavior (zooming, dragging, etc.) to the map
const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Load geometry data
fetch('geometry_here.geojson')
    .then(response => response.json())
    .then(data => {
        data.features.forEach(feature => {
            if (feature.geometry.type === 'LineString') {
                // Create a polyline for each LineString feature
                const lineString = new H.geo.LineString();
                feature.geometry.coordinates.forEach(coord => {
                    lineString.pushLatLngAlt(coord[1], coord[0]); // HERE API uses lat, lng
                });

                // Create a polyline and add it to the map
                const polyline = new H.map.Polyline(lineString, {
                    style: { lineWidth: 3, strokeColor: 'grey' } // Default color for now
                });
                map.addObject(polyline);
            }
        });
    })
    .catch(error => console.error('Error loading geometry data:', error));

// Define a custom icon using the PNG image
const customIcon = new H.map.Icon('workstation.png', {
    size: { w: 32, h: 24 }  // Adjust size as needed, here it’s set to 32x32 pixels
});


// Load point data and add HERE markers
fetch('point_here.geojson')
    .then(response => response.json())
    .then(data => {
        data.features.forEach(feature => {
            if (feature.geometry.type === 'Point') {
                const coords = {
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0]
                };

                 // Use the custom icon when creating each marker
                 const marker = new H.map.Marker(coords, { icon: customIcon });
                 map.addObject(marker);
                 
                // Event listener to show info box on marker click
                marker.addEventListener('tap', () => {
                    // Populate info box with feature details
                    document.getElementById('infoContent').innerHTML = `
                        <strong>Room:</strong> ${feature.properties.Room_name || 'N/A'}<br>
                        <strong>Workstation:</strong> ${feature.properties.Workstation || 'N/A'}<br>
                        <strong>Road Name:</strong> ${feature.properties.Road_Name || 'N/A'}<br>
                        <strong>Accessibility:</strong> ${feature.properties.accessibility || 'N/A'}
                    `;

                    // Show the info box
                    document.getElementById('infoBox').style.display = 'block';
                });
            }
        });
    })
    .catch(error => console.error('Error loading point data:', error));

// Close the info box when clicking outside of markers
map.addEventListener('tap', (event) => {
    if (event.target === map) {
        document.getElementById('infoBox').style.display = 'none';
    }
});


// Adjust map view to show all data points and lines
const boundingBox = new H.geo.Rect(19.176, 72.992, 19.177, 72.993); // Adjust as needed
map.getViewModel().setLookAtData({ bounds: boundingBox });

// Search

let markers = [];  // Array to store markers for later reference




// Function to initialize markers from GeoJSON data
function loadMarkers() {
    fetch('point_here.geojson')
        .then(response => response.json())
        .then(data => {
            data.features.forEach(feature => {
                if (feature.geometry.type === 'Point') {
                    const coords = {
                        lat: feature.geometry.coordinates[1],
                        lng: feature.geometry.coordinates[0]
                    };

                    const marker = new H.map.Marker(coords, { icon: customIcon });
                    markers.push({ marker, feature });  // Store marker and feature data for later use

                    map.addObject(marker);

                    // Event listener for clicking on a marker
                    marker.addEventListener('tap', () => {
                        showInfoBox(feature);
                    });
                }
            });
        })
        .catch(error => console.error('Error loading point data:', error));
}

// Function to show the info box
function showInfoBox(feature) {
    document.getElementById('infoContent').innerHTML = `
        <strong>Room:</strong> ${feature.properties.Room_name || 'N/A'}<br>
        <strong>Workstation:</strong> ${feature.properties.Workstation || 'N/A'}<br>
        <strong>Road Name:</strong> ${feature.properties.Road_Name || 'N/A'}<br>
        <strong>Accessibility:</strong> ${feature.properties.accessibility || 'N/A'}
    `;
    document.getElementById('infoBox').style.display = 'block';

    // Center the map on the selected marker
    map.setCenter({
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
    });
}

// Declare arrays to store markers and circles created during the search
let searchMarkers = [];
let searchCircles = [];

// Function to search by Workstation or Room_name
function searchLocation() {
    const query = document.getElementById('searchBox').value.toLowerCase();

    let found = false;

    // Clear previous search results (remove markers and circles)
    searchMarkers.forEach(marker => map.removeObject(marker));
    searchCircles.forEach(circle => map.removeObject(circle));

    // Reset the arrays
    searchMarkers = [];
    searchCircles = [];

    markers.forEach(({ marker, feature }) => {
        const workstation = feature.properties.Workstation.toString();
        const roomName = feature.properties.Room_name.toLowerCase();

        // If the query matches either Workstation or Room_name
        if (workstation.includes(query) || roomName.includes(query)) {
            // If the match is found, get the coordinates
            const coords = {
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0]
            };

            // Create a new marker at the searched coordinates (cyan-green dot)
            const highlightMarker = new H.map.Marker(coords, {
                icon: new H.map.Icon('https://img.icons8.com/color/48/000000/marker.png', { size: { w: 32, h: 32 } }) // Custom cyan-green marker icon
            });

            // Add the highlight marker to the map
            map.addObject(highlightMarker);
            searchMarkers.push(highlightMarker);

            // Optionally, add a circle around the highlight marker to make it stand out more
            const circle = new H.map.Circle(coords, 1, {
                style: {
                    fillColor: 'rgba(0, 255, 255, 0.5)',  // Cyan with transparency
                    strokeColor: 'cyan',  // Cyan border
                    lineWidth: 3
                }
            });

            // Add the circle to the map
            map.addObject(circle);
            searchCircles.push(circle);

            // Show the info box
            showInfoBox(feature);

            // Center the map on this searched location
            map.setCenter(coords);

            found = true;
        }
    });

    if (!found) {
        alert('No matching location found');
    }
}


// Function to clear the search
function clearSearch() {
    document.getElementById('searchBox').value = '';
    document.getElementById('infoBox').style.display = 'none'; // Hide the info box

    // Remove all the search markers and circles from the map
    searchMarkers.forEach(marker => map.removeObject(marker));
    searchCircles.forEach(circle => map.removeObject(circle));

    // Reset the arrays to prevent memory leaks
    searchMarkers = [];
    searchCircles = [];
}


// Event listener for search button
document.getElementById('searchButton').addEventListener('click', searchLocation);

// Initialize the map and markers
loadMarkers();

// Variables to keep track of zoom level and image position
let zoomLevel = 1;  // Default zoom level
let image = document.getElementById('indoorMapImage');

// Zooming in/out using mouse wheel
image.addEventListener('wheel', function(event) {
    event.preventDefault();  // Prevent default scroll behavior
    
    if (event.deltaY < 0) { // Mouse wheel up (zoom in)
        zoomLevel += 0.1;
    } else if (event.deltaY > 0) { // Mouse wheel down (zoom out)
        zoomLevel -= 0.1;
        if (zoomLevel < 1) zoomLevel = 1; // Don't allow zooming out too much
    }
    updateImageTransform();
});


// Update the transform property of the image
function updateImageTransform() {
    image.style.transform = `scale(${zoomLevel})`;  // Apply scaling
}

// Implementing drag-to-pan functionality
let isDragging = false;
let startX, startY;

image.addEventListener('mousedown', function(event) {
    isDragging = true;
    startX = event.pageX - image.offsetLeft;
    startY = event.pageY - image.offsetTop;
    image.style.cursor = 'grabbing';  // Change cursor to grabbing
});

window.addEventListener('mousemove', function(event) {
    if (isDragging) {
        let offsetX = event.pageX - startX;
        let offsetY = event.pageY - startY;
        image.style.transform = `scale(${zoomLevel}) translate(${offsetX}px, ${offsetY}px)`;  // Move image with mouse drag
    }
});

window.addEventListener('mouseup', function() {
    isDragging = false;
    image.style.cursor = 'grab';  // Change cursor back to grab
});

image.addEventListener('mouseleave', function() {
    isDragging = false;
    image.style.cursor = 'grab';  // Reset cursor when leaving the image area
});
