// Reverse geocoding con Nominatim (OpenStreetMap). API pública, sin key.
// Docs: https://nominatim.org/release-docs/develop/api/Reverse/

export interface GeocodeResult {
  calle: string;
  numero: string;
  colonia: string;
  referencia: string;
  displayName: string;
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  path?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  hamlet?: string;
  residential?: string;
  city_district?: string;
}

interface NominatimResponse {
  display_name: string;
  address?: NominatimAddress;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  try {
    const url =
      NOMINATIM_URL +
      '?format=json&lat=' + lat +
      '&lon=' + lng +
      '&zoom=18&addressdetails=1&accept-language=es';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IMBIO-Pabellon-App/1.0' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    const a = data.address ?? {};
    return {
      calle: a.road ?? a.pedestrian ?? a.path ?? '',
      numero: a.house_number ?? '',
      colonia:
        a.neighbourhood ??
        a.suburb ??
        a.quarter ??
        a.residential ??
        a.hamlet ??
        a.city_district ??
        '',
      referencia: '',
      displayName: data.display_name ?? '',
    };
  } catch {
    return null;
  }
}
