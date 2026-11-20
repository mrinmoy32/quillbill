/** Turn the API's validation error into { fieldName: message } so forms can show it under each input. */
export function fieldErrors(error) {
  const out = {}
  for (const d of error?.details || []) out[d.field] = d.message
  return out
}
