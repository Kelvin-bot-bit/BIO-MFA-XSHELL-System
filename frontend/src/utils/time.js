/* ./utils/time.js */

/**
 * Format a timestamp as "time ago" (e.g., "5 minutes ago", "2 days ago")
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Human-readable time ago string
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Unknown";

  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diffInSeconds < minute) {
    return "Just now";
  } else if (diffInSeconds < hour) {
    const minutes = Math.floor(diffInSeconds / minute);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInSeconds < day) {
    const hours = Math.floor(diffInSeconds / hour);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (diffInSeconds < week) {
    const days = Math.floor(diffInSeconds / day);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else if (diffInSeconds < month) {
    const weeks = Math.floor(diffInSeconds / week);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  } else if (diffInSeconds < year) {
    const months = Math.floor(diffInSeconds / month);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    const years = Math.floor(diffInSeconds / year);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
};

/**
 * Format date for display with proper timezone handling
 * @param {string|Date} timestamp - The timestamp to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string in local timezone
 */
export const formatDate = (timestamp, options = {}) => {
  if (!timestamp) return "N/A";

  const date = new Date(timestamp);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  const defaultOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short", // This will show timezone (e.g., GMT+3)
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return date.toLocaleString("en-US", mergedOptions);
};

/**
 * Format date for charts (YYYY-MM-DD) in UTC
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatChartDate = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Format time for display with timezone
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted time string with timezone
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
};

/**
 * Get relative time (e.g., "in 2 days", "expires in 1 hour")
 * @param {string|Date} timestamp - Future timestamp
 * @returns {string} Relative time string
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return "Unknown";

  const now = new Date();
  const target = new Date(timestamp);
  const diffMs = target - now;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    return "Expired";
  } else if (diffDays > 0) {
    return `in ${diffDays} ${diffDays === 1 ? "day" : "days"}`;
  } else if (diffHours > 0) {
    return `in ${diffHours} ${diffHours === 1 ? "hour" : "hours"}`;
  } else if (diffMinutes > 0) {
    return `in ${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"}`;
  } else {
    return "in less than a minute";
  }
};

/**
 * Check if timestamp is within last N minutes (in local time)
 * @param {string|Date} timestamp - The timestamp to check
 * @param {number} minutes - Number of minutes
 * @returns {boolean} True if within last N minutes
 */
export const isWithinLastMinutes = (timestamp, minutes) => {
  if (!timestamp) return false;

  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes <= minutes;
};

/**
 * Check if timestamp is within last N hours (in local time)
 * @param {string|Date} timestamp - The timestamp to check
 * @param {number} hours - Number of hours
 * @returns {boolean} True if within last N hours
 */
export const isWithinLastHours = (timestamp, hours) => {
  if (!timestamp) return false;

  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= hours;
};

/**
 * Check if timestamp is within last N days (in local time)
 * @param {string|Date} timestamp - The timestamp to check
 * @param {number} days - Number of days
 * @returns {boolean} True if within last N days
 */
export const isWithinLastDays = (timestamp, days) => {
  if (!timestamp) return false;

  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
};

/**
 * Get start of day in local time
 * @param {Date} date - Reference date (defaults to now)
 * @returns {Date} Start of day
 */
export const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day in local time
 * @param {Date} date - Reference date (defaults to now)
 * @returns {Date} End of day
 */
export const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get date range for charts (last N days)
 * @param {number} days - Number of days
 * @returns {Object} Object with start and end dates
 */
export const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
};

/**
 * Get array of dates between start and end (inclusive)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of date strings (YYYY-MM-DD)
 */
export const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(formatChartDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Get user's timezone
 * @returns {string} User's timezone (e.g., "Africa/Nairobi")
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Get timezone offset in hours with sign
 * @returns {string} Timezone offset (e.g., "+03:00")
 */
export const getTimezoneOffset = () => {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? "+" : "-";

  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

/**
 * Get timezone abbreviation (e.g., "EAT", "EST")
 * @returns {string} Timezone abbreviation
 */
export const getTimezoneAbbr = () => {
  const date = new Date();
  return (
    date.toLocaleTimeString("en-us", { timeZoneName: "short" }).split(" ")[2] ||
    ""
  );
};

/**
 * Convert UTC time to local time string
 * @param {string|Date} utcTimestamp - UTC timestamp
 * @returns {string} Local time string
 */
export const utcToLocal = (utcTimestamp) => {
  if (!utcTimestamp) return "";

  const date = new Date(utcTimestamp);
  return date.toString();
};

/**
 * Format timestamp for API (ISO string)
 * @param {Date} date - Date to format
 * @returns {string} ISO string
 */
export const toISOString = (date = new Date()) => {
  return date.toISOString();
};

/**
 * Check if a date is today (in local timezone)
 * @param {string|Date} timestamp - The timestamp to check
 * @returns {boolean} True if date is today
 */
export const isToday = (timestamp) => {
  if (!timestamp) return false;

  const date = new Date(timestamp);
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is yesterday (in local timezone)
 * @param {string|Date} timestamp - The timestamp to check
 * @returns {boolean} True if date is yesterday
 */
export const isYesterday = (timestamp) => {
  if (!timestamp) return false;

  const date = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Get day of week name
 * @param {string|Date} timestamp - The timestamp
 * @param {boolean} short - Return short name (e.g., "Mon" vs "Monday")
 * @returns {string} Day of week name
 */
export const getDayOfWeek = (timestamp, short = false) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const options = { weekday: short ? "short" : "long" };
  return date.toLocaleDateString("en-US", options);
};

/**
 * Get month name
 * @param {string|Date} timestamp - The timestamp
 * @param {boolean} short - Return short name (e.g., "Jan" vs "January")
 * @returns {string} Month name
 */
export const getMonthName = (timestamp, short = false) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const options = { month: short ? "short" : "long" };
  return date.toLocaleDateString("en-US", options);
};

/**
 * Calculate difference between two dates in days
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date (defaults to now)
 * @returns {number} Difference in days
 */
export const getDaysDifference = (date1, date2 = new Date()) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Format seconds into readable duration
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return "0m";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);

  return parts.join(" ") || "0s";
};

/**
 * Get greeting based on local time of day
 * @param {string|Date} timestamp - Reference time (defaults to now)
 * @returns {string} Appropriate greeting
 */
export const getGreeting = (timestamp = new Date()) => {
  const date = new Date(timestamp);
  const hours = date.getHours();

  if (hours < 12) {
    return "Good morning";
  } else if (hours < 18) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
};

/**
 * Check if a timestamp is between two dates
 * @param {Date} timestamp - Date to check
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {boolean} True if between
 */
export const isBetween = (timestamp, start, end) => {
  const date = new Date(timestamp);
  return date >= new Date(start) && date <= new Date(end);
};

/**
 * Format timestamp for display in activity logs (with timezone)
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted timestamp with timezone
 */
export const formatActivityTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const timezone = getTimezoneAbbr();

  return (
    date.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + ` ${timezone}`
  );
};

export default {
  formatTimeAgo,
  formatDate,
  formatChartDate,
  formatTime,
  getRelativeTime,
  isWithinLastMinutes,
  isWithinLastHours,
  isWithinLastDays,
  getStartOfDay,
  getEndOfDay,
  getDateRange,
  getDatesInRange,
  getUserTimezone,
  getTimezoneOffset,
  getTimezoneAbbr,
  utcToLocal,
  toISOString,
  isToday,
  isYesterday,
  getDayOfWeek,
  getMonthName,
  getDaysDifference,
  formatDuration,
  getGreeting,
  isBetween,
  formatActivityTime,
};
