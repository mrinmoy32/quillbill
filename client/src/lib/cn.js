/** Join class names, skipping falsy values:  cn('a', isOn && 'b') */
export const cn = (...parts) => parts.filter(Boolean).join(' ')
