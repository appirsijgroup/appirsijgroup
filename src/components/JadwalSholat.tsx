import React, { useState, useEffect, useRef, useMemo } from 'react';
import { type Employee } from '../types';
import { fetchPrayerTimes, getCityFromCoords, searchCity, type PrayerTimesData } from '../services/prayerTimeService';

// Konstanta untuk koordinat Ka'bah
const KAABA_LAT = 21.422487;
const KAABA_LON = 39.826206;

const JadwalSholat: React.FC<{ employee: Employee }> = ({ employee }) => {
    const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
    const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [locationName, setLocationName] = useState<string | null>(null);
    const [qiblaDirection, setQiblaDirection] = useState(0);
    const [compassHeading, setCompassHeading] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    useEffect(() => {
        const getInitialData = async () => {
            setIsLoading(true);
            setError(null);

            let locationId = employee.locationId;
            let locationName = employee.locationName;
            let coordsForQibla: { lat: number, lon: number } | null = null;

            // 1. Try to get precise location from GPS for Qibla and for prayer times
            if (navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        });
                    });
                    const { latitude, longitude } = position.coords;
                    coordsForQibla = { lat: latitude, lon: longitude };

                    // Try to find a matching city to get prayer times, overriding profile if successful
                    const cityName = await getCityFromCoords(latitude, longitude);
                    if (cityName) {
                        const city = await searchCity(cityName);
                        if (city) {
                            locationId = city.id;
                            locationName = city.lokasi;
                        }
                    }
                } catch {
                    // We can still try to show prayer times from profile, but Qibla might be off.
                    if (!coordsForQibla) {
                        setError("Gagal mendapatkan lokasi GPS. Arah Kiblat mungkin tidak akurat.");
                    }
                }
            } else {
                setError("Geolocation tidak didukung. Arah Kiblat mungkin tidak akurat.");
            }

            // Set location for Qibla if we have it
            if (coordsForQibla) {
                setLocation(coordsForQibla);
            }

            // 2. Fallback to default if both GPS and profile fail to provide a locationId for prayer times
            if (!locationId) {
                locationId = '1301'; // Default to Jakarta
                locationName = 'KOTA JAKARTA PUSAT';
            }

            // 3. Fetch prayer times with the determined locationId
            try {
                const today = new Date().toISOString().split('T')[0];
                const times = await fetchPrayerTimes(locationId, today);
                if (times) {
                    setPrayerTimes(times);
                    setLocationName(locationName || 'Lokasi tidak diketahui');
                } else {
                    throw new Error(`Jadwal sholat untuk lokasi ${locationName || `ID ${locationId}`} tidak dapat dimuat.`);
                }
            } catch (fetchError: unknown) {
                const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
                setError(prev => prev ? `${prev}\n${errorMessage}` : `Gagal memuat jadwal sholat: ${errorMessage}.`);
            } finally {
                setIsLoading(false);
            }
        };

        getInitialData();

    }, [employee]);

    // Separate effect for camera to avoid dependency issues and unnecessary restarts
    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setCameraStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch {
                setError(prev => prev ? prev + "\nKamera belakang tidak dapat diakses untuk tampilan AR." : "Kamera belakang tidak dapat diakses untuk tampilan AR.");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Effect for calculating Qibla direction
    useEffect(() => {
        if (location) {
            const { lat, lon } = location;
            const phiK = KAABA_LAT * Math.PI / 180.0;
            const lambdaK = KAABA_LON * Math.PI / 180.0;
            const phi = lat * Math.PI / 180.0;
            const lambda = lon * Math.PI / 180.0;
            const qibla = 180.0 / Math.PI * Math.atan2(
                Math.sin(lambdaK - lambda),
                Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda)
            );
            setQiblaDirection(qibla);
        }
    }, [location]);

    // Effect for device orientation (compass)
    useEffect(() => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            let heading = 0;
            // 'webkitCompassHeading' is for iOS Safari
            const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
            if (webkitHeading !== undefined && webkitHeading !== null) {
                heading = -webkitHeading; // iOS direction is opposite
            } else if (event.alpha !== null) {
                // 'alpha' is the standard, but needs calibration for North
                heading = -event.alpha; // Adjust based on device calibration
            }
            setCompassHeading(heading);
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        } else {
            setError(prev => prev ? prev + "\nSensor kompas tidak didukung di perangkat ini." : "Sensor kompas tidak didukung di perangkat ini.");
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, []);

    const { nextPrayerName, nextPrayerTime, nextPrayerDate } = useMemo(() => {
        if (!prayerTimes) return { nextPrayerName: null, nextPrayerTime: null, nextPrayerDate: null };

        const prayerSchedule = [
            { name: "Subuh", time: prayerTimes.subuh },
            { name: "Dzuhur", time: prayerTimes.dzuhur },
            { name: "Ashar", time: prayerTimes.ashar },
            { name: "Maghrib", time: prayerTimes.maghrib },
            { name: "Isya", time: prayerTimes.isya },
        ];

        let nextPrayer = null;
        for (const prayer of prayerSchedule) {
            if (!prayer.time || typeof prayer.time !== 'string') continue;
            const [hour, minute] = prayer.time.split(':').map(Number);
            const prayerDate = new Date(currentTime);
            prayerDate.setHours(hour, minute, 0, 0);

            if (prayerDate > currentTime) {
                nextPrayer = { ...prayer, date: prayerDate };
                break;
            }
        }

        // If all prayers for today are past, next is Subuh tomorrow
        if (!nextPrayer) {
            const subuhTime = prayerSchedule[0].time.split(':').map(Number);
            const tomorrow = new Date(currentTime);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(subuhTime[0], subuhTime[1], 0, 0);
            return { nextPrayerName: "Subuh", nextPrayerTime: prayerSchedule[0].time, nextPrayerDate: tomorrow };
        }

        return { nextPrayerName: nextPrayer.name, nextPrayerTime: nextPrayer.time, nextPrayerDate: nextPrayer.date };
    }, [prayerTimes, currentTime]);

    useEffect(() => {
        if (!nextPrayerDate) {
            setTimeLeft("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const diff = nextPrayerDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("Waktu sholat telah tiba");
                clearInterval(interval);
            } else {
                const totalSeconds = Math.floor(diff / 1000);
                const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
                const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
                const seconds = String(totalSeconds % 60).padStart(2, '0');
                setTimeLeft(`${hours}:${minutes}:${seconds}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [nextPrayerDate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
            </div>
        );
    }

    const renderError = () => {
        if (!error) return null;
        if (!prayerTimes) {
            // Fatal error, can't show anything
            return <div className="text-center text-red-300 p-8 bg-red-900/50 rounded-lg whitespace-pre-line">{error}</div>;
        }
        // Non-fatal error (e.g., GPS failed, but prayer times loaded from profile)
        return <div className="mb-4 p-3 bg-yellow-500/30 text-yellow-200 text-center rounded-lg animate-fade-in" role="alert">{error}</div>;
    };

    if (!prayerTimes && error) {
        return renderError();
    }

    return (
        <div className="space-y-8">
            {renderError()}
            <div className="relative p-6 bg-linear-to-br from-gray-800 to-gray-900/50 rounded-2xl border border-white/10 shadow-2xl text-center">
                <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5"></div>
                <p className="text-blue-300 font-semibold">{locationName || "Lokasi tidak diketahui"}</p>
                <p className="text-white text-lg">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {nextPrayerName && (
                    <div className="mt-4">
                        <p className="text-teal-300 text-3xl sm:text-4xl font-bold">{nextPrayerName} {nextPrayerTime}</p>
                        <p className="text-yellow-300 text-lg font-mono tracking-widest mt-2">{timeLeft}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
                {prayerTimes && Object.entries(prayerTimes).filter(([key]) => key !== 'terbit' && key !== 'imsak' && key !== 'tanggal' && key !== 'dhuha').map(([name, time]) => (
                    <div key={name} className="bg-black/20 p-4 rounded-lg border border-white/10">
                        <p className="font-bold text-white capitalize">{name}</p>
                        <p className="text-2xl font-mono text-blue-300">{time}</p>
                    </div>
                ))}
            </div>

            <div className="bg-black/20 p-4 rounded-2xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Arah Kiblat</h3>
                <div className="relative w-full aspect-square max-w-sm mx-auto rounded-full overflow-hidden border-4 border-teal-500/50 shadow-lg">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover"></video>
                    <div className="absolute top-0 left-0 w-full h-full bg-black/50"></div>
                    <div className="absolute top-0 left-0 w-full h-full" style={{ transform: `rotate(${compassHeading}deg)` }}>
                        <div className="absolute top-1/2 left-1/2 -mt-4 -ml-4 w-8 h-8 text-center text-white font-bold">N</div>
                        <div className="absolute bottom-0 left-1/2 -mb-4 -ml-4 w-8 h-8 text-center text-white">S</div>
                        <div className="absolute top-1/2 right-0 -mr-4 -ml-4 w-8 h-8 text-center text-white">E</div>
                        <div className="absolute top-1/2 left-0 -ml-4 w-8 h-8 text-center text-white">W</div>
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full transition-transform duration-200" style={{ transform: `rotate(${qiblaDirection + compassHeading}deg)` }}>
                        <div className="absolute top-0 left-1/2 -ml-3 w-6 h-1/2 flex flex-col items-center">
                            <div className="w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-b-20 border-b-teal-400"></div>
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-teal-300 rounded-full border-2 border-gray-900"></div>
                </div>
                <p className="text-center text-blue-200 mt-4 text-sm">Arahkan perangkat Anda hingga panah sejajar dengan garis utara-selatan dan menunjuk ke arah Kiblat. Derajat Kiblat: {qiblaDirection.toFixed(2)}° dari Utara.</p>
            </div>
            <style>{`
                .bg-grid-pattern {
                    background-image: linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
                    background-size: 2rem 2rem;
                }
            `}</style>
        </div>
    );
};

export default JadwalSholat;