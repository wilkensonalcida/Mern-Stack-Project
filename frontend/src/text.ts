// Ends a message with a period when it has no closing punctuation, so the server's short messages,
// such as "Invalid login or password", read as sentences like every other error line on the forms.
export function sentence(text: string): string {
  const trimmed = text.trim()
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}
