// Time validation service to detect system time manipulation
// This service tracks time drift and validates against server time

import { getServerTime } from '@/services/timeService';

class TimeValidationService {
  private static instance: TimeValidationService;
  private lastKnownTime: Date | null = null;
  private serverTimeOffset: number = 0; // in milliseconds
  private timeDriftThreshold: number = 300000; // 5 minutes threshold
  private lastSyncTime: number = 0;
  private syncInterval: number = 300000; // Sync every 5 minutes

  private constructor() {}

  public static getInstance(): TimeValidationService {
    if (!TimeValidationService.instance) {
      TimeValidationService.instance = new TimeValidationService();
    }
    return TimeValidationService.instance;
  }

  // Synchronize with server time
  public async syncWithServerTime(): Promise<void> {
    try {
      const serverTime = await getServerTime();
      const currentTime = Date.now();
      this.serverTimeOffset = serverTime.getTime() - currentTime;
      this.lastSyncTime = currentTime;
    } catch (error) {
      console.warn('Failed to sync with server time:', error);
    }
  }

  // Get the corrected current time based on server offset
  public getCorrectedTime(): Date {
    const localTime = new Date();
    return new Date(localTime.getTime() + this.serverTimeOffset);
  }

  // Validate if the current time is legitimate (not manipulated)
  public validateTime(): { isValid: boolean; correctedTime: Date; timeDifference: number } {
    const correctedTime = this.getCorrectedTime();
    const localTime = new Date();
    const timeDifference = Math.abs(correctedTime.getTime() - localTime.getTime());

    // If time difference exceeds threshold, consider it manipulated
    const isValid = timeDifference <= this.timeDriftThreshold;

    // Track the last known legitimate time
    if (isValid) {
      this.lastKnownTime = correctedTime;
    }

    return {
      isValid,
      correctedTime,
      timeDifference
    };
  }

  // Check if user has manipulated system time recently
  public isSystemTimeManipulated(): boolean {
    const { isValid, timeDifference } = this.validateTime();
    
    if (!isValid) {
      console.warn(`System time appears manipulated. Difference: ${timeDifference}ms`);
      return true;
    }

    // Also check if time went backwards
    if (this.lastKnownTime && this.lastKnownTime.getTime() > Date.now()) {
      console.warn('Detected time going backwards - possible manipulation');
      return true;
    }

    return false;
  }

  // Periodically sync with server
  public startPeriodicSync(): void {
    setInterval(async () => {
      await this.syncWithServerTime();
    }, this.syncInterval);
  }

  // Get server time offset
  public getServerTimeOffset(): number {
    return this.serverTimeOffset;
  }
}

export const timeValidationService = TimeValidationService.getInstance();