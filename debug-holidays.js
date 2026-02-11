const Holidays = require('date-holidays')
const hd = new Holidays('KR')

const holidays2026 = hd.getHolidays(2026)
console.log('2026 Holidays:')
holidays2026.forEach(h => {
  console.log(`${h.date} - ${h.name} (${h.type})`)
})
