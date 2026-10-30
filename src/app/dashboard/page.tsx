


// "use client";

// import { useCallback, useEffect, useState } from "react";
// import type { FormEvent } from "react";
// import { useRouter } from "next/navigation";

// type User = {
//   name: string;
//   email: string;
// };

// type CityData = {
//   placeId: number;
//   name: string;
//   state: string;
//   country: string;
//   latitude: number;
//   longitude: number;
//   displayName: string;
// };

// type WeatherData = {
//   temperature: number;
//   description: string;
//   icon: string;
//   humidity: number;
//   windSpeed: number;
//   pressure: number;
// };

// type SavedCity = {
//   id: number;
//   city: string;
//   state: string;
//   country: string;
//   latitude: number;
//   longitude: number;
//   created_at: string;
//   is_primary?: boolean;
// };

// type ApiCityResponse = {
//   message?: string;
//   city?: SavedCity;
// };

// type ApiWeatherResponse = {
//   message?: string;
//   data?: WeatherData;
// };

// export default function DashboardPage() {
//   const router = useRouter();

//   const [city, setCity] = useState<string>("");
//   const [user, setUser] = useState<User | null>(null);
//   const [searchResults, setSearchResults] = useState<CityData[]>([]);
//   const [weatherData, setWeatherData] = useState<Record<number, WeatherData>>({});
//   const [weatherLoading, setWeatherLoading] = useState<Record<number, boolean>>({});
//   const [savedCities, setSavedCities] = useState<SavedCity[]>([]);
//   const [searching, setSearching] = useState<boolean>(false);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [myLocation, setMyLocation] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   const fetchCityWeather = useCallback(async (cityId: number, token: string) => {
//     setWeatherLoading((previous) => ({ ...previous, [cityId]: true }));

//     try {
//       const response = await fetch(`/api/weatherdata?cityId=${cityId}`, {
//         method: "GET",
//         headers: { Authorization: `Bearer ${token}` },
//         cache: "no-store",
//       });

//       const result: ApiWeatherResponse = await response.json();

//       if (!response.ok) {
//         throw new Error(result.message || `Weather request failed (${response.status})`);
//       }

//       if (!result.data) {
//         throw new Error("Weather API response did not contain data.");
//       }

//       setWeatherData((previous) => ({
//         ...previous,
//         [cityId]: result.data as WeatherData,
//       }));
//     } finally {
//       setWeatherLoading((previous) => ({ ...previous, [cityId]: false }));
//     }
//   }, []);


//   useEffect(() => {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       router.push("/");
//       return;
//     }

//     let cancelled = false;

//     const loadDashboard = async () => {
//       setLoading(true);
//       setError(null);

