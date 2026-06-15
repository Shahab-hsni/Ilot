/** First `count` words of `text`, with an ellipsis when anything was cut. */
export function firstWords(text: string, count = 2): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= count) return text.trim()
  return words.slice(0, count).join(' ') + '…'
}
