# Address Distance Calculator

## Overview
The Address Distance Calculator is a web-based application that calculates distances between multiple address pairs using the Google Maps API. This tool processes CSV files containing origin and destination address components and generates a downloadable CSV file with distance and duration information.

## Features
- **Batch Processing**: Calculate distances for multiple address pairs in a single operation
- **Multiple Travel Modes**: Support for driving, walking, cycling, and public transit modes
- **CSV Import/Export**: Import address data from CSV and export results to CSV
- **Progress Tracking**: Visual progress bar for batch processing operations
- **Error Handling**: Graceful handling of failed calculations with informative error messages
- **Data Preview**: Preview of imported CSV data before processing
- **User-provided API Key**: Use your own Google Maps API key

## Requirements
- A Google Maps API key with the Distance Matrix API enabled
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Getting Started

### 1. Obtain a Google Maps API Key
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Distance Matrix API" and "Geocoding API"
4. Create credentials to obtain your API key
5. Make sure billing is enabled for your Google Cloud project

### 2. Usage
1. Enter your Google Maps API key in the provided field
2. Upload a CSV file with origin and destination address data
   - Use the "Download template CSV" link to get a properly formatted template
3. Select your preferred travel mode (driving, walking, cycling, or transit)
4. Click "Process Addresses" to start the calculation
5. Once processing is complete, view the results summary
6. Click "Download Results as CSV" to save the full results

## CSV File Format

### Input CSV Format
Your CSV file must include the following columns:
- `OriginAddress`: Street address of the origin location
- `OriginCity`: City of the origin location
- `OriginState`: State/province of the origin location
- `OriginZip`: Postal/ZIP code of the origin location
- `DestinationAddress`: Street address of the destination location
- `DestinationCity`: City of the destination location
- `DestinationState`: State/province of the destination location
- `DestinationZip`: Postal/ZIP code of the destination location

Example CSV content:
```
OriginAddress,OriginCity,OriginState,OriginZip,DestinationAddress,DestinationCity,DestinationState,DestinationZip
123 Main St,Los Angeles,CA,90001,456 Elm St,San Francisco,CA,94101
```

### Output CSV Format
The generated CSV file will include all input columns plus:
- `OriginFullAddress`: Combined full address of origin
- `DestinationFullAddress`: Combined full address of destination
- `Distance`: Distance in meters
- `DistanceText`: Formatted distance (e.g., "384 km")
- `Duration`: Travel duration in seconds
- `DurationText`: Formatted duration (e.g., "3 hours 45 mins")
- `TravelMode`: Mode of travel used for calculation

## Limitations
- The Google Maps API has usage limits and may require a billing account for high-volume usage
- Processing large datasets may take considerable time
- Rate limiting is implemented to avoid exceeding Google API quotas (200ms delay between requests)
- The application may not work correctly for addresses outside Google Maps coverage areas

## Support
For issues with the Google Maps API, please refer to the [Google Maps Platform Documentation](https://developers.google.com/maps/documentation).