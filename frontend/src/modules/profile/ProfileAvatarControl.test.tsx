import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { avatarService } from '../../services/avatar.service';
import type { AuthUser } from '../../types/auth.types';
import { ProfileAvatarControl } from './ProfileAvatarControl';

const BASE_USER: AuthUser = {
  id: 'u-1',
  name: 'Alice Nguyen',
  username: 'alice',
  email: 'alice@orbit.dev',
  role: 'user',
  workspaceId: 'ws_orbit_core',
  avatarUrl: null,
};

describe('ProfileAvatarControl', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders initials when no avatar exists and uploads valid image', async () => {
    const updatedUser: AuthUser = {
      ...BASE_USER,
      avatarUrl: 'https://cdn.orbit.dev/avatars/u-1/new.png',
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const uploadSpy = vi.spyOn(avatarService, 'uploadAvatar').mockResolvedValue(updatedUser);
    const onUserUpdated = vi.fn();

    render(
      <ProfileAvatarControl
        user={BASE_USER}
        displayName="Alice Nguyen"
        onUserUpdated={onUserUpdated}
      />
    );

    expect(screen.getByText('AN')).toBeTruthy();
    const input = screen.getByLabelText('Upload profile avatar') as HTMLInputElement;
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledWith(file));
    const status = await screen.findByRole('status');
    expect(onUserUpdated).toHaveBeenCalledWith(updatedUser);
    expect(status.textContent).toContain('AWS S3');
  });

  it('shows validation error for unsupported file type without calling upload', () => {
    const uploadSpy = vi.spyOn(avatarService, 'uploadAvatar');

    render(<ProfileAvatarControl user={BASE_USER} displayName="Alice Nguyen" />);

    const input = screen.getByLabelText('Upload profile avatar') as HTMLInputElement;
    const badFile = new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' });
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(uploadSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('JPEG, PNG, WebP, or GIF');
  });

  it('renders avatar image and supports removing it', async () => {
    const userWithAvatar: AuthUser = {
      ...BASE_USER,
      avatarUrl: 'https://cdn.orbit.dev/avatars/u-1/current.png',
    };
    const removeSpy = vi.spyOn(avatarService, 'removeAvatar').mockResolvedValue(BASE_USER);
    const onUserUpdated = vi.fn();

    render(
      <ProfileAvatarControl
        user={userWithAvatar}
        displayName="Alice Nguyen"
        onUserUpdated={onUserUpdated}
      />
    );

    const img = screen.getByAltText('Alice Nguyen avatar') as HTMLImageElement;
    expect(img.src).toBe(userWithAvatar.avatarUrl);

    fireEvent.click(screen.getByLabelText('Remove avatar'));
    await waitFor(() => expect(removeSpy).toHaveBeenCalledTimes(1));
    expect(onUserUpdated).toHaveBeenCalledWith(BASE_USER);
  });
});
