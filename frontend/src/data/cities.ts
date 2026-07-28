/**
 * Top ~90 major world cities by metro population, hand-curated so no data
 * pipeline is needed. Coordinates are approximate city-centre in WGS-84.
 * Used by the City Labels overlay.
 */
export interface City {
  name: string;
  lat: number;
  lon: number;
  /**
   * Tier drives display density. Tier 1 = mega-cities (>15M), always visible.
   * Tier 2 = large cities (>5M), visible at medium zoom. Tier 3 = notable
   * cities visible only when close.
   */
  tier: 1 | 2 | 3;
}

export const CITIES: readonly City[] = [
  // Tier 1 — mega-cities (~15M+ metro)
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917, tier: 1 },
  { name: 'Delhi', lat: 28.7041, lon: 77.1025, tier: 1 },
  { name: 'Shanghai', lat: 31.2304, lon: 121.4737, tier: 1 },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, tier: 1 },
  { name: 'Mexico City', lat: 19.4326, lon: -99.1332, tier: 1 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, tier: 1 },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, tier: 1 },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074, tier: 1 },
  { name: 'Dhaka', lat: 23.8103, lon: 90.4125, tier: 1 },
  { name: 'New York', lat: 40.7128, lon: -74.006, tier: 1 },
  { name: 'Karachi', lat: 24.8607, lon: 67.0011, tier: 1 },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, tier: 1 },
  { name: 'Istanbul', lat: 41.0082, lon: 28.9784, tier: 1 },
  { name: 'Manila', lat: 14.5995, lon: 120.9842, tier: 1 },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792, tier: 1 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, tier: 1 },
  { name: 'Moscow', lat: 55.7558, lon: 37.6173, tier: 1 },
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456, tier: 1 },
  { name: 'London', lat: 51.5074, lon: -0.1278, tier: 1 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, tier: 1 },
  { name: 'Seoul', lat: 37.5665, lon: 126.978, tier: 1 },

  // Tier 2 — large / capital cities (5-15M metro or nationally important)
  { name: 'Osaka', lat: 34.6937, lon: 135.5023, tier: 2 },
  { name: 'Guangzhou', lat: 23.1291, lon: 113.2644, tier: 2 },
  { name: 'Chongqing', lat: 29.4316, lon: 106.9123, tier: 2 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, tier: 2 },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, tier: 2 },
  { name: 'Tianjin', lat: 39.3434, lon: 117.3616, tier: 2 },
  { name: 'Kinshasa', lat: -4.4419, lon: 15.2663, tier: 2 },
  { name: 'Shenzhen', lat: 22.5431, lon: 114.0579, tier: 2 },
  { name: 'Lahore', lat: 31.5497, lon: 74.3436, tier: 2 },
  { name: 'Bangalore', lat: 12.9716, lon: 77.5946, tier: 2 },
  { name: 'Bogotá', lat: 4.711, lon: -74.0721, tier: 2 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, tier: 2 },
  { name: 'Lima', lat: -12.0464, lon: -77.0428, tier: 2 },
  { name: 'Bangkok', lat: 13.7563, lon: 100.5018, tier: 2 },
  { name: 'Hyderabad', lat: 17.385, lon: 78.4867, tier: 2 },
  { name: 'Tehran', lat: 35.6892, lon: 51.389, tier: 2 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298, tier: 2 },
  { name: 'Chengdu', lat: 30.5728, lon: 104.0668, tier: 2 },
  { name: 'Wuhan', lat: 30.5928, lon: 114.3055, tier: 2 },
  { name: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297, tier: 2 },
  { name: 'Kuala Lumpur', lat: 3.139, lon: 101.6869, tier: 2 },
  { name: 'Hong Kong', lat: 22.3193, lon: 114.1694, tier: 2 },
  { name: 'Hanoi', lat: 21.0278, lon: 105.8342, tier: 2 },
  { name: 'Riyadh', lat: 24.7136, lon: 46.6753, tier: 2 },
  { name: 'Baghdad', lat: 33.3152, lon: 44.3661, tier: 2 },
  { name: 'Santiago', lat: -33.4489, lon: -70.6693, tier: 2 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, tier: 2 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, tier: 2 },
  { name: 'Houston', lat: 29.7604, lon: -95.3698, tier: 2 },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832, tier: 2 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, tier: 2 },
  { name: 'Berlin', lat: 52.52, lon: 13.404, tier: 2 },
  { name: 'Rome', lat: 41.9028, lon: 12.4964, tier: 2 },
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219, tier: 2 },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241, tier: 2 },
  { name: 'Johannesburg', lat: -26.2041, lon: 28.0473, tier: 2 },
  { name: 'Melbourne', lat: -37.8136, lon: 144.9631, tier: 2 },
  { name: 'Casablanca', lat: 33.5731, lon: -7.5898, tier: 2 },

  // Tier 3 — capitals / notable cities visible only when zoomed in
  { name: 'Washington DC', lat: 38.9072, lon: -77.0369, tier: 3 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, tier: 3 },
  { name: 'Boston', lat: 42.3601, lon: -71.0589, tier: 3 },
  { name: 'Miami', lat: 25.7617, lon: -80.1918, tier: 3 },
  { name: 'Vancouver', lat: 49.2827, lon: -123.1207, tier: 3 },
  { name: 'Montreal', lat: 45.5017, lon: -73.5673, tier: 3 },
  { name: 'Havana', lat: 23.1136, lon: -82.3666, tier: 3 },
  { name: 'Reykjavík', lat: 64.1466, lon: -21.9426, tier: 3 },
  { name: 'Dublin', lat: 53.3498, lon: -6.2603, tier: 3 },
  { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, tier: 3 },
  { name: 'Brussels', lat: 50.8503, lon: 4.3517, tier: 3 },
  { name: 'Zürich', lat: 47.3769, lon: 8.5417, tier: 3 },
  { name: 'Vienna', lat: 48.2082, lon: 16.3738, tier: 3 },
  { name: 'Warsaw', lat: 52.2297, lon: 21.0122, tier: 3 },
  { name: 'Prague', lat: 50.0755, lon: 14.4378, tier: 3 },
  { name: 'Budapest', lat: 47.4979, lon: 19.0402, tier: 3 },
  { name: 'Athens', lat: 37.9838, lon: 23.7275, tier: 3 },
  { name: 'Kyiv', lat: 50.4501, lon: 30.5234, tier: 3 },
  { name: 'Bucharest', lat: 44.4268, lon: 26.1025, tier: 3 },
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686, tier: 3 },
  { name: 'Oslo', lat: 59.9139, lon: 10.7522, tier: 3 },
  { name: 'Copenhagen', lat: 55.6761, lon: 12.5683, tier: 3 },
  { name: 'Helsinki', lat: 60.1699, lon: 24.9384, tier: 3 },
  { name: 'Reykjavik', lat: 64.1466, lon: -21.9426, tier: 3 },
  { name: 'Doha', lat: 25.2854, lon: 51.531, tier: 3 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, tier: 3 },
  { name: 'Tel Aviv', lat: 32.0853, lon: 34.7818, tier: 3 },
  { name: 'Kathmandu', lat: 27.7172, lon: 85.324, tier: 3 },
  { name: 'Colombo', lat: 6.9271, lon: 79.8612, tier: 3 },
  { name: 'Ulaanbaatar', lat: 47.8864, lon: 106.9057, tier: 3 },
  { name: 'Auckland', lat: -36.8485, lon: 174.7633, tier: 3 },
  { name: 'Wellington', lat: -41.2865, lon: 174.7762, tier: 3 },
  { name: 'Anchorage', lat: 61.2181, lon: -149.9003, tier: 3 },
  { name: 'Honolulu', lat: 21.3099, lon: -157.8581, tier: 3 },
  { name: 'Perth', lat: -31.9505, lon: 115.8605, tier: 3 },
  { name: 'Addis Ababa', lat: 9.145, lon: 40.4897, tier: 3 },
  { name: 'Accra', lat: 5.6037, lon: -0.187, tier: 3 },
  { name: 'Nouakchott', lat: 18.0735, lon: -15.9582, tier: 3 },
  { name: 'McMurdo Station', lat: -77.8419, lon: 166.6863, tier: 3 },
];
