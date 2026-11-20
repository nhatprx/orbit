import { describe, expect, it } from 'vitest';
import { ApiError } from './httpClient';
import { MockLinkedAccountService } from './mockLinkedAccount.service';
import { MockMailService } from './mockMail.service';

const imap = (patch: Record<string, unknown> = {}) => ({
  email: 'me@corp.example', host: 'imap.corp.example', port: 993, username: 'me', password: 'secret', useTls: true, ...patch,
});

async function expectApiError(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
  if (code) expect((error as ApiError).code).toBe(code);
}

describe('MockMailService', () => {
  it('connects an OAuth account and seeds a bounded, newest-first inbox', async () => {
    const mail = new MockMailService();
    const account = await mail.connectOAuthAccount({ provider: 'gmail', email: ' Me@Gmail.com ' });

    expect(account).toMatchObject({ provider: 'gmail', email: 'me@gmail.com', status: 'CONNECTED' });
    const inbox = await mail.listMessages(account.id);
    expect(inbox.length).toBeGreaterThan(0);
    expect(inbox.length).toBeLessThanOrEqual(50);
    const times = inbox.map((m) => m.receivedAt);
    expect([...times].sort().reverse()).toEqual(times);
    expect(inbox.every((m) => m.folder === 'inbox')).toBe(true);
    expect(inbox[0]).not.toHaveProperty('body');
  });

  it('rejects invalid and duplicate accounts', async () => {
    const mail = new MockMailService();
    await expectApiError(mail.connectOAuthAccount({ provider: 'gmail', email: 'not-an-email' }), 400, 'VALIDATION_ERROR');
    await mail.connectOAuthAccount({ provider: 'outlook', email: 'a@x.com' });
    await expectApiError(mail.connectOAuthAccount({ provider: 'outlook', email: 'A@x.com' }), 409);
    await expect(mail.connectOAuthAccount({ provider: 'gmail', email: 'a@x.com' })).resolves.toBeDefined();
  });

  it('validates IMAP settings at their boundaries', async () => {
    const mail = new MockMailService();
    await expectApiError(mail.connectImapAccount(imap({ host: '  ' })), 400);
    await expectApiError(mail.connectImapAccount(imap({ port: 0 })), 400);
    await expectApiError(mail.connectImapAccount(imap({ port: 65536 })), 400);
    await expectApiError(mail.connectImapAccount(imap({ port: 1.5 })), 400);
    await expectApiError(mail.connectImapAccount(imap({ password: '' })), 400);
    await expectApiError(mail.connectImapAccount(imap({ host: 'error.example.com' })), 502, 'MAIL_CONNECTION_FAILED');
    await expect(mail.connectImapAccount(imap({ port: 65535 }))).resolves.toMatchObject({ provider: 'imap' });
  });

  it('never exposes IMAP credentials on the account', async () => {
    const mail = new MockMailService();
    const account = await mail.connectImapAccount(imap());
    expect(JSON.stringify(account)).not.toContain('secret');
    expect(JSON.stringify(await mail.listAccounts())).not.toContain('secret');
  });

  it('disconnecting removes the account and its cached messages (BR-12)', async () => {
    const mail = new MockMailService();
    const account = await mail.connectOAuthAccount({ provider: 'gmail', email: 'a@x.com' });
    const [first] = await mail.listMessages(account.id);

    await mail.disconnectAccount(account.id);

    expect(await mail.listAccounts()).toEqual([]);
    await expectApiError(mail.listMessages(account.id), 404);
    await expectApiError(mail.getMessage(account.id, first!.id), 404);
    await expectApiError(mail.disconnectAccount(account.id), 404);
  });

  it('keeps accounts isolated from each other', async () => {
    const mail = new MockMailService();
    const a = await mail.connectOAuthAccount({ provider: 'gmail', email: 'a@x.com' });
    const b = await mail.connectOAuthAccount({ provider: 'gmail', email: 'b@x.com' });
    const [fromA] = await mail.listMessages(a.id);
    await expectApiError(mail.getMessage(b.id, fromA!.id), 404);
  });

  it('sends into the Sent folder and validates the draft', async () => {
    const mail = new MockMailService();
    const account = await mail.connectOAuthAccount({ provider: 'gmail', email: 'me@x.com' });
    const draft = { accountId: account.id, toEmail: 'you@x.com', subject: 'Hello', body: 'Body text' };

    const sent = await mail.sendMessage(draft);

    expect(sent).toMatchObject({ folder: 'sent', recipientEmail: 'you@x.com', read: true });
    expect((await mail.listMessages(account.id, 'sent'))[0]?.id).toBe(sent.id);
    expect((await mail.getMessage(account.id, sent.id)).body).toBe('Body text');
    await expectApiError(mail.sendMessage({ ...draft, toEmail: 'bad' }), 400);
    await expectApiError(mail.sendMessage({ ...draft, subject: '  ' }), 400);
    await expectApiError(mail.sendMessage({ ...draft, body: 'x'.repeat(20_001) }), 400);
    await expectApiError(mail.sendMessage({ ...draft, accountId: 'ghost' }), 404);
  });

  it('marks messages read and unread', async () => {
    const mail = new MockMailService();
    const account = await mail.connectOAuthAccount({ provider: 'gmail', email: 'me@x.com' });
    const unread = (await mail.listMessages(account.id)).find((m) => !m.read)!;

    await mail.markRead(account.id, unread.id, true);
    expect((await mail.listMessages(account.id)).find((m) => m.id === unread.id)?.read).toBe(true);
    await mail.markRead(account.id, unread.id, false);
    expect((await mail.listMessages(account.id)).find((m) => m.id === unread.id)?.read).toBe(false);
  });
});

describe('MockLinkedAccountService', () => {
  it('links, lists and unlinks a provider', async () => {
    const service = new MockLinkedAccountService(() => 'Nhat.Prx');
    const linked = await service.connectProvider('github');

    expect(linked).toMatchObject({ provider: 'github', providerEmail: 'nhat.prx@users.noreply.github.com' });
    expect(await service.listLinkedAccounts()).toHaveLength(1);

    await service.disconnectAccount(linked.id);
    expect(await service.listLinkedAccounts()).toEqual([]);
  });

  it('rejects a second link for the same provider and unknown unlinks', async () => {
    const service = new MockLinkedAccountService(() => 'dev');
    await service.connectProvider('google');
    await expectApiError(service.connectProvider('google'), 409);
    await expect(service.connectProvider('github')).resolves.toBeDefined();
    await expectApiError(service.disconnectAccount('ghost'), 404);
  });

  it('sanitizes unusual handles for the simulated identity', async () => {
    const service = new MockLinkedAccountService(() => '!!!');
    expect((await service.connectProvider('google')).providerEmail).toBe('user@gmail.com');
  });
});
