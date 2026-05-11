import { cn, getInitials, getAvatarColor } from '../../lib/utils'

export default function Avatar({ name, size = 'md', className }) {
  const initials = getInitials(name || '?')
  const gradient = getAvatarColor(name || 'A')

  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-9 h-9 text-[12px]',
    lg: 'w-12 h-12 text-[14px]',
    xl: 'w-16 h-16 text-[18px]',
  }

  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shrink-0',
      `bg-gradient-to-br ${gradient}`,
      sizes[size] || sizes.md,
      className
    )}>
      {initials}
    </div>
  )
}