//       try {
//         const myselfResponse = await fetch("/api/myself", {
//           method: "GET",
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (!myselfResponse.ok) {
//           throw new Error("Failed to fetch user data");
//         }

//         const myselfData = await myselfResponse.json();
//         if (!cancelled) setUser(myselfData.data);

//         const cityResponse = await fetch("/api/city", {
//           method: "GET",
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (!cityResponse.ok) {
//           const errorData = await cityResponse.json().catch(() => ({}));
//           throw new Error(errorData.message || "Failed to fetch saved cities");
//         }

//         const cityData = await cityResponse.json();
//         const cities: SavedCity[] = Array.isArray(cityData.data) ? cityData.data : [];

//         if (cancelled) return;

//         setSavedCities(cities);
//         setWeatherData({});
//         setWeatherLoading({});

//         // Fetch weather concurrently. One city's failure won't block the others.
//         await Promise.all(
//           cities.map(async (savedCity) => {
//             try {
//               await fetchCityWeather(savedCity.id, token);
//             } catch (weatherError) {
//               console.error(`Could not load weather for ${savedCity.city}:`, weatherError);
//             }
//           })
//         );
//       } catch (loadError) {
//         if (cancelled) return;
//         console.error("Error loading dashboard:", loadError);
//         setError(
//           loadError instanceof Error
//             ? loadError.message
//             : "Failed to load dashboard data. Please try again later."
//         );
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     void loadDashboard();

//     return () => {
//       cancelled = true;
//     };
//   }, [router, fetchCityWeather]);

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     router.push("/");
//   };

//   const handleSearchbar = async (event: FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     const query = city.trim();

//     if (!query) {
//       setSearchResults([]);
//       setError("Please enter a city name.");
//       return;
//     }

//     try {
//       setSearching(true);
//       setError(null);

//       const response = await fetch(
//         `/api/city-search?city=${encodeURIComponent(query)}`
//       );
//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || "Failed to search for city");
//       }

//       const results: CityData[] = Array.isArray(data.results) ? data.results : [];
//       setSearchResults(results);

//       if (results.length === 0) {
//         setError("No matching locations found. Try another city name.");
//       }
//     } catch (searchError) {
//       console.error("Error searching for city:", searchError);
//       setError(
//         searchError instanceof Error
//           ? searchError.message
//           : "Failed to search for city. Please try again later."
//       );
//       setSearchResults([]);
//     } finally {
//       setSearching(false);
//     }
//   };

//   const handleSelectCity = async (selectedCity: CityData) => {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       router.push("/");
//       return;
//     }

//     setError(null);

//     try {
//       const response = await fetch("/api/city", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           city: selectedCity.name,
//           state: selectedCity.state,
//           country: selectedCity.country,
//           latitude: selectedCity.latitude,
//           longitude: selectedCity.longitude,
//         }),
//       });

//       const data: ApiCityResponse = await response.json();

//       if (response.status === 409) {
//         setError(data.message || "This city is already saved.");
//         setSearchResults([]);

//         // The duplicate response includes the existing database city; refresh its weather.
//         if (data.city?.id) {
//           try {
//             await fetchCityWeather(data.city.id, token);
//           } catch (weatherError) {
//             console.error("Could not refresh weather for saved city:", weatherError);
//           }
//         }
//         return;
//       }

//       if (!response.ok) {
//         throw new Error(data.message || "Failed to save city");
//       }

//       const newCity = data.city;
//       if (!newCity) {
//         throw new Error("City was saved, but the API did not return the saved city data.");
//       }

//       setSavedCities((previousCities) => {
//         if (previousCities.some((savedCity) => savedCity.id === newCity.id)) {
//           return previousCities;
//         }
//         return [...previousCities, newCity];
//       });
//       setCity("");
//       setSearchResults([]);

//       // Save succeeds first; weather failure should not be reported as a save failure.
//       try {
//         await fetchCityWeather(newCity.id, token);
//       } catch (weatherError) {
//         console.error("Weather fetch failed for newly saved city:", weatherError);
//         setError(`City saved, but weather could not be loaded for ${newCity.city}.`);
//       }
//     } catch (saveError) {
//       console.error("Error saving city:", saveError);
//       setError(
//         saveError instanceof Error
//           ? saveError.message
//           : "Failed to save city. Please try again later."
//       );
//     }
//   };

//   const handleRemoveCity = async (cityId: number) => {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       router.push("/");
//       return;
//     }

//     setError(null);

//     try {
//       const response = await fetch(`/api/city?id=${cityId}`, {
//         method: "DELETE",
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || "Failed to remove city");
//       }

//       setSavedCities((previousCities) =>
//         previousCities.filter((savedCity) => savedCity.id !== cityId)
//       );
//       setWeatherData((previousWeatherData) => {
//         const updated = { ...previousWeatherData };
//         delete updated[cityId];
//         return updated;
//       });
//       setWeatherLoading((previous) => {
//         const updated = { ...previous };
//         delete updated[cityId];
//         return updated;
//       });
//     } catch (removeError) {
//       console.error("Error removing city:", removeError);
//       setError(
//         removeError instanceof Error
//           ? removeError.message
//           : "Failed to remove city. Please try again later."
//       );
//     }
//   };


// const handleMylocation = () => {
//   const token = localStorage.getItem("token");

//   if (!token) {
//     router.push("/");
//     return;
//   }

//   if (!navigator.geolocation) {
//     setError("Geolocation is not supported by your browser.");
//     return;
//   }

//   setMyLocation(true);
//   setError(null);

//   navigator.geolocation.getCurrentPosition(
//     async (position) => {
//       const { latitude, longitude } = position.coords;

//       try {
//         const locationResponse = await fetch(
//           `/api/location?lat=${latitude}&lon=${longitude}`
//         );

//         const locationData = await locationResponse.json();

//         if (!locationResponse.ok) {
//           throw new Error(
//             locationData.message || "Failed to get location data"
//           );
//         }
//         const address =
//           locationData.address &&
//           typeof locationData.address === "object"
//             ? locationData.address
//             : {};

//         const resolvedCity =
//           locationData.city ||
//           address.city ||
//           address.town ||
//           address.village ||
//           address.municipality ||
//           "";

//         const resolvedState =
//           locationData.state ||
//           address.state ||
//           address.state_district ||
//           address.county ||
//           "";

//         const resolvedCountry =
//           locationData.country ||
//           address.country ||
//           "";

//         console.log("Resolved location:", {
//           city: resolvedCity,
//           state: resolvedState,
//           country: resolvedCountry,
//           latitude,
//           longitude,
//         });

//         if (!resolvedCity || !resolvedCountry) {
//           throw new Error(
//             "Location response is missing city or country."
//           );
//         }
//         const cityResponse = await fetch("/api/city", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({
//             city: resolvedCity,
//             state: resolvedState,
//             country: resolvedCountry,
//             latitude,
//             longitude,
//           }),
//         });

//         const cityData: ApiCityResponse = await cityResponse.json();
//         if (cityResponse.status === 409) {
//           const existingCity = cityData.city;

//           if (existingCity?.id) {
//             setSavedCities((previousCities) =>
//               previousCities.some(
//                 (savedCity) => savedCity.id === existingCity.id
//               )
//                 ? previousCities
//                 : [...previousCities, existingCity]
//             );

//             await fetchCityWeather(existingCity.id, token);
//             setError(null);
//             return;
//           }

//           throw new Error(
//             cityData.message || "Your current city is already saved."
//           );
//         }

//         if (!cityResponse.ok) {
//           throw new Error(
//             cityData.message || "Failed to save your current location."
//           );
//         }

//         const newCity = cityData.city;

//         if (!newCity) {
//           throw new Error(
//             "The API did not return the saved city data."
//           );
//         }
//         setSavedCities((previousCities) =>
//           previousCities.some(
//             (savedCity) => savedCity.id === newCity.id
//           )
//             ? previousCities
//             : [...previousCities, newCity]
//         );
//         try {
//           await fetchCityWeather(newCity.id, token);
//           setError(null);
//         } catch (weatherError) {
//           console.error(
//             "Weather fetch failed for current location:",
//             weatherError
//           );

//           setError(
//             `Location saved, but weather could not be loaded for ${newCity.city}.`
//           );
//         }
//       } catch (locationError) {
//         console.error(
//           "Error fetching/saving current location:",
//           locationError
//         );

//         setError(
//           locationError instanceof Error
//             ? locationError.message
//             : "Failed to get your current location. Please try again."
//         );
//       } finally {
//         setMyLocation(false);
//       }
//     },
//     (geoError) => {
//       console.error("Geolocation error:", geoError);

//       setError(
//         geoError.code === geoError.PERMISSION_DENIED
//           ? "Location permission was denied. Allow location access and try again."
//           : geoError.code === geoError.TIMEOUT
//             ? "Getting your location timed out. Please try again."
//             : "Unable to access your location. Please try again."
//       );

//       setMyLocation(false);
//     },
//     {
//       enableHighAccuracy: false,
//       timeout: 10000,
//       maximumAge: 60000,
//     }
//   );
// };


//   return (
//     <div className="min-h-screen bg-slate-100 text-slate-900">
//       {/* Header */}
//       <header className="border-b border-slate-200 bg-white">
//         <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
//           <div>
//             <h1 className="text-2xl font-bold">Weather Dashboard</h1>
//             <p className="text-sm text-slate-500">Welcome, {user?.name || "User"}!</p>
//           </div>

//           <button
//             type="button"
//             onClick={handleLogout}
//             className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 hover:bg-slate-50"
//           >
//             Logout
//           </button>
//         </div>
//       </header>

//       <main className="mx-auto max-w-7xl space-y-9 px-6 py-9">
//         {/* Search City */}
//         <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
//           <h2 className="text-xl font-bold">Search City</h2>
//           <p className="mt-1 text-sm text-slate-500">
//             Search for a city to view its weather.
//           </p>

//           <form onSubmit={handleSearchbar} className="mt-6 flex flex-col gap-3 sm:flex-row">
//             <input
//               type="text"
//               value={city}
//               onChange={(event) => setCity(event.target.value)}
//               placeholder="Enter city name..."
//               className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
//             />

//             <button
//               type="submit"
//               disabled={searching}
//               className="rounded-lg bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {searching ? "Searching..." : "Search"}
//             </button>

//             <button
//               type="button"
//               onClick={handleMylocation}
//               disabled={myLocation}
//               className="whitespace-nowrap rounded-lg border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {myLocation ? "Getting location..." : "📍 My Location"}
//             </button>
//           </form>

//           {error && (
//             <p role="alert" className="mt-3 text-sm text-red-600">
//               {error}
//             </p>
//           )}
//         </section>

//         {/* Search Results */}
//         {searchResults.length > 0 && (
//           <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
//             <h3 className="mb-3 font-semibold text-slate-800">Search Results</h3>
//             <div className="space-y-2">
//               {searchResults.map((item) => (
//                 <button
//                   key={item.placeId}
//                   type="button"
//                   onClick={() => void handleSelectCity(item)}
//                   className="block w-full rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
//                 >
//                   <p className="font-medium text-slate-900">{item.name}</p>
//                   <p className="mt-1 text-sm text-slate-500">
//                     {[item.state, item.country].filter(Boolean).join(", ")}
//                   </p>
//                   {item.displayName && item.displayName !== item.name && (
//                     <p className="mt-1 text-xs text-slate-400">{item.displayName}</p>
//                   )}
//                 </button>
//               ))}
//             </div>
//           </section>
//         )}

//         {/* Saved Cities */}
//         <section>
//           <h2 className="text-xl font-bold">My Cities</h2>
//           <p className="mt-1 text-sm text-slate-500">Your saved weather locations</p>

//           {loading && savedCities.length === 0 ? (
//             <p className="mt-5 text-sm text-slate-500">Loading saved locations...</p>
//           ) : savedCities.length === 0 ? (
//             <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-sm text-slate-500">
//               No saved locations yet. Search for a city above and select a result to add it here.
//             </div>
//           ) : (
//             <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
//               {savedCities.map((savedCity) => {
//                 const weather = weatherData[savedCity.id];
//                 const isWeatherLoading = weatherLoading[savedCity.id] === true;

//                 return (
//                   <div
//                     key={savedCity.id}
//                     className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div>
//                         <div className="flex flex-wrap items-center gap-2">
//                           <h3 className="text-xl font-bold">{savedCity.city}</h3>
//                           {savedCity.is_primary && (
//                             <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
//                               Primary
//                             </span>
//                           )}
//                         </div>
//                         <p className="mt-1 text-sm text-slate-500">
//                           {[savedCity.state, savedCity.country].filter(Boolean).join(", ") || "Location details unavailable"}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="mt-7 rounded-xl bg-slate-50 px-4 py-5">
//                       {weather ? (
//                         <>
//                           <div className="flex items-center gap-4">
//                             <span className="text-4xl">{weather.icon}</span>
//                             <div>
//                               <p className="text-3xl font-bold">
//                                 {Math.round(weather.temperature)}°C
//                               </p>
//                               <p className="mt-1 capitalize text-sm text-slate-500">
//                                 {weather.description}
//                               </p>
//                             </div>
//                           </div>

//                           <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4">
//                             <div>
//                               <p className="text-xs text-slate-500">Humidity</p>
//                               <p className="mt-1 font-semibold">{weather.humidity}%</p>
//                             </div>
//                             <div>
//                               <p className="text-xs text-slate-500">Wind</p>
//                               <p className="mt-1 font-semibold">{weather.windSpeed} m/s</p>
//                             </div>
//                             <div>
//                               <p className="text-xs text-slate-500">Pressure</p>
//                               <p className="mt-1 font-semibold">{Math.round(weather.pressure)} hPa</p>
//                             </div>
//                           </div>
//                         </>
//                       ) : (
//                         <div className="text-sm text-slate-500">
//                           {isWeatherLoading || loading
//                             ? "Loading current weather..."
//                             : "Weather unavailable. Try refreshing the page."}
//                           {!isWeatherLoading && !loading && (
//                             <button
//                               type="button"
//                               onClick={() => {
//                                 const token = localStorage.getItem("token");
//                                 if (!token) {
//                                   router.push("/");
//                                   return;
//                                 }
//                                 void fetchCityWeather(savedCity.id, token).catch((weatherError) => {
//                                   console.error("Weather retry failed:", weatherError);
//                                   setError(`Could not load weather for ${savedCity.city}. Please try again.`);
//                                 });
//                               }}
//                               className="ml-2 font-medium text-blue-600 hover:text-blue-800"
//                             >
//                               Retry
//                             </button>
//                           )}
//                         </div>
//                       )}
//                     </div>

//                     <div className="mt-6 flex items-center justify-between">
//                       <span className="text-sm text-slate-400">
//                         {savedCity.is_primary ? "Primary City" : "Saved City"}
//                       </span>
//                       <button
//                         type="button"
//                         onClick={() => void handleRemoveCity(savedCity.id)}
//                         className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600"
//                       >
//                         Remove
//                       </button>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </section>
//       </main>
//     </div>
//   );
// }


"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

type User = {
  name: string;
  email: string;
};

type CityData = {
  placeId: number;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  displayName: string;
};

type WeatherData = {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
};

type SavedCity = {
  id: number;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  created_at: string;
  is_primary?: boolean;
};

type ApiCityResponse = {
  message?: string;
  city?: SavedCity;
};

type ApiWeatherResponse = {
  message?: string;
  data?: WeatherData;
};

type ApiCommentaryResponse = {
  message?: string;
  data?: {
    cityId: number;
    city: string;
    commentary: string;
  };
};

export default function DashboardPage() {
  const router = useRouter();

  const [city, setCity] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<CityData[]>([]);
  const [weatherData, setWeatherData] = useState<Record<number, WeatherData>>({});
  const [weatherLoading, setWeatherLoading] = useState<Record<number, boolean>>({});
  const [weatherCommentary, setWeatherCommentary] = useState<Record<number, string>>({});
  const [commentaryLoading, setCommentaryLoading] = useState<Record<number, boolean>>({});
  const [commentaryError, setCommentaryError] = useState<Record<number, string>>({});
  const [savedCities, setSavedCities] = useState<SavedCity[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [myLocation, setMyLocation] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherCommentary = useCallback(
    async (cityId: number, token: string, weather: WeatherData) => {
      setCommentaryLoading((previous) => ({
        ...previous,
        [cityId]: true,
      }));

      setCommentaryError((previous) => ({
        ...previous,
        [cityId]: "",
      }));

      try {
        const response = await fetch("/api/weather-commentery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cityId,
            weather: {
              temperature: weather.temperature,
              description: weather.description,
              humidity: weather.humidity,
              windSpeed: weather.windSpeed,
              pressure: weather.pressure,
            },
          }),
        });

        const result: ApiCommentaryResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Could not generate weather commentary."
          );
        }

        const commentary = result.data?.commentary;

        if (!commentary) {
          throw new Error("The API returned no commentary.");
        }

        setWeatherCommentary((previous) => ({
          ...previous,
          [cityId]: commentary,
        }));
      } catch (error) {
        console.error(
          `Could not generate commentary for city ${cityId}:`,
          error
        );

        setCommentaryError((previous) => ({
          ...previous,
          [cityId]:
            error instanceof Error
              ? error.message
              : "Could not generate commentary.",
        }));
      } finally {
        setCommentaryLoading((previous) => ({
          ...previous,
          [cityId]: false,
        }));
      }
    },
    []
  );

  const fetchCityWeather = useCallback(
    async (cityId: number, token: string) => {
      setWeatherLoading((previous) => ({ ...previous, [cityId]: true }));

      try {
        const response = await fetch(`/api/weatherdata?cityId=${cityId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const result: ApiWeatherResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || `Weather request failed (${response.status})`
          );
        }

        if (!result.data) {
          throw new Error("Weather API response did not contain data.");
        }

        const weather = result.data;

        setWeatherData((previous) => ({
          ...previous,
          [cityId]: weather,
        }));

        // Generate commentary independently so a slow LLM does not delay weather display.
        void fetchWeatherCommentary(cityId, token, weather);
      } finally {
        setWeatherLoading((previous) => ({ ...previous, [cityId]: false }));
      }
    },
    [fetchWeatherCommentary]
  );


  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const myselfResponse = await fetch("/api/myself", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!myselfResponse.ok) {
          throw new Error("Failed to fetch user data");
        }

        const myselfData = await myselfResponse.json();
        if (!cancelled) setUser(myselfData.data);

        const cityResponse = await fetch("/api/city", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cityResponse.ok) {
          const errorData = await cityResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to fetch saved cities");
        }

        const cityData = await cityResponse.json();
        const cities: SavedCity[] = Array.isArray(cityData.data) ? cityData.data : [];

        if (cancelled) return;

        setSavedCities(cities);
        setWeatherData({});
        setWeatherLoading({});

        // Fetch weather concurrently. One city's failure won't block the others.
        await Promise.all(
          cities.map(async (savedCity) => {
            try {
              await fetchCityWeather(savedCity.id, token);
            } catch (weatherError) {
              console.error(`Could not load weather for ${savedCity.city}:`, weatherError);
            }
          })
        );
      } catch (loadError) {
        if (cancelled) return;
        console.error("Error loading dashboard:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load dashboard data. Please try again later."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router, fetchCityWeather]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const handleSearchbar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = city.trim();

    if (!query) {
      setSearchResults([]);
      setError("Please enter a city name.");
      return;
    }

    try {
      setSearching(true);
      setError(null);

      const response = await fetch(
        `/api/city-search?city=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to search for city");
      }

      const results: CityData[] = Array.isArray(data.results) ? data.results : [];
      setSearchResults(results);

      if (results.length === 0) {
        setError("No matching locations found. Try another city name.");
      }
    } catch (searchError) {
      console.error("Error searching for city:", searchError);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Failed to search for city. Please try again later."
      );
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCity = async (selectedCity: CityData) => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    setError(null);

    try {
      const response = await fetch("/api/city", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: selectedCity.name,
          state: selectedCity.state,
          country: selectedCity.country,
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
        }),
      });

      const data: ApiCityResponse = await response.json();

      if (response.status === 409) {
        setError(data.message || "This city is already saved.");
        setSearchResults([]);

        // The duplicate response includes the existing database city; refresh its weather.
        if (data.city?.id) {
          try {
            await fetchCityWeather(data.city.id, token);
          } catch (weatherError) {
            console.error("Could not refresh weather for saved city:", weatherError);
          }
        }
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to save city");
      }

      const newCity = data.city;
      if (!newCity) {
        throw new Error("City was saved, but the API did not return the saved city data.");
      }

      setSavedCities((previousCities) => {
        if (previousCities.some((savedCity) => savedCity.id === newCity.id)) {
          return previousCities;
        }
        return [...previousCities, newCity];
      });
      setCity("");
      setSearchResults([]);

      // Save succeeds first; weather failure should not be reported as a save failure.
      try {
        await fetchCityWeather(newCity.id, token);
      } catch (weatherError) {
        console.error("Weather fetch failed for newly saved city:", weatherError);
        setError(`City saved, but weather could not be loaded for ${newCity.city}.`);
      }
    } catch (saveError) {
      console.error("Error saving city:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save city. Please try again later."
      );
    }
  };

  const handleRemoveCity = async (cityId: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/city?id=${cityId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove city");
      }

      setSavedCities((previousCities) =>
        previousCities.filter((savedCity) => savedCity.id !== cityId)
      );
      setWeatherData((previousWeatherData) => {
        const updated = { ...previousWeatherData };
        delete updated[cityId];
        return updated;
      });
      setWeatherLoading((previous) => {
        const updated = { ...previous };
        delete updated[cityId];
        return updated;
      });
      setWeatherCommentary((previous) => {
        const updated = { ...previous };
        delete updated[cityId];
        return updated;
      });
      setCommentaryLoading((previous) => {
        const updated = { ...previous };
        delete updated[cityId];
        return updated;
      });
      setCommentaryError((previous) => {
        const updated = { ...previous };
        delete updated[cityId];
        return updated;
      });
    } catch (removeError) {
      console.error("Error removing city:", removeError);
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove city. Please try again later."
      );
    }
  };


