import { describe, expect, it } from 'vitest';
import type { PageResponse, ProjectDto } from '../types/workspace.types';
import { page, project, setup, workspace } from './controllerTestKit';
import { selectActiveProject, selectActiveWorkspace } from './workspaceStore';

describe('bootstrap', () => {
  it('opens the remembered workspace and loads its projects', async () => {
    const { store, memory, controller } = setup({
      workspaces: [workspace('a'), workspace('b')],
      projects: { b: [project('p1', 'b')] },
    });
    memory.set('orbit_last_workspace:u1', 'b');

    await controller.bootstrap('u1');

    expect(selectActiveWorkspace(store.getState())?.id).toBe('b');
    expect(store.getState().projects.map((p) => p.id)).toEqual(['p1']);
    expect(store.getState().status).toBe('ready');
  });

  it('falls back to the first workspace and lets a just-joined one win', async () => {
    const { store, controller } = setup({ workspaces: [workspace('a'), workspace('b')] });
    await controller.bootstrap('u1');
    expect(store.getState().activeWorkspaceId).toBe('a');

    await controller.bootstrap('u1', 'b');
    expect(store.getState().activeWorkspaceId).toBe('b');
  });

  it('ends ready with no selection when the user has no workspace', async () => {
    const { store, controller } = setup({ workspaces: [] });
    await controller.bootstrap('u1');
    expect(store.getState()).toMatchObject({ status: 'ready', activeWorkspaceId: null, workspaces: [] });
  });

  it('reports a load failure instead of throwing', async () => {
    const { store, controller } = setup({
      workspaceService: { listWorkspaces: async () => { throw new Error('server down'); } },
    });
    await controller.bootstrap('u1');
    expect(store.getState()).toMatchObject({ status: 'error', error: 'server down' });
  });

  it('survives unusable browser storage', async () => {
    const broken = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    };
    const { store, controller } = setup({ workspaces: [workspace('a')], storage: broken as unknown as Storage });
    await controller.bootstrap('u1');
    expect(store.getState().activeWorkspaceId).toBe('a');
  });
});

describe('switching', () => {
  it('remembers the choice, clears the project and reloads projects', async () => {
    const { store, memory, controller } = setup({
      workspaces: [workspace('a'), workspace('b')],
      projects: { a: [project('p1', 'a')], b: [project('p2', 'b')] },
    });
    await controller.bootstrap('u1');
    controller.selectProject('p1');
    expect(selectActiveProject(store.getState())?.id).toBe('p1');

    await controller.selectWorkspace('b');

    expect(store.getState().activeProjectId).toBeNull();
    expect(store.getState().projects.map((p) => p.id)).toEqual(['p2']);
    expect(memory.get('orbit_last_workspace:u1')).toBe('b');
  });

  it('ignores unknown workspaces and unknown projects', async () => {
    const { store, controller } = setup({ workspaces: [workspace('a')], projects: { a: [project('p1', 'a')] } });
    await controller.bootstrap('u1');
    await controller.selectWorkspace('ghost');
    controller.selectProject('ghost');
    expect(store.getState().activeWorkspaceId).toBe('a');
    expect(store.getState().activeProjectId).toBeNull();
  });

  it('discards a slow response for a workspace the user already left', async () => {
    let releaseA: (value: PageResponse<ProjectDto>) => void = () => undefined;
    const slowA = new Promise<PageResponse<ProjectDto>>((resolve) => { releaseA = resolve; });
    const { store, controller } = setup({
      workspaces: [workspace('a'), workspace('b')],
      projectService: {
        listProjects: (id) => (id === 'a' ? slowA : Promise.resolve(page([project('pb', 'b')]))),
      },
    });
    store.setState({ userId: 'u1', workspaces: [workspace('a'), workspace('b')] });

    const pendingA = controller.selectWorkspace('a');
    await controller.selectWorkspace('b');
    releaseA(page([project('stale', 'a')]));
    await pendingA;

    expect(store.getState().activeWorkspaceId).toBe('b');
    expect(store.getState().projects.map((p) => p.id)).toEqual(['pb']);
  });
});
