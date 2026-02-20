// Suppress noisy output during tests
const originalWarn = console.warn
const originalLog = console.log

console.warn = (...args) => {
    // Suppress SQLite TEXT warning
    if (args[0]?.includes?.('SQLite does not support TEXT with options')) return
    originalWarn.apply(console, args)
}

console.log = (...args) => {
    // Suppress "Database synced" messages
    if (args[0] === 'Database synced') return
    originalLog.apply(console, args)
}
