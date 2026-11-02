import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api', () => {
  class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    ApiError,
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  }
})

import { ApiError, forgotPassword, resetPassword, verifyEmail } from '../../lib/api'
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './RecoverPage'

const forgot = vi.mocked(forgotPassword)
const reset = vi.mocked(resetPassword)
const verify = vi.mocked(verifyEmail)

function renderAt(url: string, page: React.ReactElement) {
  window.history.replaceState(null, '', url)
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('ForgotPasswordPage', () => {
  it('rejects a malformed email without calling the API', async () => {
    renderAt('/forgot-password', <ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(screen.getByRole('alert').textContent).toMatch(/does not look right/i)
    expect(forgot).not.toHaveBeenCalled()
  })

  it('shows the same neutral confirmation and locks resend for a minute', async () => {
    forgot.mockResolvedValue({ message: 'ok' })
    renderAt('/forgot-password', <ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'maya@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(forgot).toHaveBeenCalledWith('maya@example.com')
    expect(await screen.findByText(/if an account exists for/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: /send again in/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows server errors such as rate limits', async () => {
    forgot.mockRejectedValue(new ApiError('Too many reset requests. Try again in an hour.', 429))
    renderAt('/forgot-password', <ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'maya@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/too many reset requests/i)
  })
})

describe('ResetPasswordPage', () => {
  const fill = async (password: string, confirm: string) => {
    await userEvent.type(screen.getByLabelText('New password'), password)
    await userEvent.type(screen.getByLabelText('Confirm password'), confirm)
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }))
  }

  it('shows the expired state when there is no token', () => {
    renderAt('/reset-password', <ResetPasswordPage />)
    expect(screen.getByText(/that link won't work/i)).toBeTruthy()
  })

  it('removes the token from the address bar', () => {
    renderAt('/reset-password?token=secret', <ResetPasswordPage />)
    expect(window.location.search).toBe('')
  })

  it('enforces length and matching passwords before calling the API', async () => {
    renderAt('/reset-password?token=t', <ResetPasswordPage />)
    await fill('short', 'short')
    expect(screen.getByRole('alert').textContent).toMatch(/at least 8/i)

    cleanup()
    renderAt('/reset-password?token=t', <ResetPasswordPage />)
    await fill('brand-new-pass', 'different-pass')
    expect(screen.getByRole('alert').textContent).toMatch(/do not match/i)
    expect(reset).not.toHaveBeenCalled()
  })

  it('sends the token with the new password and confirms success', async () => {
    reset.mockResolvedValue({ message: 'ok' })
    renderAt('/reset-password?token=good', <ResetPasswordPage />)
    await fill('brand-new-pass', 'brand-new-pass')

    expect(reset).toHaveBeenCalledWith({ token: 'good', password: 'brand-new-pass' })
    expect(await screen.findByText(/password updated/i)).toBeTruthy()
  })

  it('shows the expired state when the server rejects the link', async () => {
    reset.mockRejectedValue(new ApiError('This reset link is invalid or has expired.', 400))
    renderAt('/reset-password?token=stale', <ResetPasswordPage />)
    await fill('brand-new-pass', 'brand-new-pass')

    expect(await screen.findByText(/that link won't work/i)).toBeTruthy()
  })

  it('keeps the form for other failures so the user can retry', async () => {
    reset.mockRejectedValue(new ApiError('Cannot reach the server.', 0))
    renderAt('/reset-password?token=t', <ResetPasswordPage />)
    await fill('brand-new-pass', 'brand-new-pass')

    expect((await screen.findByRole('alert')).textContent).toMatch(/cannot reach the server/i)
    expect(screen.getByRole('button', { name: 'Update password' })).toBeTruthy()
  })
})

describe('VerifyEmailPage', () => {
  it('verifies once and shows success', async () => {
    verify.mockResolvedValue({ message: 'ok' })
    renderAt('/verify-email?token=abc123', <VerifyEmailPage />)

    await waitFor(() => expect(screen.getByText(/your email is confirmed/i)).toBeTruthy())
    expect(verify).toHaveBeenCalledTimes(1)
    expect(verify).toHaveBeenCalledWith('abc123')
    expect(window.location.search).toBe('')
  })

  it('shows the expired state for a bad link', async () => {
    verify.mockRejectedValue(new ApiError('This verification link is invalid or has expired.', 400))
    renderAt('/verify-email?token=old', <VerifyEmailPage />)

    expect(await screen.findByText(/that link won't work/i)).toBeTruthy()
  })

  it('shows the expired state without a token and never calls the API', () => {
    renderAt('/verify-email', <VerifyEmailPage />)
    expect(screen.getByText(/that link won't work/i)).toBeTruthy()
    expect(verify).not.toHaveBeenCalled()
  })
})
