import type { ComponentPropsWithoutRef } from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger'
type ButtonProps = ComponentPropsWithoutRef<'button'> & { variant?: Variant }
type LinkButtonProps = LinkProps & { variant?: Variant }

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function LinkButton({
  variant = 'primary',
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`${styles.button} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
