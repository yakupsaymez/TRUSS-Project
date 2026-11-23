// Component Imports
import { useSidebar } from '@/components/ui/sidebar'

// Util Imports
import { cn } from '@/lib/utils'

const ARM_CLASSES =
  'stroke-border group-hover/edge:stroke-muted-foreground group-focus-visible/edge:stroke-muted-foreground origin-[6px_9px] transition-all duration-300 ease-out'

const SidebarEdgeToggle = () => {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const label = isCollapsed ? 'Genişlet' : 'Daralt'
  const ariaLabel = isCollapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'

  return (
    <button
      type='button'
      onClick={toggleSidebar}
      aria-label={ariaLabel}
      className='group/edge absolute top-1/2 right-0 z-30 hidden h-20 w-4 translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center outline-none md:flex'
    >
      <svg
        viewBox='0 0 12 18'
        fill='none'
        strokeWidth={3}
        strokeLinecap='round'
        aria-hidden='true'
        className={cn(
          'h-[18px] w-3 overflow-visible transition-transform duration-300',
          isCollapsed
            ? '-scale-x-100 group-hover/edge:translate-x-[3px] group-focus-visible/edge:translate-x-[3px]'
            : 'group-hover/edge:-translate-x-[3px] group-focus-visible/edge:-translate-x-[3px]'
        )}
      >
        <line
          x1='6'
          y1='1.5'
          x2='6'
          y2='9'
          className={cn(ARM_CLASSES, 'group-hover/edge:rotate-38 group-focus-visible/edge:rotate-38')}
        />
        <line
          x1='6'
          y1='9'
          x2='6'
          y2='16.5'
          className={cn(ARM_CLASSES, 'group-hover/edge:-rotate-38 group-focus-visible/edge:-rotate-38')}
        />
      </svg>
      <span className='bg-foreground text-background pointer-events-none absolute top-1/2 left-full ml-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/edge:opacity-100 group-focus-visible/edge:opacity-100'>
        {label}
      </span>
    </button>
  )
}

export default SidebarEdgeToggle
