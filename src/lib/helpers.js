export function roundTo(value, digits=2) {
  let result = Math.round(value * 10**digits) / 10**digits
  
  result = result.toString()
  const [whole, decimal] = result.split('.')
  if (decimal && decimal.length < digits) {
    result = whole + '.' + decimal.padEnd(digits, '0')
  }
  
  return result
}