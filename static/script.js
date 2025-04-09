if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/sw.js')
    // .then(() => console.log("Service Worker Registered"))
    .catch(err => console.error("Service Worker Failed:", err));
}