const handleMylocation = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    router.push("/");
    return;
  }

  if (!navigator.geolocation) {
    setError("Geolocation is not supported by your browser.");
    return;
  }

  setMyLocation(true);
  setError(null);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const locationResponse = await fetch(
          `/api/location?lat=${latitude}&lon=${longitude}`
        );

        const locationData = await locationResponse.json();

        if (!locationResponse.ok) {
          throw new Error(
            locationData.message || "Failed to get location data"
          );
        }
        const address =
          locationData.address &&
          typeof locationData.address === "object"
            ? locationData.address
            : {};

        const resolvedCity =
          locationData.city ||
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          "";

        const resolvedState =
          locationData.state ||
          address.state ||
          address.state_district ||
          address.county ||
          "";

        const resolvedCountry =
          locationData.country ||
          address.country ||
          "";

        console.log("Resolved location:", {
          city: resolvedCity,
          state: resolvedState,
          country: resolvedCountry,
          latitude,
          longitude,
        });

        if (!resolvedCity || !resolvedCountry) {
          throw new Error(
            "Location response is missing city or country."
          );
        }
        const cityResponse = await fetch("/api/city", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            city: resolvedCity,
            state: resolvedState,
            country: resolvedCountry,
            latitude,
            longitude,
          }),
        });

        const cityData: ApiCityResponse = await cityResponse.json();
        if (cityResponse.status === 409) {
          const existingCity = cityData.city;

          if (existingCity?.id) {
            setSavedCities((previousCities) =>
              previousCities.some(
                (savedCity) => savedCity.id === existingCity.id
              )
                ? previousCities
                : [...previousCities, existingCity]
            );

            await fetchCityWeather(existingCity.id, token);
            setError(null);
            return;
          }

          throw new Error(
            cityData.message || "Your current city is already saved."
          );
        }

        if (!cityResponse.ok) {
          throw new Error(
            cityData.message || "Failed to save your current location."
          );
        }

        const newCity = cityData.city;

        if (!newCity) {
          throw new Error(
            "The API did not return the saved city data."
          );
        }
        setSavedCities((previousCities) =>
          previousCities.some(
            (savedCity) => savedCity.id === newCity.id
          )
            ? previousCities
            : [...previousCities, newCity]
        );
        try {
          await fetchCityWeather(newCity.id, token);
          setError(null);
        } catch (weatherError) {
          console.error(
            "Weather fetch failed for current location:",
            weatherError
          );

          setError(
            `Location saved, but weather could not be loaded for ${newCity.city}.`
          );
        }
      } catch (locationError) {
        console.error(
          "Error fetching/saving current location:",
          locationError
        );

        setError(
          locationError instanceof Error
            ? locationError.message
            : "Failed to get your current location. Please try again."
        );
      } finally {
        setMyLocation(false);
      }
    },
    (geoError) => {
      console.error("Geolocation error:", geoError);

      setError(
        geoError.code === geoError.PERMISSION_DENIED
          ? "Location permission was denied. Allow location access and try again."
          : geoError.code === geoError.TIMEOUT
            ? "Getting your location timed out. Please try again."
            : "Unable to access your location. Please try again."
      );

      setMyLocation(false);
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
};


  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">Weather Dashboard</h1>
            <p className="text-sm text-slate-500">Welcome, {user?.name || "User"}!</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-9 px-6 py-9">
        {/* Search City */}
        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold">Search City</h2>
          <p className="mt-1 text-sm text-slate-500">
            Search for a city to view its weather.
          </p>

          <form onSubmit={handleSearchbar} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Enter city name..."
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={handleMylocation}
              disabled={myLocation}
              className="whitespace-nowrap rounded-lg border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {myLocation ? "Getting location..." : "📍 My Location"}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </section>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-800">Search Results</h3>
            <div className="space-y-2">
              {searchResults.map((item) => (
                <button
                  key={item.placeId}
                  type="button"
                  onClick={() => void handleSelectCity(item)}
                  className="block w-full rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {[item.state, item.country].filter(Boolean).join(", ")}
                  </p>
                  {item.displayName && item.displayName !== item.name && (
                    <p className="mt-1 text-xs text-slate-400">{item.displayName}</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Saved Cities */}
        <section>
          <h2 className="text-xl font-bold">My Cities</h2>
          <p className="mt-1 text-sm text-slate-500">Your saved weather locations</p>

          {loading && savedCities.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">Loading saved locations...</p>
          ) : savedCities.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-sm text-slate-500">
              No saved locations yet. Search for a city above and select a result to add it here.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {savedCities.map((savedCity) => {
                const weather = weatherData[savedCity.id];
                const isWeatherLoading = weatherLoading[savedCity.id] === true;

                return (
                  <div
                    key={savedCity.id}
                    className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{savedCity.city}</h3>
                          {savedCity.is_primary && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {[savedCity.state, savedCity.country].filter(Boolean).join(", ") || "Location details unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 rounded-xl bg-slate-50 px-4 py-5">
                      {weather ? (
                        <>
                          <div className="flex items-center gap-4">
                            <span className="text-4xl">{weather.icon}</span>
                            <div>
                              <p className="text-3xl font-bold">
                                {Math.round(weather.temperature)}°C
                              </p>
                              <p className="mt-1 capitalize text-sm text-slate-500">
                                {weather.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4">
                            <div>
                              <p className="text-xs text-slate-500">Humidity</p>
                              <p className="mt-1 font-semibold">{weather.humidity}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Wind</p>
                              <p className="mt-1 font-semibold">{weather.windSpeed} m/s</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Pressure</p>
                              <p className="mt-1 font-semibold">{Math.round(weather.pressure)} hPa</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-slate-500">
                          {isWeatherLoading || loading
                            ? "Loading current weather..."
                            : "Weather unavailable. Try refreshing the page."}
                          {!isWeatherLoading && !loading && (
                            <button
                              type="button"
                              onClick={() => {
                                const token = localStorage.getItem("token");
                                if (!token) {
                                  router.push("/");
                                  return;
                                }
                                void fetchCityWeather(savedCity.id, token).catch((weatherError) => {
                                  console.error("Weather retry failed:", weatherError);
                                  setError(`Could not load weather for ${savedCity.city}. Please try again.`);
                                });
                              }}
                              className="ml-2 font-medium text-blue-600 hover:text-blue-800"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AI-generated weather comedy */}
                    <div className="mt-4 overflow-hidden rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 p-5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl" aria-hidden="true">
                          🎭
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800">
                            Weather Roast
                          </h4>
                          <p className="text-xs text-slate-500">
                            Powered by AI · Hinglish comedy
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        {commentaryLoading[savedCity.id] ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="animate-pulse" aria-hidden="true">
                              🎤
                            </span>
                            <span>Gemma is cooking up a roast...</span>
                          </div>
                        ) : weatherCommentary[savedCity.id] ? (
                          <p className="text-sm leading-6 text-slate-700">
                            {weatherCommentary[savedCity.id]}
                          </p>
                        ) : commentaryError[savedCity.id] ? (
                          <p className="text-sm text-slate-500">
                            Comedy is taking a break! Your weather data is still available.
                            <button
                              type="button"
                              onClick={() => {
                                const token = localStorage.getItem("token");
                                if (!token) {
                                  router.push("/");
                                  return;
                                }
                                const currentWeather = weatherData[savedCity.id];
                                if (currentWeather) {
                                  void fetchWeatherCommentary(
                                    savedCity.id,
                                    token,
                                    currentWeather
                                  );
                                }
                              }}
                              className="ml-2 font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                            >
                              Try again
                            </button>
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Your weather roast will appear here.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        {savedCity.is_primary ? "Primary City" : "Saved City"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRemoveCity(savedCity.id)}
                        className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


