// Global variables
        let distanceMatrixService;
        let selectedMode = 'DRIVING';
        let csvData = [];
        let results = [];
        let apiKey = '';
        let googleMapsLoaded = false;
        
        document.addEventListener('DOMContentLoaded', function() {
            // Set up travel mode selection
            const travelModes = document.querySelectorAll('.travel-mode');
            travelModes.forEach(mode => {
                mode.addEventListener('click', function() {
                    travelModes.forEach(m => m.classList.remove('active'));
                    this.classList.add('active');
                    selectedMode = this.dataset.mode;
                });
            });
            
            // Set up file input
            const csvFileInput = document.getElementById('csvFile');
            csvFileInput.addEventListener('change', handleFileUpload);
            
            // Set up API key input
            const apiKeyInput = document.getElementById('apiKey');
            apiKeyInput.addEventListener('input', function() {
                apiKey = this.value.trim();
                validateInputs();
            });
            
            // Set up process button
            const processButton = document.getElementById('processButton');
            processButton.addEventListener('click', processAddresses);
            
            // Set up download button
            const downloadBtn = document.getElementById('downloadBtn');
            downloadBtn.addEventListener('click', downloadResults);
            
            // Set up template download
            const downloadTemplate = document.getElementById('downloadTemplate');
            downloadTemplate.addEventListener('click', function(e) {
                e.preventDefault();
                generateTemplateCSV();
            });
        });

        function validateInputs() {
            const processButton = document.getElementById('processButton');
            processButton.disabled = !(apiKey && csvData.length > 0);
        }
        
        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const contents = e.target.result;
                    parseCSV(contents);
                    validateInputs();
                } catch (error) {
                    showError('Error reading CSV file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
        
        function parseCSV(csvContent) {
            // Use a more robust CSV parsing approach that handles quotes and commas in fields
            const lines = csvContent.split(/\r\n|\n/);
            const headers = parseCSVLine(lines[0]).map(header => header.trim());
            
            // Check if CSV has required headers
            const requiredHeaders = [
                'OriginAddress', 'OriginCity', 'OriginState', 'OriginZip',
                'DestinationAddress', 'DestinationCity', 'DestinationState', 'DestinationZip'
            ];
            
            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
            
            if (missingHeaders.length > 0) {
                showError('CSV is missing required headers: ' + missingHeaders.join(', '));
                return;
            }
            
            csvData = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const values = parseCSVLine(lines[i]);
                if (values.length !== headers.length) {
                    showError(`Line ${i + 1} has ${values.length} values, but should have ${headers.length}`);
                    continue;
                }
                
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index].trim();
                });
                
                csvData.push(row);
            }
            
            showPreview();
        }
        
        // Helper function to properly parse CSV lines with quoted fields
        function parseCSVLine(line) {
            const result = [];
            let currentField = "";
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    // Handle quotes
                    if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
                        // Double quotes inside quoted field are escaped quotes
                        currentField += '"';
                        i++; // Skip the next quote
                    } else {
                        // Toggle quote state
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    // This is a field separator
                    result.push(currentField);
                    currentField = "";
                } else {
                    // Regular character, add to current field
                    currentField += char;
                }
            }
            
            // Add the last field
            result.push(currentField);
            
            return result;
        }
        
        function showPreview() {
            if (csvData.length === 0) return;
            
            const previewContainer = document.getElementById('previewContainer');
            const previewTableBody = document.getElementById('previewTableBody');
            
            // Clear previous preview
            previewTableBody.innerHTML = '';
            
            // Display up to 5 rows for preview
            const previewRows = csvData.slice(0, 5);
            
            previewRows.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.OriginAddress || ''}</td>
                    <td>${row.OriginCity || ''}</td>
                    <td>${row.OriginState || ''}</td>
                    <td>${row.OriginZip || ''}</td>
                    <td>${row.DestinationAddress || ''}</td>
                    <td>${row.DestinationCity || ''}</td>
                    <td>${row.DestinationState || ''}</td>
                    <td>${row.DestinationZip || ''}</td>
                `;
                previewTableBody.appendChild(tr);
            });
            
            previewContainer.style.display = 'block';
        }
        
        function loadGoogleMapsAPI() {
            return new Promise((resolve, reject) => {
                if (googleMapsLoaded) {
                    resolve();
                    return;
                }
                
                // Remove any existing script
                const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
                if (existingScript) {
                    existingScript.remove();
                }
                
                window.initMap = function() {
                    distanceMatrixService = new google.maps.DistanceMatrixService();
                    googleMapsLoaded = true;
                    resolve();
                };
                
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
                script.async = true;
                script.defer = true;
                script.onerror = function() {
                    reject(new Error('Failed to load Google Maps API. Please check your API key.'));
                };
                document.body.appendChild(script);
            });
        }
        
        async function processAddresses() {
            if (csvData.length === 0) {
                showError('No CSV data to process');
                return;
            }
            
            const errorMessageDiv = document.getElementById('errorMessage');
            errorMessageDiv.style.display = 'none';
            
            const progressContainer = document.getElementById('progressContainer');
            const progressBar = document.getElementById('progressBar');
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
            
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'none';
            
            const downloadBtn = document.getElementById('downloadBtn');
            downloadBtn.style.display = 'none';
            
            results = [];
            
            try {
                await loadGoogleMapsAPI();
                
                for (let i = 0; i < csvData.length; i++) {
                    const row = csvData[i];
                    
                    // Create full addresses
                    const originFullAddress = `${row.OriginAddress}, ${row.OriginCity}, ${row.OriginState} ${row.OriginZip}`;
                    const destFullAddress = `${row.DestinationAddress}, ${row.DestinationCity}, ${row.DestinationState} ${row.DestinationZip}`;
                    
                    try {
                        const distanceResult = await calculateDistance(originFullAddress, destFullAddress);
                        
                        results.push({
                            ...row,
                            OriginFullAddress: originFullAddress,
                            DestinationFullAddress: destFullAddress,
                            Distance: distanceResult.distance,
                            DistanceText: distanceResult.distanceText,
                            Duration: distanceResult.duration,
                            DurationText: distanceResult.durationText,
                            TravelMode: selectedMode
                        });
                    } catch (error) {
                        results.push({
                            ...row,
                            OriginFullAddress: originFullAddress,
                            DestinationFullAddress: destFullAddress,
                            Distance: 'Error',
                            DistanceText: error.message,
                            Duration: 'Error',
                            DurationText: error.message,
                            TravelMode: selectedMode
                        });
                    }
                    
                    // Update progress
                    const progress = Math.round(((i + 1) / csvData.length) * 100);
                    progressBar.style.width = `${progress}%`;
                    progressBar.textContent = `${progress}%`;
                    
                    // Small delay to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                displayResults();
            } catch (error) {
                showError('Error: ' + error.message);
            }
        }
        
        function calculateDistance(origin, destination) {
            return new Promise((resolve, reject) => {
                const request = {
                    origins: [origin],
                    destinations: [destination],
                    travelMode: google.maps.TravelMode[selectedMode],
                    unitSystem: google.maps.UnitSystem.METRIC
                };
                
                distanceMatrixService.getDistanceMatrix(request, function(response, status) {
                    if (status !== 'OK') {
                        reject(new Error(`Error: ${status}`));
                        return;
                    }
                    
                    try {
                        const origins = response.originAddresses;
                        const destinations = response.destinationAddresses;
                        
                        if (origins.length === 0 || destinations.length === 0) {
                            reject(new Error('Could not find the location'));
                            return;
                        }
                        
                        const result = response.rows[0].elements[0];
                        
                        if (result.status === 'OK') {
                            resolve({
                                distance: result.distance.value, // in meters
                                distanceText: result.distance.text,
                                duration: result.duration.value, // in seconds
                                durationText: result.duration.text
                            });
                        } else {
                            reject(new Error(`Route error: ${result.status}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }
        
        function displayResults() {
            const resultDiv = document.getElementById('result');
            const downloadBtn = document.getElementById('downloadBtn');
            
            // Create a summary
            const successCount = results.filter(r => r.Distance !== 'Error').length;
            const totalCount = results.length;
            
            resultDiv.innerHTML = `
                <h3>Results Summary</h3>
                <p>Successfully processed ${successCount} out of ${totalCount} address pairs.</p>
                <p>Travel mode: ${selectedMode.charAt(0) + selectedMode.slice(1).toLowerCase()}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Origin</th>
                            <th>Destination</th>
                            <th>Distance</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.slice(0, 10).map(result => `
                            <tr>
                                <td>${result.OriginFullAddress}</td>
                                <td>${result.DestinationFullAddress}</td>
                                <td>${result.DistanceText}</td>
                                <td>${result.DurationText}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${results.length > 10 ? '<p>Showing 10 of ' + results.length + ' results. Download the CSV to see all results.</p>' : ''}
            `;
            
            resultDiv.style.display = 'block';
            downloadBtn.style.display = 'block';
        }
        
        function downloadResults() {
            if (results.length === 0) return;
    
    // Create CSV headers
    const headers = [
        'OriginAddress', 'OriginCity', 'OriginState', 'OriginZip',
        'DestinationAddress', 'DestinationCity', 'DestinationState', 'DestinationZip',
        'OriginFullAddress', 'DestinationFullAddress',
        'Distance', 'DistanceText', 'Duration', 'DurationText', 'TravelMode'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    results.forEach(row => {
        const values = headers.map(header => {
            // Convert to string explicitly to handle numbers and other types
            let value = String(row[header] || '');
            // Escape commas and quotes
            if (value.includes(',') || value.includes('"')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'distance_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
        
        function generateTemplateCSV() {
            const headers = [
                'OriginAddress', 'OriginCity', 'OriginState', 'OriginZip',
                'DestinationAddress', 'DestinationCity', 'DestinationState', 'DestinationZip'
            ];
            
            let csvContent = headers.join(',') + '\n';
            
            // Add two sample rows - one simple, one with commas that shows proper quoting
            csvContent += '123 Main St,Los Angeles,CA,90001,456 Elm St,San Francisco,CA,94101\n';
            csvContent += '"100 Center Ave, Suite 100",Chicago,IL,60601,"200 Park Ave, Floor 23",New York,NY,10166\n';
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'address_template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        function showError(message) {
            const errorMessageDiv = document.getElementById('errorMessage');
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            
            const progressContainer = document.getElementById('progressContainer');
            progressContainer.style.display = 'none';
        }