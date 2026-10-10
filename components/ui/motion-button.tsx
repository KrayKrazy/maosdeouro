'use client'

import { FC } from 'react'
import { ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: any[]) { return twMerge(clsx(inputs)) }

interface Props {
  label: string
  variant?: 'primary' | 'secondary'
  classes?: string
  animate?: boolean
  delay?: number
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const MotionButton: FC<Props> = ({ label, classes, onClick, type = 'button', disabled = false }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'bg-background group relative h-12 w-full max-w-sm cursor-pointer rounded-full border border-[#D4AF37]/30 p-1 outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        classes
      )}
    >
      <span
        className='circle bg-gradient-to-r from-[#D4AF37] to-[#B5952F] m-0 block h-10 w-10 overflow-hidden rounded-full duration-500 group-hover:w-full'
        aria-hidden='true'
      ></span>
      <div className='icon absolute top-1/2 left-3 translate-x-0 -translate-y-1/2 duration-500 group-hover:translate-x-[0.4rem]'>
        <ArrowRight className='text-black size-5' />
      </div>
      <span className='button-text text-white group-hover:text-black font-manrope absolute top-2/4 left-2/4 ml-4 -translate-x-2/4 -translate-y-2/4 text-center text-sm font-bold uppercase tracking-widest whitespace-nowrap duration-500'>
        {label}
      </span>
    </button>
  )
}

export default MotionButton
