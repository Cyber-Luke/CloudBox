/**
 * CloudBox Configuration
 */

// API Configuration
window.API_BASE_URL = (() => {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}:${port}/api`;
})();

// Application Settings
window.CLOUDBOX_CONFIG = {
  // Auto-logout timeout in milliseconds (10 minutes)
  AUTO_LOGOUT_TIMEOUT: 10 * 60 * 1000,

  // Maximum file size for uploads (in bytes)
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB

  // Supported file types for preview
  PREVIEW_TYPES: {
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    video: ["video/mp4", "video/webm", "video/ogg"],
    audio: ["audio/mp3", "audio/wav", "audio/ogg"],
    text: ["text/plain", "text/html", "text/css", "text/javascript"],
  },

  // UI Settings
  ANIMATION_DURATION: 300,
  GRID_BREAKPOINTS: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
  },
};
