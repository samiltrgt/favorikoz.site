import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import ResetPasswordForm from '@/components/reset-password-form'
import AuthConfirmation from '@/components/auth-confirmation'
import { completeImplicitEmailLink } from '@/lib/auth-email-link'

jest.mock('@/components/header', () => () => null)
jest.mock('@/components/footer', () => () => null)
jest.mock('@/lib/auth-email-link', () => ({ completeImplicitEmailLink: jest.fn() }))
const mockUpdateUser = jest.fn()
jest.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({ auth: { updateUser: mockUpdateUser } }) }))
const complete = completeImplicitEmailLink as jest.Mock

describe('email confirmation and password recovery UI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState(null, '', '/')
  })
  it('does not show password fields to an ordinary logged-in visitor', async () => {
    complete.mockResolvedValue('invalid')
    render(<ResetPasswordForm recoveryAuthorized={false} />)
    await screen.findByText(/yalnızca geçerli bir şifre sıfırlama bağlantısı/)
    expect(screen.queryByLabelText('Yeni şifre')).not.toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })
  it('redirects an old signup link away from the password form', async () => {
    window.history.replaceState(null, '', '/sifre-yenile#type=signup&access_token=a&refresh_token=b')
    complete.mockResolvedValue('confirmed')
    render(<ResetPasswordForm recoveryAuthorized={false} />)
    await waitFor(() => expect(useRouter().replace).toHaveBeenCalledWith('/auth/dogrulama'))
    expect(screen.queryByLabelText('Yeni şifre')).not.toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })
  it('opens the form after a verified recovery link', async () => {
    complete.mockResolvedValue('recovery')
    render(<ResetPasswordForm recoveryAuthorized={false} />)
    expect(await screen.findByLabelText('Yeni şifre')).toBeInTheDocument()
  })
  it('keeps the verified recovery permission on a reload', () => {
    render(<ResetPasswordForm recoveryAuthorized />)
    expect(screen.getByLabelText('Yeni şifre')).toBeInTheDocument()
    expect(complete).not.toHaveBeenCalled()
  })
  it('shows confirmation without a password form', () => {
    render(<AuthConfirmation confirmed />)
    expect(screen.getByText('E-posta adresiniz doğrulandı')).toBeInTheDocument()
    expect(screen.queryByLabelText('Yeni şifre')).not.toBeInTheDocument()
  })
  it('shows an expired-link error rather than confirmation', async () => {
    render(<AuthConfirmation confirmed={false} />)
    expect(await screen.findByText('Doğrulama bağlantısı geçersiz')).toBeInTheDocument()
  })
})
