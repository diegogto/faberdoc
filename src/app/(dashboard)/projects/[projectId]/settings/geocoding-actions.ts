"use server";

import { z } from "zod";

const coordinateRegex = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

interface GeocodingResult {
  success: boolean;
  address?: string;
  comuna?: string;
  region?: string;
  country?: string;
  lat?: string;
  lon?: string;
  error?: string;
}

export async function resolveLocationAction(query: string): Promise<GeocodingResult> {
  if (!query || !query.trim()) {
    return { success: false, error: "La dirección o coordenadas no pueden estar vacías." };
  }

  const trimmedQuery = query.trim();
  const coordMatch = trimmedQuery.match(coordinateRegex);

  try {
    let url = "";

    if (coordMatch) {
      const lat = coordMatch[1];
      const lon = coordMatch[2];
      url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    } else {
      url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedQuery)}&format=json&addressdetails=1&limit=1`;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Faberdoc-App/1.0 (contact@faberdoc.com; Engineering Document Control)",
        "Accept-Language": "es",
      },
      next: { revalidate: 3600 } // Cache results for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned status: ${response.status}`);
    }

    const data = await response.json();

    // If forward geocoding, Nominatim returns an array
    const result = Array.isArray(data) ? data[0] : data;

    if (!result || (!result.address && !coordMatch)) {
      return {
        success: false,
        error: "No se pudieron obtener resultados para esta ubicación. Por favor, verifica el formato e ingresa los campos manualmente."
      };
    }

    const addressDetails = result.address || {};
    
    // Fallbacks for geographic names across countries
    const comuna =
      addressDetails.suburb ||
      addressDetails.city_district ||
      addressDetails.town ||
      addressDetails.village ||
      addressDetails.city ||
      addressDetails.municipality ||
      addressDetails.county ||
      "";

    const region =
      addressDetails.state ||
      addressDetails.province ||
      addressDetails.region ||
      "";

    const country = addressDetails.country || "";

    return {
      success: true,
      address: result.display_name || trimmedQuery,
      comuna,
      region,
      country,
      lat: result.lat || coordMatch?.[1],
      lon: result.lon || coordMatch?.[2]
    };
  } catch (err) {
    console.error("Geocoding exception:", err);
    return {
      success: false,
      error: "Error de red al consultar el servicio de mapas. Puedes ingresar los campos geográficos manualmente."
    };
  }
}
